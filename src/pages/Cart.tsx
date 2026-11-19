/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, CreditCard, AlertTriangle, ShieldAlert, MapPin, Truck, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import DeliveryPointPicker from "@/components/DeliveryPointPicker";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useStock } from "@/contexts/StockContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatSlotDate,
  formatSlotTime,
  parsePickupHours,
  pickupSlots,
  type PickupWindow,
} from "@/lib/pickup-hours";
import { computeDeliveryFee } from "@/lib/delivery-fee";
import {
  earliestDelivery,
  farmerDelivers,
  FULFILLMENT_LABELS,
  fulfillmentOptions,
  isWithinDeliveryRadius,
  preparationDays,
  type DeliveryMode,
  type Fulfillment,
} from "@/lib/fulfillment";
import type { LatLng } from "@/lib/geo";
import { CalendarClock } from "lucide-react";
import { scopedStorage, STORAGE_KEYS } from "@/lib/consent";
import { formatEuro } from "@/lib/format";
import { Trans, useTranslation } from "react-i18next";
import TranslatedText from "@/components/TranslatedText";

/** Campos de entrega de cada produto do carrinho, lidos da base de dados. */
interface CartProduct {
  id: string;
  delivery_mode: DeliveryMode;
  delivery_tracking: boolean;
  delivery_fee: number | null;
  shipping_days: number | null;
}

const Cart = () => {
  const { items, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const { getAvailable, refreshStock, consume } = useStock();
  const { user, profile, activeMode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(["cart", "common", "catalog"]);
  const [paying, setPaying] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [pickupWindows, setPickupWindows] = useState<PickupWindow[]>([]);
  const [pickupNote, setPickupNote] = useState<string>("");
  const [deliveryWindows, setDeliveryWindows] = useState<PickupWindow[]>([]);
  const [deliveryNote, setDeliveryNote] = useState<string>("");
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState<number | null>(null);
  const [farmPoint, setFarmPoint] = useState<LatLng | null>(null);
  const [farmerLoaded, setFarmerLoaded] = useState(false);
  const [slot, setSlot] = useState<string>("");
  const [cartProducts, setCartProducts] = useState<CartProduct[] | null>(null);
  // Escolha do cliente; começa pela preferência indicada na página do artigo.
  const [chosenFulfillment, setChosenFulfillment] = useState<Fulfillment | null>(() =>
    scopedStorage.get<Fulfillment>(STORAGE_KEYS.fulfillment),
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPoint, setDeliveryPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [withTracking, setWithTracking] = useState(false);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | null>(null);

  // Formas de entrega de cada produto, para mostrar as opções certas antes de pagar.
  const itemIdsKey = useMemo(() => [...new Set(items.map((i) => i.id))].sort().join(","), [items]);
  useEffect(() => {
    const ids = itemIdsKey ? itemIdsKey.split(",") : [];
    if (ids.length === 0) {
      setCartProducts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, delivery_mode, delivery_tracking, delivery_fee, shipping_days")
        .eq("active", true)
        .in("id", ids);
      if (cancelled) return;
      setCartProducts(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [itemIdsKey]);


  // Clamp cart lines that exceed the current available stock (e.g. stock reduced
  // in another tab, or the cart was restored from localStorage on a cold load
  // before any product listing warmed the stock cache). Also drops lines that
  // went to zero.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fresh = await refreshStock(items.map((i) => i.id));
      if (cancelled) return;
      for (const item of items) {
        const available = fresh[item.id] ?? 0;
        if (available <= 0) {
          removeItem(item.id);
        } else if (item.quantity > available) {
          updateQuantity(item.id, available);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group items by farmer for clearer display
  const grouped = useMemo(() => {
    const map = new Map<string, { farmer: string; farmerId: string; items: typeof items }>();
    for (const item of items) {
      const key = item.farmerId;
      if (!map.has(key)) {
        map.set(key, { farmer: item.farmer, farmerId: item.farmerId, items: [] });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [items]);


  const farmerId = grouped.length === 1 ? grouped[0].farmerId : null;

  // Horários de porta aberta e de entregas, raio e localização da quinta: o
  // cliente só pode agendar dentro de horários reais do agricultor.
  useEffect(() => {
    setFarmerLoaded(false);
    if (!farmerId) {
      setPickupWindows([]);
      setPickupNote("");
      setDeliveryWindows([]);
      setDeliveryNote("");
      setDeliveryRadiusKm(null);
      setFarmPoint(null);
      setSlot("");
      setFreeDeliveryThreshold(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("public_farmer_profiles")
        .select(
          "pickup_hours, pickup_hours_note, free_delivery_threshold, delivery_hours, delivery_note, delivery_radius_km, pickup_lat, pickup_lng",
        )
        .eq("id", farmerId)
        .maybeSingle();
      if (cancelled) return;
      setPickupWindows(parsePickupHours(data?.pickup_hours));
      setPickupNote(data?.pickup_hours_note ?? "");
      setDeliveryWindows(parsePickupHours(data?.delivery_hours));
      setDeliveryNote(data?.delivery_note ?? "");
      setDeliveryRadiusKm(data?.delivery_radius_km != null ? Number(data.delivery_radius_km) : null);
      setFarmPoint(
        data?.pickup_lat != null && data?.pickup_lng != null
          ? { lat: Number(data.pickup_lat), lng: Number(data.pickup_lng) }
          : null,
      );
      setFreeDeliveryThreshold(data?.free_delivery_threshold ?? null);
      setSlot("");
      setFarmerLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [farmerId]);

  // Levantar ou receber em casa: só as opções comuns a todos os produtos.
  const delivers = farmerDelivers(deliveryRadiusKm, farmPoint);
  const options = useMemo(
    () => (cartProducts ? fulfillmentOptions(cartProducts.map((p) => p.delivery_mode), { delivers }) : []),
    [cartProducts, delivers],
  );
  const fulfillment: Fulfillment | null =
    chosenFulfillment && options.includes(chosenFulfillment) ? chosenFulfillment : options[0] ?? null;
  const isDelivery = fulfillment === "delivery";
  const noCommonOption = grouped.length === 1 && cartProducts !== null && farmerLoaded && options.length === 0;
  const chooseFulfillment = (value: Fulfillment) => {
    setChosenFulfillment(value);
    scopedStorage.set(STORAGE_KEYS.fulfillment, value);
  };

  // Valor indicativo: o preço cobrado é calculado de novo no create-order.
  const deliveryFee = useMemo(
    () => (isDelivery ? computeDeliveryFee(cartProducts ?? [], totalPrice, freeDeliveryThreshold) : null),
    [isDelivery, cartProducts, totalPrice, freeDeliveryThreshold],
  );
  const orderTotal = totalPrice + (deliveryFee?.fee ?? 0);
  const trackingAvailable = isDelivery && (cartProducts ?? []).some((p) => p.delivery_tracking);
  const outOfRadius =
    isDelivery &&
    deliveryPoint != null &&
    farmPoint != null &&
    deliveryRadiusKm != null &&
    !isWithinDeliveryRadius(farmPoint, deliveryPoint, deliveryRadiusKm);

  // Entrega: horário de entregas, a partir do prazo de preparação dos produtos.
  const prepDays = useMemo(() => preparationDays(cartProducts ?? []), [cartProducts]);
  const activeWindows = isDelivery ? deliveryWindows : pickupWindows;
  const slots = useMemo(
    () => pickupSlots(activeWindows, { earliest: isDelivery ? earliestDelivery(prepDays) : undefined }),
    [activeWindows, isDelivery, prepDays],
  );
  const needsSchedule = activeWindows.length > 0;

  // Ao trocar entre levantamento e entrega, o horário escolhido pode deixar de valer.
  useEffect(() => {
    if (slot && !slots.some((d) => d.toISOString() === slot)) setSlot("");
  }, [slots, slot]);

  // Pre-fill with the slot the client already picked on the product page.
  useEffect(() => {
    if (slot || slots.length === 0) return;
    const stored = scopedStorage.get<string>(STORAGE_KEYS.pickupSlot);
    if (stored && slots.some((d) => d.toISOString() === stored)) setSlot(stored);
  }, [slots, slot]);

  const onCheckoutClick = () => {
    if (!user) {
      toast({ title: t("toast.login"), description: t("toast.loginText") });
      navigate("/auth");
      return;
    }
    if (activeMode === "vendedor") {
      toast({
        title: t("toast.farmerMode"),
        description: t("toast.farmerModeText"),
        variant: "destructive",
      });
      return;
    }
    if (!fulfillment) {
      toast({
        title: t("toast.noCommon"),
        description: t("toast.noCommonText"),
        variant: "destructive",
      });
      return;
    }
    if (needsSchedule && !slot) {
      toast({
        title: isDelivery ? t("toast.chooseDelivery") : t("toast.choosePickup"),
        description: isDelivery ? t("toast.chooseDeliveryText") : t("toast.choosePickupText"),
        variant: "destructive",
      });
      return;
    }
    if (isDelivery) {
      if (deliveryAddress.trim().length < 5) {
        toast({
          title: t("toast.noAddress"),
          description: t("toast.noAddressText"),
          variant: "destructive",
        });
        return;
      }
      if (!deliveryPoint) {
        toast({
          title: t("toast.noPoint"),
          description: t("toast.noPointText"),
          variant: "destructive",
        });
        return;
      }
      if (outOfRadius) {
        toast({
          title: t("toast.outOfRadius"),
          description: t("toast.outOfRadiusText", { km: deliveryRadiusKm }),
          variant: "destructive",
        });
        return;
      }
      // O aviso de segurança é sobre deslocações à quinta: na entrega não se aplica.
      handleCheckout();
      return;
    }

    setSafetyOpen(true);
  };


  const handleCheckout = async () => {
    setSafetyOpen(false);
    setPaying(true);
    try {
      // Validate the cart against the live catalogue before paying. A cart is
      // persisted in localStorage, so it can outlive the products it holds
      // (product deleted/deactivated, or the dev DB reseeded with new UUIDs).
      // Any such line makes the whole order fail server-side with "Produto
      // desconhecido". Detect and drop those lines here so the user gets a
      // clear message and a self-healing cart instead of a dead-end 400.
      const ids = [...new Set(items.map((i) => i.id))];
      const { data: valid, error: checkErr } = await supabase
        .from("products")
        .select("id, stock_quantity, delivery_mode, delivery_tracking, delivery_fee, shipping_days")
        .eq("active", true)
        .in("id", ids);
      if (checkErr) {
        toast({ title: t("toast.payFailed"), description: t("toast.validateFailed"), variant: "destructive" });
        return;
      }
      const fresh = valid ?? [];
      setCartProducts(fresh);
      const availableById = new Map(fresh.map((p) => [p.id, p.stock_quantity ?? 0]));
      const unavailable = items.filter((i) => !availableById.has(i.id));
      const overStock = items.filter((i) => {
        const avail = availableById.get(i.id);
        return avail !== undefined && i.quantity > avail;
      });
      if (unavailable.length > 0 || overStock.length > 0) {
        for (const i of unavailable) removeItem(i.id);
        for (const i of overStock) updateQuantity(i.id, availableById.get(i.id)!);
        const names = [...unavailable, ...overStock].map((i) => i.name).join(", ");
        toast({
          title: t("toast.updated"),
          description: unavailable.length > 0 ? t("toast.removed", { names }) : t("toast.adjusted", { names }),
          variant: "destructive",
        });
        return;
      }
      // As formas de entrega podem ter mudado desde que o carrinho foi aberto.
      const freshOptions = fulfillmentOptions(fresh.map((p) => p.delivery_mode), { delivers });
      if (!fulfillment || !freshOptions.includes(fulfillment)) {
        toast({
          title: t("toast.optionsChanged"),
          description: t("toast.optionsChangedText"),
          variant: "destructive",
        });
        return;
      }

      const payload = {
        items: items.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
        })),
        fulfillment,
        scheduled_pickup_at: slot || null,
        delivery_address: isDelivery ? deliveryAddress.trim() : null,
        delivery_lat: isDelivery ? deliveryPoint?.lat ?? null : null,
        delivery_lng: isDelivery ? deliveryPoint?.lng ?? null : null,
        delivery_tracking: isDelivery && fresh.some((p) => p.delivery_tracking) && withTracking,
      };

      const { data, error } = await supabase.functions.invoke("create-order", { body: payload });
      if (error || (data as any)?.error) {
        // On a non-2xx response supabase-js leaves `data` null and gives a
        // FunctionsHttpError whose `.message` is a generic "non-2xx status
        // code". The real reason is the JSON body ({ error: "..." }), which
        // lives on error.context (the raw Response) — read it so the user
        // sees the actual validation message instead of a useless generic one.
        // The body is a one-shot stream: read it exactly once here and reuse
        // the result, otherwise a second .json()/.clone() throws and the real
        // message is lost.
        let msg = (data as any)?.error ?? error?.message ?? t("toast.payError");
        if (error instanceof FunctionsHttpError) {
          try {
            const body = await error.context.json();
            console.log("Function returned an error", body);
            if (body?.error) msg = body.error;
          } catch {
            // body wasn't JSON — keep the generic message
          }
        }
        toast({ title: t("toast.payFailed"), description: msg, variant: "destructive" });
        return;
      }
      // Decrement stock for each purchased line so it reflects everywhere
      consume(items.map((i) => ({ id: i.id, quantity: i.quantity })));
      clearCart();
      toast({
        title: t("toast.paid"),
        description: isDelivery ? t("toast.paidDelivery") : t("toast.paidPickup"),
      });
      navigate("/encomendas");
    } finally {
      setPaying(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="py-16">
        <div className="container max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t("empty.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("empty.text")}
          </p>
          <Link to="/catalogo" className="mt-6 inline-block">
            <Button>{t("empty.button")}</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="py-8">
      <div className="container max-w-5xl">
        <Link
          to="/catalogo"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("continue")}
        </Link>

        <PageHeader title={t("title")} />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Items grouped by farmer */}
          <div className="space-y-6">
            {grouped.map((group) => (
              <div
                key={group.farmerId}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="border-b border-border bg-muted/30 px-5 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("producer")}
                  </p>
                  <Link
                    to={`/agricultor/${group.farmerId}`}
                    className="font-display font-semibold text-foreground hover:text-primary"
                  >
                    {group.farmer}
                  </Link>
                </div>
                <ul className="divide-y divide-border">
                  {group.items.map((item) => {
                    const available = getAvailable(item.id);
                    const canIncrease = item.quantity < available;
                    return (
                    <li key={item.id} className="flex gap-4 p-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-20 w-20 shrink-0 rounded-lg object-cover"
                      />
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground">
                              <TranslatedText type="product" id={item.id} field="name" text={item.name} />
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {formatEuro(item.price)} / {item.unit}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {t("catalog:product.inStock", { count: available })}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label={t("common:actions.remove")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="flex items-center gap-1 rounded-lg border border-border">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-2 text-muted-foreground hover:text-foreground"
                              aria-label={t("decrease")}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-medium text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => canIncrease && updateQuantity(item.id, item.quantity + 1)}
                              disabled={!canIncrease}
                              className="p-2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={t("increase")}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="font-mono tabular-nums font-bold text-primary">
                            {formatEuro(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <button
              onClick={clearCart}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              {t("clear")}
            </button>
          </div>

          {/* Summary */}
          <aside className="h-fit rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t("summary")}
            </h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("subtotal")}</span>
                <span>{formatEuro(totalPrice)}</span>
              </div>
              {deliveryFee ? (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("homeDelivery")}</span>
                    <span>{deliveryFee.fee > 0 ? `${formatEuro(deliveryFee.fee)}` : t("free")}</span>
                  </div>
                  {deliveryFee.remainingForFree != null && (
                    <p className="text-[11px] text-primary">
                      {t("remainingForFree", { amount: formatEuro(deliveryFee.remainingForFree) })}
                    </p>
                  )}
                </>
              ) : fulfillment === "pickup" ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("pickup")}</span>
                  <span>{t("pickupQr")}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex justify-between border-t border-border pt-4">
              <span className="font-semibold text-foreground">{t("total")}</span>
              <span className="font-mono tabular-nums text-xl font-bold text-primary">
                {formatEuro(orderTotal)}
              </span>
            </div>

            {grouped.length > 1 ? (
              <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                {t("multiFarmer")}
              </p>
            ) : noCommonOption ? (
              <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-foreground">
                {t("noCommonOption")}
              </p>
            ) : (
              <>
                {/* Levantar ou receber em casa, quando os produtos permitem as duas. */}
                {options.length > 1 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">{t("howReceive")}</p>
                    <RadioGroup
                      value={fulfillment ?? undefined}
                      onValueChange={(v) => chooseFulfillment(v as Fulfillment)}
                      className="grid grid-cols-2 gap-2"
                    >
                      {options.map((o) => (
                        <label
                          key={o}
                          htmlFor={`fulfillment-${o}`}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                            fulfillment === o ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"
                          }`}
                        >
                          <RadioGroupItem value={o} id={`fulfillment-${o}`} className="sr-only" />
                          {o === "delivery" ? (
                            <Truck className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <Store className="h-4 w-4 shrink-0 text-primary" />
                          )}
                          <span className="font-medium text-foreground">{FULFILLMENT_LABELS[o]}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Agendamento: porta aberta (levantamento) ou horário de entregas. */}
                {fulfillment && (needsSchedule ? (
                  <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      {isDelivery ? t("scheduleDelivery") : t("schedulePickup")}
                    </div>
                    <Select value={slot} onValueChange={setSlot}>
                      <SelectTrigger aria-label={isDelivery ? t("deliveryTime") : t("pickupTime")}>
                        <SelectValue placeholder={t("chooseDateTime")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {slots.map((d) => (
                          <SelectItem key={d.toISOString()} value={d.toISOString()}>
                            {formatSlotDate(d)} · {formatSlotTime(d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {isDelivery
                        ? prepDays > 0
                          ? t("slotsDeliveryPrep", { count: prepDays })
                          : t("slotsDelivery")
                        : t("slotsPickup")}
                      {(isDelivery ? deliveryNote : pickupNote) && farmerId && (
                        <>
                          {" "}
                          <TranslatedText
                            type="farm"
                            id={farmerId}
                            field={isDelivery ? "delivery_note" : "pickup_hours_note"}
                            text={isDelivery ? deliveryNote : pickupNote}
                          />
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    {isDelivery
                      ? prepDays > 0
                        ? t("noDeliveryHoursPrep", { count: prepDays })
                        : t("noDeliveryHours")
                      : t("noPickupHours")}
                  </p>
                ))}

                {/* Entrega ao domicílio: morada e ponto exato no mapa, dentro do raio do agricultor. */}
                {isDelivery && (
                  <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Truck className="h-4 w-4 text-primary" />
                      {t("homeDelivery")}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {deliveryRadiusKm != null ? t("handDeliveryRadius", { km: deliveryRadiusKm }) : t("handDelivery")}
                    </p>
                    <Label htmlFor="delivery-address" className="text-xs">{t("address")}</Label>
                    <Input
                      id="delivery-address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder={t("addressPlaceholder")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setMapOpen(true)}
                    >
                      <MapPin className="h-4 w-4" />
                      {deliveryPoint ? t("pointChange") : t("pointMark")}
                    </Button>
                    {deliveryPoint && (
                      <p className="text-[11px] text-muted-foreground">
                        {t("point", { coords: `${deliveryPoint.lat.toFixed(5)}, ${deliveryPoint.lng.toFixed(5)}` })}
                      </p>
                    )}
                    {outOfRadius && (
                      <p className="text-[11px] font-medium text-destructive">
                        {t("outOfRadius", { km: deliveryRadiusKm })}
                      </p>
                    )}
                    {trackingAvailable && (
                      <RadioGroup
                        value={withTracking ? "with" : "without"}
                        onValueChange={(v) => setWithTracking(v === "with")}
                        className="gap-2 pt-2"
                      >
                        <label htmlFor="tracking-with" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-secondary/50">
                          <RadioGroupItem value="with" id="tracking-with" className="mt-0.5" />
                          <div>
                            <div className="text-sm font-medium">{t("withTracking")}</div>
                            <p className="text-[11px] text-muted-foreground">
                              {t("withTrackingText")}
                            </p>
                          </div>
                        </label>
                        <label htmlFor="tracking-without" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-secondary/50">
                          <RadioGroupItem value="without" id="tracking-without" className="mt-0.5" />
                          <div className="text-sm font-medium">{t("withoutTracking")}</div>
                        </label>
                      </RadioGroup>
                    )}
                  </div>
                )}
              </>
            )}

            {fulfillment === "pickup" && (
              <div className="mt-4 flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                <p>
                  <Trans t={t} i18nKey="pickupWarning" components={{ b: <strong /> }} />
                </p>
              </div>
            )}
            <Button
              onClick={onCheckoutClick}
              disabled={paying || noCommonOption}
              className="mt-6 w-full gap-2"
              size="lg"
            >
              <CreditCard className="h-4 w-4" />
              {paying ? t("processing") : t("pay")}
            </Button>
          </aside>
        </div>
      </div>

      <AlertDialog open={safetyOpen} onOpenChange={setSafetyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-warning" />
              {t("safety.title")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  <Trans t={t} i18nKey="safety.p1" components={{ b: <strong /> }} />
                </p>
                <p>{t("safety.p2")}</p>
                {slot && (
                  <p className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-2.5 font-medium text-foreground">
                    <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                    {t("safety.scheduled", { date: formatSlotDate(new Date(slot)), time: formatSlotTime(new Date(slot)) })}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  <Trans t={t} i18nKey="safety.p3" components={{ b: <strong /> }} />
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCheckout}>
              {t("safety.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeliveryPointPicker
        open={mapOpen}
        onOpenChange={setMapOpen}
        value={deliveryPoint}
        onConfirm={setDeliveryPoint}
      />
    </main>
  );
};

export default Cart;

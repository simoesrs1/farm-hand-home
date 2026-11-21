/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, CreditCard, AlertTriangle, ShieldAlert, CalendarClock, Users } from "lucide-react";
import DeliveryPointPicker from "@/components/DeliveryPointPicker";
import PageHeader from "@/components/PageHeader";
import CartFarmerGroup from "@/components/CartFarmerGroup";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useStock } from "@/contexts/StockContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { formatSlotDate, formatSlotTime } from "@/lib/pickup-hours";
import { farmerDelivers, fulfillmentOptions, type Fulfillment } from "@/lib/fulfillment";
import {
  deriveGroup,
  emptyChoice,
  groupProblem,
  parseFarmerSettings,
  type CartProduct,
  type FarmerSettings,
  type GroupChoice,
  type GroupProblem,
} from "@/lib/cart-groups";
import { scopedStorage, STORAGE_KEYS } from "@/lib/consent";
import { formatEuro } from "@/lib/format";
import { Trans, useTranslation } from "react-i18next";

/** Agricultor sem perfil público (ex.: em pausa): sem horários nem entregas. */
const EMPTY_SETTINGS: FarmerSettings = {
  pickupWindows: [],
  pickupNote: "",
  deliveryWindows: [],
  deliveryNote: "",
  radiusKm: null,
  farmPoint: null,
  freeThreshold: null,
};

/** Título e texto do aviso para o que falta preencher numa encomenda. */
const PROBLEM_TOAST = {
  noCommon: { title: "toast.noCommon", text: "toast.noCommonText" },
  chooseDelivery: { title: "toast.chooseDelivery", text: "toast.chooseDeliveryText" },
  choosePickup: { title: "toast.choosePickup", text: "toast.choosePickupText" },
  noAddress: { title: "toast.noAddress", text: "toast.noAddressText" },
  noPoint: { title: "toast.noPoint", text: "toast.noPointText" },
  outOfRadius: { title: "toast.outOfRadius", text: "toast.outOfRadiusText" },
} as const satisfies Record<Exclude<GroupProblem, "loading">, { title: string; text: string }>;

const Cart = () => {
  const { items, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const { refreshStock, consume } = useStock();
  const { user, activeMode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(["cart", "common", "catalog"]);
  const [paying, setPaying] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [cartProducts, setCartProducts] = useState<CartProduct[] | null>(null);
  const [farmerSettings, setFarmerSettings] = useState<Record<string, FarmerSettings>>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  // Escolhas por agricultor: forma de entrega, horário, morada e ponto.
  const [choices, setChoices] = useState<Record<string, GroupChoice>>({});
  // Ponto de partida de um agricultor novo no carrinho: o que o cliente
  // escolheu na página do produto (forma de entrega e horário).
  const [defaultChoice] = useState<GroupChoice>(() =>
    emptyChoice(
      scopedStorage.get<Fulfillment>(STORAGE_KEYS.fulfillment),
      scopedStorage.get<string>(STORAGE_KEYS.pickupSlot) ?? "",
    ),
  );
  const [mapFarmerId, setMapFarmerId] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // Artigos agrupados por agricultor: cada grupo dá uma encomenda.
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
  const multiFarmer = grouped.length > 1;

  // Horários de porta aberta e de entregas, raio e localização de cada quinta:
  // o cliente só pode agendar dentro de horários reais do agricultor.
  const farmerIdsKey = useMemo(() => grouped.map((g) => g.farmerId).sort().join(","), [grouped]);
  useEffect(() => {
    const ids = farmerIdsKey ? farmerIdsKey.split(",") : [];
    setSettingsLoaded(false);
    if (ids.length === 0) {
      setFarmerSettings({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("public_farmer_profiles")
        .select(
          "id, pickup_hours, pickup_hours_note, free_delivery_threshold, delivery_hours, delivery_note, delivery_radius_km, pickup_lat, pickup_lng",
        )
        .in("id", ids);
      if (cancelled) return;
      const next: Record<string, FarmerSettings> = {};
      for (const row of data ?? []) if (row.id) next[row.id] = parseFarmerSettings(row);
      setFarmerSettings(next);
      setSettingsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [farmerIdsKey]);

  // Estado de cada agricultor: opções, horários, preço da entrega e o que falta.
  const groups = useMemo(
    () =>
      grouped.map((g) => {
        const ids = new Set(g.items.map((i) => i.id));
        const products = cartProducts ? cartProducts.filter((p) => ids.has(p.id)) : null;
        const settings = farmerSettings[g.farmerId] ?? (settingsLoaded ? EMPTY_SETTINGS : null);
        const choice = choices[g.farmerId] ?? defaultChoice;
        const productsTotal = g.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
        const state = deriveGroup(products, settings, choice, productsTotal);
        return { ...g, settings: settings ?? undefined, choice, state, problem: groupProblem(state, choice) };
      }),
    [grouped, cartProducts, farmerSettings, settingsLoaded, choices, defaultChoice],
  );
  const allReady = groups.every((g) => g.state.ready);
  const orderTotal = groups.reduce((acc, g) => acc + g.state.total, 0);
  const pickupGroups = groups.filter((g) => g.state.fulfillment === "pickup");
  const blocked = groups.some((g) => g.state.noCommonOption);

  const updateChoice = (farmerId: string, patch: Partial<GroupChoice>) => {
    if (patch.fulfillment) scopedStorage.set(STORAGE_KEYS.fulfillment, patch.fulfillment);
    if (highlighted === farmerId) setHighlighted(null);
    setChoices((prev) => {
      const next = { ...prev, [farmerId]: { ...(prev[farmerId] ?? defaultChoice), ...patch } };
      // A morada e o ponto costumam ser os mesmos: preenchem os outros
      // agricultores que ainda não os têm.
      for (const g of grouped) {
        if (g.farmerId === farmerId) continue;
        const other = next[g.farmerId] ?? defaultChoice;
        const fill: Partial<GroupChoice> = {};
        if (patch.address !== undefined && other.address === "") fill.address = patch.address;
        if (patch.point !== undefined && other.point === null) fill.point = patch.point;
        if (Object.keys(fill).length > 0) next[g.farmerId] = { ...other, ...fill };
      }
      return next;
    });
  };

  const focusGroup = (farmerId: string) => {
    setHighlighted(farmerId);
    groupRefs.current[farmerId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

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
    if (!allReady) return;
    // Cada agricultor tem de ter a forma de entrega completa.
    for (const g of groups) {
      if (!g.problem || g.problem === "loading") continue;
      const msg = PROBLEM_TOAST[g.problem];
      const km = g.settings?.radiusKm;
      focusGroup(g.farmerId);
      toast({
        title: multiFarmer ? t("toast.groupProblem", { farmer: g.farmer }) : t(msg.title),
        description: multiFarmer ? `${t(msg.title)}. ${t(msg.text, { km })}` : t(msg.text, { km }),
        variant: "destructive",
      });
      return;
    }
    // O aviso de segurança é sobre deslocações à quinta: só com levantamentos.
    if (pickupGroups.length > 0) setSafetyOpen(true);
    else handleCheckout();
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
      for (const g of groups) {
        const ids = new Set(g.items.map((i) => i.id));
        const delivers = farmerDelivers(g.settings?.radiusKm, g.settings?.farmPoint);
        const freshOptions = fulfillmentOptions(
          fresh.filter((p) => ids.has(p.id)).map((p) => p.delivery_mode),
          { delivers },
        );
        if (!g.state.fulfillment || !freshOptions.includes(g.state.fulfillment)) {
          focusGroup(g.farmerId);
          toast({
            title: t("toast.optionsChanged"),
            description: t("toast.optionsChangedText"),
            variant: "destructive",
          });
          return;
        }
      }

      // Uma encomenda por agricultor, todas no mesmo pagamento.
      const payload = {
        groups: groups.map((g) => {
          const isDelivery = g.state.fulfillment === "delivery";
          const ids = new Set(g.items.map((i) => i.id));
          return {
            items: g.items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
            fulfillment: g.state.fulfillment,
            scheduled_pickup_at: g.state.slot || null,
            delivery_address: isDelivery ? g.choice.address.trim() : null,
            delivery_lat: isDelivery ? g.choice.point?.lat ?? null : null,
            delivery_lng: isDelivery ? g.choice.point?.lng ?? null : null,
            delivery_tracking:
              isDelivery && fresh.some((p) => ids.has(p.id) && p.delivery_tracking) && g.choice.tracking,
          };
        }),
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
        let failedFarmer: string | null = (data as any)?.farmer_id ?? null;
        if (error instanceof FunctionsHttpError) {
          try {
            const body = await error.context.json();
            console.log("Function returned an error", body);
            if (body?.error) msg = body.error;
            if (body?.farmer_id) failedFarmer = body.farmer_id;
          } catch {
            // body wasn't JSON — keep the generic message
          }
        }
        // O servidor diz de que agricultor é o erro: assinala esse bloco.
        const failedGroup = multiFarmer ? groups.find((g) => g.farmerId === failedFarmer) : undefined;
        if (failedGroup) focusGroup(failedGroup.farmerId);
        toast({
          title: failedGroup ? t("toast.payFailedFarmer", { farmer: failedGroup.farmer }) : t("toast.payFailed"),
          description: msg,
          variant: "destructive",
        });
        return;
      }
      // Decrement stock for each purchased line so it reflects everywhere
      consume(items.map((i) => ({ id: i.id, quantity: i.quantity })));
      clearCart();
      toast({
        title: t("toast.paid"),
        description: multiFarmer
          ? t("toast.paidMany", { count: groups.length })
          : groups[0]?.state.fulfillment === "delivery"
            ? t("toast.paidDelivery")
            : t("toast.paidPickup"),
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

  const mapGroup = groups.find((g) => g.farmerId === mapFarmerId);

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
          {/* Artigos agrupados por agricultor, cada um com a sua forma de entrega */}
          <div className="space-y-6">
            {multiFarmer && (
              <div
                role="alert"
                className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <Users className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t("multiFarmerWarning", { count: grouped.length })}</p>
              </div>
            )}

            {groups.map((g) => (
              <CartFarmerGroup
                key={g.farmerId}
                ref={(el) => {
                  groupRefs.current[g.farmerId] = el;
                }}
                farmer={g.farmer}
                farmerId={g.farmerId}
                items={g.items}
                state={g.state}
                choice={g.choice}
                settings={g.settings}
                highlighted={highlighted === g.farmerId}
                onChange={(patch) => updateChoice(g.farmerId, patch)}
                onOpenMap={() => setMapFarmerId(g.farmerId)}
              />
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
            <div className="mt-4 space-y-3 text-sm">
              {multiFarmer && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("subtotal")}</span>
                  <span>{formatEuro(totalPrice)}</span>
                </div>
              )}
              {groups.map((g) => (
                <div key={g.farmerId} className="space-y-1">
                  {multiFarmer ? (
                    <div className="flex justify-between font-medium text-foreground">
                      <span className="truncate pr-2">{g.farmer}</span>
                      <span>{formatEuro(g.state.total)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("subtotal")}</span>
                      <span>{formatEuro(g.state.productsTotal)}</span>
                    </div>
                  )}
                  {g.state.deliveryFee ? (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t("homeDelivery")}</span>
                        <span>{g.state.deliveryFee.fee > 0 ? formatEuro(g.state.deliveryFee.fee) : t("free")}</span>
                      </div>
                      {g.state.deliveryFee.remainingForFree != null && (
                        <p className="text-[11px] text-primary">
                          {t("remainingForFree", { amount: formatEuro(g.state.deliveryFee.remainingForFree) })}
                        </p>
                      )}
                    </>
                  ) : g.state.fulfillment === "pickup" ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("pickup")}</span>
                      <span>{t("pickupQr")}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between border-t border-border pt-4">
              <span className="font-semibold text-foreground">{t("total")}</span>
              <span className="font-mono tabular-nums text-xl font-bold text-primary">
                {formatEuro(orderTotal)}
              </span>
            </div>

            {pickupGroups.length > 0 && (
              <div className="mt-4 flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                <p>
                  <Trans t={t} i18nKey="pickupWarning" components={{ b: <strong /> }} />
                </p>
              </div>
            )}
            <Button
              onClick={onCheckoutClick}
              disabled={paying || blocked || !allReady}
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
                {pickupGroups
                  .filter((g) => g.state.slot)
                  .map((g) => {
                    const d = new Date(g.state.slot);
                    return (
                      <p
                        key={g.farmerId}
                        className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-2.5 font-medium text-foreground"
                      >
                        <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                        {multiFarmer
                          ? t("safety.scheduledFarmer", { farmer: g.farmer, date: formatSlotDate(d), time: formatSlotTime(d) })
                          : t("safety.scheduled", { date: formatSlotDate(d), time: formatSlotTime(d) })}
                      </p>
                    );
                  })}
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
        open={mapFarmerId !== null}
        onOpenChange={(open) => !open && setMapFarmerId(null)}
        value={mapGroup?.choice.point ?? null}
        onConfirm={(point) => mapFarmerId && updateChoice(mapFarmerId, { point })}
      />
    </main>
  );
};

export default Cart;

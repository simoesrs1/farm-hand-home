/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Leaf,
  Minus,
  Plus,
  MapPin,
  Navigation,
  Truck,
  Package,
  ShoppingCart,
  Clock,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useStock } from "@/contexts/StockContext";
import { useToast } from "@/hooks/use-toast";
import { categoryLabel, getCategoryByName } from "@/data/categories";
import SavingsBadge from "@/components/SavingsBadge";
import TranslatedText from "@/components/TranslatedText";
import PickupAvailabilityBadge from "@/components/PickupAvailabilityBadge";
import {
  formatPickupHours,
  formatSlotDate,
  formatSlotTime,
  parsePickupHours,
  pickupSlots,
  type PickupWindow,
} from "@/lib/pickup-hours";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMarketPrices, marketKey } from "@/hooks/useMarketPrices";
import type { Product } from "@/data/products";
import { scopedStorage, STORAGE_KEYS } from "@/lib/consent";
import { formatEuro } from "@/lib/format";
import {
  deliveryModeLabel,
  earliestDelivery,
  farmerDeliversFromProfile,
  FULFILLMENT_LABELS,
  modeAllowsDelivery,
  modeAllowsPickup,
  type Fulfillment,
} from "@/lib/fulfillment";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

interface Detail extends Product {
  description: string;
  originalPrice: number;
  isOrganic: boolean;
  isLactoseFree: boolean;
  modifications: string | null;
  vatRate: number;
  pickupWindows: PickupWindow[];
  pickupNote: string;
  pickupAddress: string;
  lat: number | null;
  lng: number | null;
  images: string[];
  /** O agricultor tem entregas configuradas (raio e localização da quinta). */
  farmerDelivers: boolean;
  deliveryRadiusKm: number | null;
  deliveryWindows: PickupWindow[];
  deliveryNote: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(["catalog", "common"]);
  const { addItem, updateQuantity, items: cartItems } = useCart();
  const { registerStock } = useStock();
  const marketPrices = useMarketPrices();

  const [product, setProduct] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [pickupDay, setPickupDay] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  // Preferência "levantar / receber em casa"; segue para o carrinho.
  const [chosenFulfillment, setChosenFulfillment] = useState<Fulfillment | null>(() =>
    scopedStorage.get<Fulfillment>(STORAGE_KEYS.fulfillment),
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: r } = await supabase
        .from("products")
        .select(
          "id, name, description, unit, client_price, discount_percent, stock_quantity, media_urls, delivery_mode, shipping_days, category, farmer_id, is_organic, is_lactose_free, has_modifications, modifications_description, vat_rate",
        )
        .eq("id", id)
        .eq("active", true)
        .maybeSingle();
      if (cancelled) return;
      if (!r) {
        setProduct(null);
        setLoading(false);
        return;
      }

      const { data: farmer } = await supabase
        .from("public_farmer_profiles")
        .select(
          "id, company_name, address, pickup_address, pickup_lat, pickup_lng, pickup_hours, pickup_hours_note, delivery_radius_km, delivery_hours, delivery_note",
        )
        .eq("id", r.farmer_id)
        .maybeSingle();

      const fallback = getCategoryByName(r.category ?? "")?.image ?? "/placeholder.svg";
      const images: string[] = [];
      for (const path of r.media_urls ?? []) {
        const { data: signed } = await supabase.storage
          .from("product-media")
          .createSignedUrl(path, 60 * 60);
        if (signed?.signedUrl) images.push(signed.signedUrl);
      }
      if (images.length === 0) images.push(fallback);

      if (cancelled) return;
      const price =
        Math.round(r.client_price * (1 - (r.discount_percent ?? 0) / 100) * 100) / 100;
      const detail: Detail = {
        id: r.id,
        name: r.name,
        description: r.description ?? "",
        farmerId: r.farmer_id,
        farmer: (farmer as any)?.company_name ?? i18n.t("catalog:categoryPage.farmerFallback"),
        price,
        originalPrice: r.client_price,
        unit: r.unit,
        category: r.category ?? "",
        image: images[0],
        images,
        rating: 0,
        reviews: 0,
        location: (farmer as any)?.address ?? "",
        region: "",
        deliveryMode: r.delivery_mode,
        shippingDays: r.shipping_days ?? undefined,
        stock: r.stock_quantity ?? 0,
        isOrganic: r.is_organic ?? false,
        isLactoseFree: r.is_lactose_free ?? false,
        modifications: r.has_modifications ? r.modifications_description : null,
        vatRate: Number(r.vat_rate ?? 6),
        pickupWindows: parsePickupHours((farmer as any)?.pickup_hours),
        pickupNote: ((farmer as any)?.pickup_hours_note as string) ?? "",
        pickupAddress: ((farmer as any)?.pickup_address as string) ?? (farmer as any)?.address ?? "",
        lat: (farmer as any)?.pickup_lat ?? null,
        lng: (farmer as any)?.pickup_lng ?? null,
        farmerDelivers: farmerDeliversFromProfile(farmer),
        deliveryRadiusKm:
          (farmer as any)?.delivery_radius_km != null
            ? Number((farmer as any).delivery_radius_km)
            : null,
        deliveryWindows: parsePickupHours((farmer as any)?.delivery_hours),
        deliveryNote: ((farmer as any)?.delivery_note as string) ?? "",
      };
      setProduct(detail);
      registerStock([{ id: detail.id, quantity: detail.stock }]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, registerStock]);

  const inCart = product ? cartItems.find((i) => i.id === product.id)?.quantity ?? 0 : 0;
  const maxAddable = product ? Math.max(0, product.stock - inCart) : 0;

  const mapsUrl = useMemo(() => {
    if (!product) return "";
    if (product.lat != null && product.lng != null) {
      return `https://www.google.com/maps/search/?api=1&query=${product.lat},${product.lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(product.pickupAddress || product.farmer)}`;
  }, [product]);

  const directionsUrl = useMemo(() => {
    if (!product) return "";
    const dest =
      product.lat != null && product.lng != null
        ? `${product.lat},${product.lng}`
        : encodeURIComponent(product.pickupAddress || product.farmer);
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  }, [product]);

  // Formas de receber este produto: levantamento e/ou entrega (se o agricultor entregar).
  const fulfillmentChoices = useMemo<Fulfillment[]>(() => {
    if (!product?.deliveryMode) return [];
    const choices: Fulfillment[] = [];
    if (modeAllowsPickup(product.deliveryMode)) choices.push("pickup");
    if (modeAllowsDelivery(product.deliveryMode) && product.farmerDelivers) choices.push("delivery");
    return choices;
  }, [product]);
  const fulfillment: Fulfillment | null =
    chosenFulfillment && fulfillmentChoices.includes(chosenFulfillment)
      ? chosenFulfillment
      : fulfillmentChoices[0] ?? null;
  const isDelivery = fulfillment === "delivery";

  // Levantamento: porta aberta. Entrega: horário de entregas, depois do prazo de preparação.
  const slots = useMemo(() => {
    if (!product || !fulfillment) return [];
    return fulfillment === "delivery"
      ? pickupSlots(product.deliveryWindows, { earliest: earliestDelivery(product.shippingDays ?? 0) })
      : pickupSlots(product.pickupWindows);
  }, [product, fulfillment]);

  const chooseFulfillment = (value: Fulfillment) => {
    setChosenFulfillment(value);
    setPickupDay("");
    setPickupTime("");
  };

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const days = useMemo(() => {
    const map = new Map<string, Date>();
    for (const d of slots) if (!map.has(dayKey(d))) map.set(dayKey(d), d);
    return [...map.entries()];
  }, [slots]);

  const timesForDay = useMemo(
    () => slots.filter((d) => dayKey(d) === pickupDay),
    [slots, pickupDay],
  );

  if (loading) {
    return (
      <main className="py-16">
        <div className="container max-w-4xl text-center text-muted-foreground">{t("product.loading")}</div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="py-16">
        <div className="container max-w-2xl text-center">
          <h1 className="font-display text-2xl font-bold">{t("product.unavailable")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("product.unavailableText")}
          </p>
          <Link to="/catalogo" className="mt-6 inline-block">
            <Button>{t("product.seeCatalog")}</Button>
          </Link>
        </div>
      </main>
    );
  }

  const handleAdd = () => {
    if (maxAddable <= 0) return;
    const amount = Math.min(qty, maxAddable);
    addItem(product);
    if (inCart + amount > 1) updateQuantity(product.id, inCart + amount);
    if (fulfillment) scopedStorage.set(STORAGE_KEYS.fulfillment, fulfillment);
    if (pickupTime) scopedStorage.set(STORAGE_KEYS.pickupSlot, pickupTime);
    toast({
      title: t("product.added"),
      description: pickupTime
        ? t(isDelivery ? "product.addedDelivery" : "product.addedPickup", {
            amount,
            name: product.name,
            date: formatSlotDate(new Date(pickupTime)),
            time: formatSlotTime(new Date(pickupTime)),
          })
        : `${amount} × ${product.name}`,
    });
  };

  const deliveryLabel = deliveryModeLabel(product.deliveryMode, product.farmerDelivers);
  const offersPickup = fulfillmentChoices.includes("pickup");
  const offersDelivery = fulfillmentChoices.includes("delivery");
  // Produto com entrega, mas o agricultor ainda não configurou raio/localização.
  const deliveryPending = !!product.deliveryMode && modeAllowsDelivery(product.deliveryMode) && !product.farmerDelivers;
  const prepDays = Math.max(0, product.shippingDays ?? 0);

  const hours = formatPickupHours(product.pickupWindows);
  const deliveryHours = formatPickupHours(product.deliveryWindows);

  return (
    <main className="py-8">
      <div className="container max-w-5xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("common:actions.back")}
        </button>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Galeria */}
          <div>
            <div className="overflow-hidden rounded-2xl border border-border bg-muted">
              <img
                src={product.images[activeImage]}
                alt={product.name}
                className="h-72 w-full object-cover sm:h-96"
              />
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {product.images.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
                      i === activeImage ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detalhe */}
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              <TranslatedText type="product" id={product.id} field="name" text={product.name} />
            </h1>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono tabular-nums text-2xl font-bold text-primary">{formatEuro(product.price)}</span>
              <span className="text-sm text-muted-foreground">/ {product.unit}</span>
              <span className="text-xs text-muted-foreground">· {t("common:units.vat", { rate: product.vatRate })}</span>
            </div>

            <SavingsBadge
              price={product.price}
              originalPrice={product.originalPrice}
              unit={product.unit}
              market={marketPrices.get(marketKey(product.name))}
            />

            {product.description && (
              <div className="mt-4">
                <TranslatedText
                  type="product"
                  id={product.id}
                  field="description"
                  text={product.description}
                  as="p"
                  className="text-sm leading-relaxed text-muted-foreground"
                  toggle
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {product.isOrganic && (
                <span className="inline-flex items-center gap-1 rounded-full bg-leaf-light px-2.5 py-1 text-xs font-medium text-kale">
                  <Leaf className="h-3 w-3" /> {t("product.organic")}
                </span>
              )}
              {product.isLactoseFree && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {t("product.lactoseFree")}
                </span>
              )}
              {product.category && (
                <Link
                  to={`/catalogo`}
                  className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {categoryLabel(product.category)}
                </Link>
              )}
            </div>

            {/* Cartões de informação */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">{t("product.stock")}</span>
                </div>
                <p className={`mt-1 font-semibold ${product.stock <= 5 ? "text-destructive" : "text-success"}`}>
                  {t("product.available", { count: product.stock, unit: product.unit })}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">{t("product.delivery")}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">{deliveryLabel}</p>
                {offersDelivery && (
                  <p className="mt-1 text-xs text-primary">
                    {product.deliveryRadiusKm != null
                      ? t("product.handDeliveryUpTo", { km: product.deliveryRadiusKm })
                      : t("product.handDelivery")}
                  </p>
                )}
                {deliveryPending && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("product.deliveryPending")}
                  </p>
                )}
              </div>
            </div>

            {offersDelivery && (
              <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Truck className="h-4 w-4 text-primary" />
                  {t("common:deliveryMode.shipping")}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {product.deliveryRadiusKm != null
                    ? t("product.deliveryRadius", { km: product.deliveryRadiusKm })
                    : t("product.deliveryByFarmer")}
                  {prepDays > 0 ? ` ${t("product.prepDays", { count: prepDays })}` : ""}
                </p>
                {deliveryHours.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {deliveryHours.map((h) => (
                      <span
                        key={`del-${h}`}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        <Clock className="h-3 w-3" /> {h}
                      </span>
                    ))}
                  </div>
                )}
                {product.deliveryNote && (
                  <TranslatedText
                    type="farm"
                    id={product.farmerId}
                    field="delivery_note"
                    text={product.deliveryNote}
                    as="p"
                    className="mt-2 text-xs text-muted-foreground"
                  />
                )}
              </div>
            )}


            {product.modifications && (
              <p className="mt-3 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                {t("product.modifications")} {product.modifications}
              </p>
            )}

            {/* Compra */}
            <div className="mt-6 rounded-2xl border border-border p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("product.reserve")}
              </p>

              <div className="mt-4 flex items-center gap-4">
                <span className="text-sm font-medium">{t("product.quantity")}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center font-semibold">{qty}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9"
                    disabled={qty >= maxAddable}
                    onClick={() => setQty((q) => Math.min(maxAddable, q + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">{product.unit}</span>
              </div>

              {fulfillmentChoices.length > 1 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">{t("product.howReceive")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {fulfillmentChoices.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => chooseFulfillment(f)}
                        aria-pressed={fulfillment === f}
                        className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${
                          fulfillment === f ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        {f === "delivery" ? (
                          <Truck className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <MapPin className="h-4 w-4 shrink-0 text-primary" />
                        )}
                        <span className="font-medium text-foreground">{FULFILLMENT_LABELS[f]}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t("product.choiceToCart")}
                  </p>
                </div>
              )}

              {offersPickup && !isDelivery && (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  {product.pickupAddress || t("product.pickupAtFarm")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {t("product.viewMap")}
                    </Button>
                  </a>
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Navigation className="h-3.5 w-3.5" /> {t("product.directions")}
                    </Button>
                  </a>
                  <Link to={`/agricultor/${product.farmerId}`}>
                    <Button size="sm" variant="ghost">
                      {product.farmer}
                    </Button>
                  </Link>
                </div>
              </div>
              )}

              {!isDelivery && hours.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t("product.farmerHours")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {hours.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        <Clock className="h-3 w-3" /> {h}
                      </span>
                    ))}
                  </div>
                  <PickupAvailabilityBadge windows={product.pickupWindows} />
                  {product.pickupNote && (
                    <TranslatedText
                      type="farm"
                      id={product.farmerId}
                      field="pickup_hours_note"
                      text={product.pickupNote}
                      as="p"
                      className="mt-2 text-xs text-muted-foreground"
                    />
                  )}
                </div>
              )}

              {days.length > 0 && (
                <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    {isDelivery ? t("product.chooseDeliveryTime") : t("product.choosePickupTime")}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select
                      value={pickupDay}
                      onValueChange={(v) => {
                        setPickupDay(v);
                        setPickupTime("");
                      }}
                    >
                      <SelectTrigger aria-label={isDelivery ? t("product.deliveryDay") : t("product.pickupDay")}>
                        <SelectValue placeholder={t("product.chooseDay")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {days.map(([key, d]) => (
                          <SelectItem key={key} value={key}>
                            {formatSlotDate(d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={pickupTime}
                      onValueChange={setPickupTime}
                      disabled={!pickupDay}
                    >
                      <SelectTrigger aria-label={isDelivery ? t("product.deliveryHour") : t("product.pickupHour")}>
                        <SelectValue placeholder={t("product.chooseHour")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {timesForDay.map((d) => (
                          <SelectItem key={d.toISOString()} value={d.toISOString()}>
                            {formatSlotTime(d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {isDelivery
                      ? prepDays > 0
                        ? t("product.slotsDeliveryPrep", { count: prepDays })
                        : t("product.slotsDelivery")
                      : t("product.slotsPickup")}{" "}
                    {t("product.choiceToCart")}
                  </p>
                </div>
              )}

              <Button
                className="mt-5 w-full gap-2"
                size="lg"
                disabled={maxAddable <= 0}
                onClick={handleAdd}
              >
                <ShoppingCart className="h-4 w-4" />
                {maxAddable <= 0 ? t("product.noStock") : t("product.addToCart", { price: formatEuro(product.price * qty) })}
              </Button>
              {inCart > 0 && (
                <Link to="/carrinho" className="mt-2 block text-center text-xs text-primary underline">
                  {t("product.inCart", { count: inCart })}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProductDetail;

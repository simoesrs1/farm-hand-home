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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useStock } from "@/contexts/StockContext";
import { useToast } from "@/hooks/use-toast";
import { getCategoryByName } from "@/data/categories";
import SavingsBadge from "@/components/SavingsBadge";
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
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem, updateQuantity, items: cartItems } = useCart();
  const { registerStock } = useStock();
  const marketPrices = useMarketPrices();

  const [product, setProduct] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [pickupDay, setPickupDay] = useState("");
  const [pickupTime, setPickupTime] = useState("");

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
        .select("id, company_name, address, pickup_address, pickup_lat, pickup_lng, pickup_hours, pickup_hours_note")
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
        farmer: (farmer as any)?.company_name ?? "Agricultor",
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

  const slots = useMemo(
    () => (product ? pickupSlots(product.pickupWindows) : []),
    [product],
  );

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
        <div className="container max-w-4xl text-center text-muted-foreground">A carregar produto…</div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="py-16">
        <div className="container max-w-2xl text-center">
          <h1 className="font-display text-2xl font-bold">Produto indisponível</h1>
          <p className="mt-2 text-muted-foreground">
            Este produto já não está à venda ou foi removido pelo agricultor.
          </p>
          <Link to="/catalogo" className="mt-6 inline-block">
            <Button>Ver catálogo</Button>
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
    toast({
      title: "Adicionado ao carrinho",
      description: `${amount} × ${product.name}`,
    });
  };

  const deliveryLabel =
    product.deliveryMode === "shipping"
      ? `Entrega em casa (${product.shippingDays ?? "?"} dias)`
      : product.deliveryMode === "both"
      ? `Levantamento ou entrega em casa (${product.shippingDays ?? "?"} dias)`
      : "Apenas levantamento na propriedade";

  const hours = formatPickupHours(product.pickupWindows);

  return (
    <main className="py-8">
      <div className="container max-w-5xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
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
              {product.name}
            </h1>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{product.price.toFixed(2)}€</span>
              <span className="text-sm text-muted-foreground">/ {product.unit}</span>
              <span className="text-xs text-muted-foreground">· IVA {product.vatRate}%</span>
            </div>

            <SavingsBadge
              price={product.price}
              originalPrice={product.originalPrice}
              unit={product.unit}
              market={marketPrices.get(marketKey(product.name))}
            />

            {product.description && (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {product.isOrganic && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  <Leaf className="h-3 w-3" /> Biológico
                </span>
              )}
              {product.isLactoseFree && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Sem lactose
                </span>
              )}
              {product.category && (
                <Link
                  to={`/catalogo`}
                  className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {product.category}
                </Link>
              )}
            </div>

            {/* Cartões de informação */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Stock</span>
                </div>
                <p className={`mt-1 font-semibold ${product.stock <= 5 ? "text-destructive" : "text-foreground"}`}>
                  {product.stock} {product.unit} disponíveis
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Entrega</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">{deliveryLabel}</p>
              </div>
            </div>

            {product.modifications && (
              <p className="mt-3 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                Alterações declaradas pelo produtor: {product.modifications}
              </p>
            )}

            {/* Compra */}
            <div className="mt-6 rounded-2xl border border-border p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Reservar · pague com segurança
              </p>

              <div className="mt-4 flex items-center gap-4">
                <span className="text-sm font-medium">Quantidade</span>
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

              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  {product.pickupAddress || "Levantamento na propriedade"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Ver no mapa
                    </Button>
                  </a>
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Navigation className="h-3.5 w-3.5" /> Direções
                    </Button>
                  </a>
                  <Link to={`/agricultor/${product.farmerId}`}>
                    <Button size="sm" variant="ghost">
                      {product.farmer}
                    </Button>
                  </Link>
                </div>
              </div>

              {hours.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Horários do produtor
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
                    <p className="mt-2 text-xs text-muted-foreground">{product.pickupNote}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    O horário exato de levantamento é escolhido no carrinho, antes do pagamento.
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
                {maxAddable <= 0 ? "Sem stock disponível" : `Adicionar ao carrinho · ${(product.price * qty).toFixed(2)}€`}
              </Button>
              {inCart > 0 && (
                <Link to="/carrinho" className="mt-2 block text-center text-xs text-primary underline">
                  Já tens {inCart} no carrinho — ir para o carrinho
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

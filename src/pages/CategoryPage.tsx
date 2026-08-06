import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, Navigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Product } from "@/data/products";
import { getCategoryBySlug } from "@/data/categories";
import { useCart } from "@/contexts/CartContext";
import { useStock } from "@/contexts/StockContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SavingsBadge from "@/components/SavingsBadge";
import { useMarketPrices, marketKey } from "@/hooks/useMarketPrices";

type SortOption =
  | "relevancia"
  | "preco-menor"
  | "preco-maior"
  | "mais-perto"
  | "mais-longe"
  | "biologico"
  | "melhor-avaliacao"
  | "mais-vendidos";

const sortLabels: Record<SortOption, string> = {
  relevancia: "Relevância",
  "preco-menor": "Preço mais baixo",
  "preco-maior": "Preço mais alto",
  "mais-perto": "Mais perto",
  "mais-longe": "Mais longe",
  biologico: "Biológico",
  "melhor-avaliacao": "Melhor avaliação",
  "mais-vendidos": "Mais vendidos",
};

/** Extra signals used only for sorting on this page. */
type SortableProduct = Product & {
  isOrganic: boolean;
  createdAt: string;
  originalPrice: number;
  score: number;
  lat: number | null;
  lng: number | null;
};

const distanceKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const category = slug ? getCategoryBySlug(slug) : undefined;
  const { addItem, items: cartItems } = useCart();
  const { registerStock } = useStock();
  const { toast } = useToast();
  const [items, setItems] = useState<SortableProduct[]>([]);
  const marketPrices = useMarketPrices();
  const [sort, setSort] = useState<SortOption>("relevancia");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  const handleSortChange = (value: string) => {
    const option = value as SortOption;
    setSort(option);
    if ((option === "mais-perto" || option === "mais-longe") && !userPos) {
      if (!navigator.geolocation) {
        toast({
          title: "Localização indisponível",
          description: "O seu navegador não permite obter a localização.",
        });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () =>
          toast({
            title: "Localização não autorizada",
            description: "Ative a localização para ordenar por distância.",
          })
      );
    }
  };

  // Notifications about favourite farmers (restock / promotions / new products)
  // link straight here with ?produto=<id> so we scroll to and highlight it.
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("produto");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});


  useEffect(() => {
    if (!category) return;
    let cancelled = false;

    const load = async () => {
      const { data: rows, error } = await supabase
        .from("products")
        .select("id, name, unit, client_price, discount_percent, stock_quantity, media_urls, delivery_mode, shipping_days, category, farmer_id, is_organic, created_at")
        .ilike("category", category.name)
        .eq("active", true)
        .gt("stock_quantity", 0);
      if (error || !rows || rows.length === 0) {
        if (!cancelled) setItems([]);
        return;
      }

      // Farmer name/address come from the public-safe view (no auth required),
      // fetched separately to avoid ambiguous Supabase foreign-key embedding
      // (products.farmer_id points at farmer_details, farmer_public AND
      // public_farmer_profiles at once).
      const farmerIds = [...new Set(rows.map((r) => r.farmer_id))];
      const { data: farmers } = await supabase
        .from("public_farmer_profiles")
        .select("id, company_name, address, initial_score, pickup_lat, pickup_lng")
        .in("id", farmerIds);
      const farmerById = new Map((farmers ?? []).map((f) => [f.id, f]));

      const mapped = await Promise.all(
        rows.map(async (r) => {
          const farmer = farmerById.get(r.farmer_id);
          // Product photos live in a private bucket, so a signed URL is
          // needed; fall back to the category image if there's no photo yet.
          let image = category.image;
          const path = r.media_urls?.[0];
          if (path) {
            const { data: signed } = await supabase.storage
              .from("product-media")
              .createSignedUrl(path, 60 * 60);
            if (signed?.signedUrl) image = signed.signedUrl;
          }
          const product: SortableProduct = {
            id: r.id,
            name: r.name,
            farmerId: r.farmer_id,
            farmer: farmer?.company_name ?? "Agricultor",
            price: Math.round(r.client_price * (1 - (r.discount_percent ?? 0) / 100) * 100) / 100,
            originalPrice: r.client_price,
            unit: r.unit,
            category: r.category ?? category.name,
            image,
            rating: 0,
            reviews: 0,
            location: farmer?.address ?? "",
            region: "",
            deliveryMode: r.delivery_mode,
            shippingDays: r.shipping_days ?? undefined,
            stock: r.stock_quantity ?? 0,
            isOrganic: r.is_organic ?? false,
            createdAt: r.created_at,
            score: farmer?.initial_score ?? 0,
            lat: farmer?.pickup_lat ?? null,
            lng: farmer?.pickup_lng ?? null,
          };
          return product;
        })
      );

      if (!cancelled) {
        setItems(mapped);
        registerStock(mapped.map((p) => ({ id: p.id, quantity: p.stock })));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [category, registerStock]);

  useEffect(() => {
    if (!highlightId) return;
    const el = cardRefs.current[highlightId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, items]);

  const sorted = useMemo(() => {
    const list = [...items];
    const dist = (p: SortableProduct) =>
      userPos && p.lat != null && p.lng != null
        ? distanceKm(userPos, { lat: p.lat, lng: p.lng })
        : Number.POSITIVE_INFINITY;

    switch (sort) {
      case "preco-menor":
        list.sort((a, b) => a.price - b.price);
        break;
      case "preco-maior":
        list.sort((a, b) => b.price - a.price);
        break;
      case "mais-perto":
        list.sort((a, b) => dist(a) - dist(b));
        break;
      case "mais-longe":
        list.sort((a, b) => {
          const da = dist(a);
          const db = dist(b);
          if (!isFinite(da) && !isFinite(db)) return 0;
          if (!isFinite(da)) return 1;
          if (!isFinite(db)) return -1;
          return db - da;
        });
        break;
      case "biologico":
        list.sort((a, b) => Number(b.isOrganic) - Number(a.isOrganic));
        break;
      case "melhor-avaliacao":
        list.sort((a, b) => b.score - a.score || b.rating - a.rating);
        break;
      case "mais-vendidos":
        // Sem histórico de vendas público: menor stock restante = mais procurado.
        list.sort((a, b) => a.stock - b.stock);
        break;
      default:
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return list;
  }, [items, sort, userPos]);

  if (!category) return <Navigate to="/catalogo" replace />;

  return (
    <main className="py-12">
      <div className="container">
        <Link
          to="/catalogo"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </Link>

        <div className="mb-6 overflow-hidden rounded-xl border border-border">
          <div className="relative h-40 sm:h-56">
            <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <h1 className="absolute bottom-4 left-5 font-display text-3xl font-bold text-white md:text-4xl">
              {category.name}
            </h1>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{sorted.length}</span> produto
            {sorted.length !== 1 && "s"} nesta categoria
          </p>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sortLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            Ainda não há produtos nesta categoria.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {sorted.map((p) => {

              const available = p.stock;
              const inCart = cartItems.find((i) => i.id === p.id)?.quantity ?? 0;
              const canAdd = inCart < available;
              const isHighlighted = highlightId === p.id;
              return (
                <div
                  key={p.id}
                  ref={(el) => { cardRefs.current[p.id] = el; }}
                  className={`group overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                    isHighlighted ? "border-primary ring-2 ring-primary/30 shadow-lg" : "border-border"
                  }`}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                    <Link to={`/agricultor/${p.farmerId}`} className="text-xs text-primary underline">
                      {p.farmer}
                    </Link>
                    <Link
                      to={`/agricultor/${p.farmerId}`}
                      className="hover:underline"
                      title="Stock definido pelo agricultor"
                    >
                      <div>
                        <span className={`mt-1 inline-block text-xs font-medium ${available <= 5 ? "text-destructive" : "text-primary"}`}>
                          {available} em stock
                        </span>
                      </div>
                      
                    </Link>
                    <p className="mt-2 text-xs font-medium text-primary">
                      {p.deliveryMode === "shipping"
                        ? `Entrega em casa (${p.shippingDays ?? "?"} dias)`
                        : p.deliveryMode === "both"
                        ? `Levantamento ou entrega em casa (${p.shippingDays ?? "?"} dias)`
                        : "Apenas levantamento na propriedade"}
                    </p>
                    <SavingsBadge
                      price={p.price}
                      originalPrice={p.originalPrice}
                      unit={p.unit}
                      market={marketPrices.get(marketKey(p.name))}
                    />

                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <span className="text-lg font-bold text-primary">{p.price.toFixed(2)}€</span>
                        <span className="text-xs text-muted-foreground">/{p.unit}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={!canAdd}
                        onClick={() => {
                          addItem(p);
                          toast({ title: "Adicionado ao carrinho", description: p.name });
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {canAdd ? "Adicionar" : "Sem stock"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default CategoryPage;

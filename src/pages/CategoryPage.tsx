import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, Navigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUpDown, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCategoryBySlug } from "@/data/categories";
import { useStock } from "@/contexts/StockContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { ProductCardSkeleton, type ProductCardProduct } from "@/components/ProductCard";
import { parsePickupHours, type PickupWindow } from "@/lib/pickup-hours";
import { useMarketPrices, marketKey } from "@/hooks/useMarketPrices";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { farmerRank } from "@/lib/farmer-activity";
import { farmerDeliversFromProfile, modeAllowsDelivery } from "@/lib/fulfillment";
import { Flip, gsap, useGSAP } from "@/lib/animation";
import { cn } from "@/lib/utils";

type SortOption =
  | "relevancia"
  | "novidades"
  | "preco-menor"
  | "preco-maior"
  | "mais-perto"
  | "mais-longe"
  | "melhor-avaliacao"
  | "mais-vendidos";

const sortLabels: Record<SortOption, string> = {
  relevancia: "Relevância",
  novidades: "Novidades",
  "preco-menor": "Preço mais baixo",
  "preco-maior": "Preço mais alto",
  "mais-perto": "Mais perto",
  "mais-longe": "Mais longe",
  "melhor-avaliacao": "Melhor avaliação",
  "mais-vendidos": "Mais vendidos",
};

type FilterKey = "biologico" | "sem-lactose" | "promocao" | "levantamento" | "entrega";

/** Produto com os sinais usados para filtrar e ordenar nesta página. */
type SortableProduct = ProductCardProduct & {
  isOrganic: boolean;
  isLactoseFree: boolean;
  createdAt: string;
  originalPrice: number;
  score: number;
  /** Pontuação de atividade do agricultor (0–100). */
  activityScore: number;
  lowStockThreshold: number;
  lat: number | null;
  lng: number | null;
  pickupWindows: PickupWindow[];
  /** Unidades vendidas nos últimos 90 dias (função product_sales_counts). */
  unitsSold: number;
  /** O agricultor tem zona de entrega (raio e localização da quinta). */
  deliveryAvailable: boolean;
};

const filters: { key: FilterKey; label: string; test: (p: SortableProduct) => boolean }[] = [
  { key: "biologico", label: "Biológico", test: (p) => p.isOrganic },
  { key: "sem-lactose", label: "Sem lactose", test: (p) => p.isLactoseFree },
  { key: "promocao", label: "Em promoção", test: (p) => p.originalPrice > p.price },
  { key: "levantamento", label: "Levantar na quinta", test: (p) => p.deliveryMode !== "shipping" },
  {
    key: "entrega",
    label: "Entrega ao domicílio",
    test: (p) => !!p.deliveryMode && modeAllowsDelivery(p.deliveryMode) && p.deliveryAvailable,
  },
];

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

const isVideo = (path: string) => /\.(mp4|webm|mov)$/i.test(path);

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const category = slug ? getCategoryBySlug(slug) : undefined;
  const { registerStock } = useStock();
  const { toast } = useToast();
  const [items, setItems] = useState<SortableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const marketPrices = useMarketPrices();
  const reducedMotion = useReducedMotion();
  const [sort, setSort] = useState<SortOption>("relevancia");
  const [active, setActive] = useState<Set<FilterKey>>(new Set());
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  // Animação Flip: guarda as posições antes de mudar a lista e anima depois do render.
  const gridRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const captureFlip = () => {
    if (reducedMotion || !gridRef.current) return;
    flipState.current = Flip.getState(gridRef.current.querySelectorAll(".flip-item"));
  };

  const handleSortChange = (value: string) => {
    const option = value as SortOption;
    captureFlip();
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
        (pos) => {
          captureFlip();
          setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () =>
          toast({
            title: "Localização não autorizada",
            description: "Ative a localização para ordenar por distância.",
          })
      );
    }
  };

  const toggleFilter = (key: FilterKey) => {
    captureFlip();
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearFilters = () => {
    captureFlip();
    setActive(new Set());
  };

  // Notifications about favourite farmers (restock / promotions / new products)
  // link straight here with ?produto=<id> so we scroll to and highlight it.
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("produto");
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const { data: rows, error } = await supabase
        .from("products")
        .select("id, name, unit, client_price, discount_percent, stock_quantity, low_stock_threshold, media_urls, delivery_mode, shipping_days, category, farmer_id, is_organic, is_lactose_free, created_at")
        .ilike("category", category.name)
        .eq("active", true)
        .gt("stock_quantity", 0);
      if (error) {
        console.error("Erro ao carregar produtos da categoria", error);
        if (!cancelled) {
          toast({
            title: "Não foi possível carregar os produtos",
            description: "Tente novamente dentro de momentos.",
            variant: "destructive",
          });
        }
      }
      if (error || !rows || rows.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      // Farmer name/address come from the public-safe view (no auth required),
      // fetched separately to avoid ambiguous Supabase foreign-key embedding
      // (products.farmer_id points at farmer_details, farmer_public AND
      // public_farmer_profiles at once).
      const farmerIds = [...new Set(rows.map((r) => r.farmer_id))];
      const paths = rows
        .map((r) => r.media_urls?.find((p) => !isVideo(p)))
        .filter((p): p is string => !!p);

      // Agricultores, avaliações, vendas e fotografias em paralelo (um pedido de cada).
      const [farmersRes, reviewsRes, salesRes, signedRes] = await Promise.all([
        supabase
          .from("public_farmer_profiles")
          .select("id, company_name, address, initial_score, activity_score, pickup_lat, pickup_lng, pickup_hours, delivery_radius_km")
          .in("id", farmerIds),
        supabase.from("farmer_reviews").select("farmer_id, rating").in("farmer_id", farmerIds).is("removed_at", null),
        supabase.rpc("product_sales_counts", { p_product_ids: rows.map((r) => r.id) }),
        paths.length
          ? supabase.storage.from("product-media").createSignedUrls(paths, 60 * 60)
          : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
      ]);
      // Sem a função de vendas (migração ainda não aplicada), "Mais vendidos" usa a relevância.
      if (salesRes.error) console.warn("product_sales_counts indisponível", salesRes.error.message);

      const farmerById = new Map((farmersRes.data ?? []).map((f) => [f.id, f]));
      const ratingByFarmer = new Map<string, { sum: number; count: number }>();
      for (const r of reviewsRes.data ?? []) {
        const agg = ratingByFarmer.get(r.farmer_id) ?? { sum: 0, count: 0 };
        agg.sum += r.rating;
        agg.count += 1;
        ratingByFarmer.set(r.farmer_id, agg);
      }
      const soldById = new Map((salesRes.data ?? []).map((s) => [s.product_id, Number(s.units_sold)]));
      const signedByPath = new Map<string, string>();
      for (const s of signedRes.data ?? []) if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);

      const mapped: SortableProduct[] = rows.map((r) => {
        const farmer = farmerById.get(r.farmer_id);
        const path = r.media_urls?.find((p) => !isVideo(p));
        const rating = ratingByFarmer.get(r.farmer_id);
        return {
          id: r.id,
          name: r.name,
          farmerId: r.farmer_id,
          farmer: farmer?.company_name ?? "Agricultor",
          price: Math.round(r.client_price * (1 - (r.discount_percent ?? 0) / 100) * 100) / 100,
          originalPrice: r.client_price,
          unit: r.unit,
          category: r.category ?? category.name,
          // Sem fotografia, usa a imagem da categoria.
          image: (path && signedByPath.get(path)) || category.image,
          // Avaliação média do agricultor (as avaliações são feitas ao agricultor, não ao produto).
          rating: rating ? rating.sum / rating.count : 0,
          reviews: rating?.count ?? 0,
          location: farmer?.address ?? "",
          region: "",
          deliveryMode: r.delivery_mode,
          shippingDays: r.shipping_days ?? undefined,
          stock: r.stock_quantity ?? 0,
          isOrganic: r.is_organic ?? false,
          isLactoseFree: r.is_lactose_free ?? false,
          createdAt: r.created_at,
          score: farmer?.initial_score ?? 0,
          activityScore: farmer?.activity_score ?? 0,
          lowStockThreshold: r.low_stock_threshold,
          lat: farmer?.pickup_lat ?? null,
          lng: farmer?.pickup_lng ?? null,
          pickupWindows: parsePickupHours(farmer?.pickup_hours),
          unitsSold: soldById.get(r.id) ?? 0,
          deliveryAvailable: farmerDeliversFromProfile(farmer),
        };
      });

      if (!cancelled) {
        setItems(mapped);
        registerStock(mapped.map((p) => ({ id: p.id, quantity: p.stock })));
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [category, registerStock, toast]);

  useEffect(() => {
    if (!highlightId) return;
    const el = cardRefs.current[highlightId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, items]);

  // Quantos produtos cada filtro deixaria (para mostrar ao lado do nome).
  const filterCounts = useMemo(
    () => Object.fromEntries(filters.map((f) => [f.key, items.filter(f.test).length])) as Record<FilterKey, number>,
    [items],
  );

  const visible = useMemo(() => {
    const list = items.filter((p) => filters.every((f) => !active.has(f.key) || f.test(p)));
    const dist = (p: SortableProduct) =>
      userPos && p.lat != null && p.lng != null
        ? distanceKm(userPos, { lat: p.lat, lng: p.lng })
        : Number.POSITIVE_INFINITY;
    // Relevância: agricultores mais ativos e certificados primeiro (desempate das outras ordenações).
    const relevance = (a: SortableProduct, b: SortableProduct) =>
      farmerRank(b.activityScore, b.score) - farmerRank(a.activityScore, a.score) ||
      b.createdAt.localeCompare(a.createdAt);

    switch (sort) {
      case "novidades":
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
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
      case "melhor-avaliacao":
        list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews || relevance(a, b));
        break;
      case "mais-vendidos":
        list.sort((a, b) => b.unitsSold - a.unitsSold || relevance(a, b));
        break;
      default:
        list.sort(relevance);
    }
    return list;
  }, [items, sort, active, userPos]);
  const visibleKey = visible.map((p) => p.id).join(",");

  // Depois de filtrar ou ordenar: os cartões deslizam para o novo lugar e os novos aparecem.
  useGSAP(
    () => {
      const state = flipState.current;
      flipState.current = null;
      if (!state || reducedMotion || !gridRef.current) return;
      Flip.from(state, {
        targets: gridRef.current.querySelectorAll(".flip-item"),
        duration: 0.5,
        ease: "power2.inOut",
        stagger: 0.02,
        onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.35 }),
      });
    },
    { dependencies: [visibleKey] },
  );

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

        <div className="mb-6 overflow-hidden rounded-2xl border border-border">
          <div className="relative h-40 sm:h-56">
            <img src={category.image} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/20 to-transparent" />
            <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3">
              <h1 className="font-display text-3xl text-background md:text-5xl">{category.name}</h1>
              {!loading && (
                <Badge variant="highlight" className="font-mono tabular-nums">
                  {items.length} {items.length === 1 ? "produto" : "produtos"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Filtros e ordenação */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {loading ? (
            <Skeleton className="h-9 w-72" />
          ) : (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar produtos">
              {filters.map((f) => {
                const on = active.has(f.key);
                const count = filterCounts[f.key];
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={on}
                    disabled={!on && count === 0}
                    onClick={() => toggleFilter(f.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-foreground hover:border-foreground/40",
                    )}
                  >
                    {f.label}
                    <span className={cn("font-mono text-xs tabular-nums", on ? "text-background/70" : "text-muted-foreground")}>
                      {count}
                    </span>
                  </button>
                );
              })}
              {active.size > 0 && (
                <Button variant="ghost" size="sm" className="gap-1" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" /> Limpar
                </Button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[200px]" aria-label="Ordenar por">
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
            <Link
              to="/termos#ordenacao"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Como ordenamos?
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" aria-busy="true" aria-label="A carregar produtos">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            Ainda não há produtos nesta categoria.
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center">
            <p className="text-muted-foreground">Nenhum produto corresponde a estes filtros.</p>
            <Button variant="link" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {visible.map((p) => (
              <div key={p.id} className="flip-item" data-flip-id={p.id}>
                <ProductCard
                  ref={(el) => {
                    cardRefs.current[p.id] = el;
                  }}
                  className="h-full"
                  product={p}
                  market={marketPrices.get(marketKey(p.name))}
                  highlighted={highlightId === p.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default CategoryPage;

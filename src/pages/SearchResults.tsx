import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { type Product } from "@/data/products";
import { getCategoryByName } from "@/data/categories";
import { useStock } from "@/contexts/StockContext";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";
import PageHeader from "@/components/PageHeader";
import { useMarketPrices, marketKey } from "@/hooks/useMarketPrices";
import { farmerRank } from "@/lib/farmer-activity";
import { farmerDeliversFromProfile } from "@/lib/fulfillment";
import { Trans, useTranslation } from "react-i18next";
import i18n from "@/i18n";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=400&fit=crop";

type SortOption = "relevancia" | "mais-avaliado" | "menos-avaliado" | "preco-maior" | "preco-menor";

const SORT_OPTIONS: SortOption[] = ["relevancia", "mais-avaliado", "menos-avaliado", "preco-maior", "preco-menor"];

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { registerStock } = useStock();
  const { t } = useTranslation("catalog");
  const location = searchParams.get("location") || "";
  const radius = searchParams.get("radius") || "25";
  const sort = (searchParams.get("sort") as SortOption) || "relevancia";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  // Atividade + certificados de cada agricultor, para a ordenação "Relevância".
  const [rankByFarmer, setRankByFarmer] = useState<Map<string, number>>(new Map());
  const [originalPrices, setOriginalPrices] = useState<Map<string, number>>(new Map());
  const marketPrices = useMarketPrices();

  const handleSortChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sort", value);
    setSearchParams(newParams);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: rows, error } = await supabase
        .from("products")
        .select("id, name, unit, client_price, discount_percent, stock_quantity, media_urls, delivery_mode, shipping_days, category, farmer_id")
        .eq("active", true)
        .gt("stock_quantity", 0);
      if (error || !rows || rows.length === 0) {
        if (!cancelled) {
          setProducts([]);
          setLoading(false);
        }
        return;
      }

      const farmerIds = [...new Set(rows.map((r) => r.farmer_id))];
      const { data: farmers } = await supabase
        .from("public_farmer_profiles")
        .select("id, company_name, address, initial_score, activity_score, delivery_radius_km, pickup_lat, pickup_lng")
        .in("id", farmerIds);
      const farmerById = new Map((farmers ?? []).map((f) => [f.id, f]));

      // Fotografias num único pedido (bucket privado: URLs assinados por 1 hora).
      const paths = rows.map((r) => r.media_urls?.[0]).filter((p): p is string => !!p);
      const signedByPath = new Map<string, string>();
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("product-media").createSignedUrls(paths, 60 * 60);
        for (const s of signed ?? []) if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
      }

      const mapped = rows.map((r) => {
          const farmer = farmerById.get(r.farmer_id);
          const category = r.category ? getCategoryByName(r.category) : undefined;
          const path = r.media_urls?.[0];
          const image = (path && signedByPath.get(path)) || category?.image || FALLBACK_IMAGE;
          const product: Product = {
            id: r.id,
            name: r.name,
            farmerId: r.farmer_id,
            farmer: farmer?.company_name ?? i18n.t("catalog:categoryPage.farmerFallback"),
            price: Math.round(r.client_price * (1 - (r.discount_percent ?? 0) / 100) * 100) / 100,
            unit: r.unit,
            category: r.category ?? "",
            image,
            rating: 0,
            reviews: 0,
            location: farmer?.address ?? "",
            region: "",
            deliveryMode: r.delivery_mode,
            shippingDays: r.shipping_days ?? undefined,
            deliveryAvailable: farmerDeliversFromProfile(farmer),
            stock: r.stock_quantity ?? 0,
          };
          return product;
        });

      if (!cancelled) {
        setProducts(mapped);
        setRankByFarmer(
          new Map((farmers ?? []).map((f) => [f.id, farmerRank(f.activity_score, f.initial_score)])),
        );
        setOriginalPrices(new Map(rows.map((r) => [r.id, Number(r.client_price)])));
        registerStock(mapped.map((p) => ({ id: p.id, quantity: p.stock })));
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [registerStock]);

  // Simulate filtering by location — in a real app this would use geolocation
  const filtered = useMemo(() => {
    let result = [...products];

    if (location) {
      const q = location.toLowerCase();
      result = result.filter(
        (p) =>
          p.location.toLowerCase().includes(q) ||
          p.farmer.toLowerCase().includes(q)
      );
      // If no exact matches, show all (simulating "nearby")
      if (result.length === 0) result = [...products];
    }

    const rank = (p: Product) => rankByFarmer.get(p.farmerId ?? "") ?? 0;

    switch (sort) {
      case "relevancia":
        result.sort((a, b) => rank(b) - rank(a));
        break;
      case "mais-avaliado":
        result.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
        break;
      case "menos-avaliado":
        result.sort((a, b) => a.rating - b.rating || a.reviews - b.reviews);
        break;
      case "preco-maior":
        result.sort((a, b) => b.price - a.price);
        break;
      case "preco-menor":
        result.sort((a, b) => a.price - b.price);
        break;
    }

    return result;
  }, [products, location, sort, rankByFarmer]);

  return (
    <main className="py-8">
      <div className="container">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("search.backHome")}
        </Link>

        {/* Header */}
        <PageHeader
          title={t("search.title")}
          description={
            location ? (
              <Trans
                t={t}
                i18nKey="search.near"
                values={{ location, radius }}
                components={{ b: <span className="font-semibold text-foreground" /> }}
              />
            ) : (
              t("search.all")
            )
          }
        />

        {/* Sort controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {loading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <p className="text-sm text-muted-foreground">
              <Trans
                t={t}
                i18nKey="search.found"
                count={filtered.length}
                components={{ b: <span className="font-semibold text-foreground" /> }}
              />
            </p>
          )}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>{t(`search.sort.${value}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link
              to="/termos#ordenacao"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              {t("categoryPage.howSort")}
            </Link>
          </div>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" aria-busy={loading}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{ ...p, originalPrice: originalPrices.get(p.id) }}
                  market={marketPrices.get(marketKey(p.name))}
                  showLocation
                />
              ))}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            {t("search.empty")}
          </div>
        )}
      </div>
    </main>
  );
};

export default SearchResults;

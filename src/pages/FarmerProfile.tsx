import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, MapPin, ArrowLeft, CalendarArrowDown, PauseCircle, Eye } from "lucide-react";
import { downloadPickupIcs } from "@/lib/pickup-ical";

import { Button } from "@/components/ui/button";
import { farmers } from "@/data/farmers";
import { getCategoryByName } from "@/data/categories";
import { useAuth } from "@/contexts/AuthContext";
import { useStock } from "@/contexts/StockContext";
import { supabase } from "@/integrations/supabase/client";
import PickupAvailabilityBadge from "@/components/PickupAvailabilityBadge";
import ProductCard, { type ProductCardProduct } from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";
import { useMarketPrices, marketKey } from "@/hooks/useMarketPrices";
import FarmerReviewsBar from "@/components/FarmerReviewsBar";
import FarmerExperiences from "@/components/FarmerExperiences";
import FarmerStays from "@/components/FarmerStays";
import { formatPickupHours, parsePickupHours, type PickupWindow } from "@/lib/pickup-hours";
import { formatReturnDate, isPaused } from "@/lib/farmer-activity";

const FALLBACK_FARM_IMAGE =
  "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&h=500&fit=crop";

interface FarmerDisplay {
  name: string;
  farm: string;
  image: string;
  location: string;
  region: string;
  rating: number;
  reviews: number;
  description: string;
  tags: string[];
  showRating: boolean;
}

const FarmerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [pickupWindows, setPickupWindows] = useState<PickupWindow[]>([]);
  const [pickupNote, setPickupNote] = useState<string>("");
  const [pause, setPause] = useState<{ until: string; note: string } | null>(null);
  const mockFarmer = farmers.find((f) => f.id === id);
  const { registerStock } = useStock();

  const [dbFarmer, setDbFarmer] = useState<FarmerDisplay | null>(null);
  const [dbProducts, setDbProducts] = useState<ProductCardProduct[]>([]);
  const marketPrices = useMarketPrices();
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();
  // O próprio agricultor a ver a sua página: mostra a faixa de pré-visualização.
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!user || !id || mockFarmer) {
      setIsOwner(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("farmer_details")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsOwner(data?.id === id);
      });
    return () => {
      cancelled = true;
    };
  }, [user, id, mockFarmer]);

  // Real farmers created through onboarding live in Supabase and are looked
  // up by UUID; demo farmers in src/data/farmers.ts use slug ids and never
  // match a real product's farmer_id, so we only hit the network when the
  // route id isn't one of the demo farmers.
  useEffect(() => {
    if (!id || mockFarmer) {
      setLoaded(true);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const { data: farmer } = await supabase
        .from("public_farmer_profiles")
        .select("id, company_name, address, description, pickup_hours, pickup_hours_note, paused_until, pause_note")
        .eq("id", id)
        .maybeSingle();
      if (!farmer) {
        if (!cancelled) setLoaded(true);
        return;
      }

      if (!cancelled) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPickupWindows(parsePickupHours((farmer as any).pickup_hours));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPickupNote(((farmer as any).pickup_hours_note as string) ?? "");
        setPause(
          isPaused(farmer.paused_until)
            ? { until: farmer.paused_until as string, note: farmer.pause_note ?? "" }
            : null,
        );
      }

      const { data: rows } = await supabase
        .from("products")
        .select("id, name, unit, client_price, discount_percent, stock_quantity, low_stock_threshold, media_urls, delivery_mode, shipping_days, category, is_organic")
        .eq("farmer_id", id)
        .eq("active", true)
        .gt("stock_quantity", 0);

      // Fotografias num único pedido (bucket privado: URLs assinados por 1 hora).
      const paths = (rows ?? []).map((r) => r.media_urls?.[0]).filter((p): p is string => !!p);
      const signedByPath = new Map<string, string>();
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("product-media").createSignedUrls(paths, 60 * 60);
        for (const s of signed ?? []) if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
      }

      const mapped = (rows ?? []).map((r) => {
          const category = r.category ? getCategoryByName(r.category) : undefined;
          const path = r.media_urls?.[0];
          const image = (path && signedByPath.get(path)) || category?.image || FALLBACK_FARM_IMAGE;
          const product: ProductCardProduct = {
            id: r.id,
            name: r.name,
            farmerId: id,
            farmer: farmer.company_name,
            price: Math.round(r.client_price * (1 - (r.discount_percent ?? 0) / 100) * 100) / 100,
            originalPrice: r.client_price,
            isOrganic: r.is_organic,
            lowStockThreshold: r.low_stock_threshold,
            unit: r.unit,
            category: r.category ?? "",
            image,
            rating: 0,
            reviews: 0,
            location: farmer.address ?? "",
            region: "",
            deliveryMode: r.delivery_mode,
            shippingDays: r.shipping_days ?? undefined,
            stock: r.stock_quantity ?? 0,
          };
          return product;
        });

      if (!cancelled) {
        setDbFarmer({
          name: farmer.company_name,
          farm: farmer.company_name,
          image: FALLBACK_FARM_IMAGE,
          location: farmer.address ?? "",
          region: "",
          rating: 0,
          reviews: 0,
          description: farmer.description ?? "Sem descrição disponível.",
          tags: [...new Set(mapped.map((p) => p.category).filter(Boolean))],
          showRating: false,
        });
        setDbProducts(mapped);
        registerStock(mapped.map((p) => ({ id: p.id, quantity: p.stock })));
        setLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, mockFarmer, registerStock]);

  if (!loaded) return null;

  const display: FarmerDisplay | null = mockFarmer
    ? {
        name: mockFarmer.name,
        farm: mockFarmer.farm,
        image: mockFarmer.image,
        location: mockFarmer.location,
        region: mockFarmer.region,
        rating: mockFarmer.rating,
        reviews: mockFarmer.reviews,
        description: mockFarmer.description,
        tags: mockFarmer.products,
        showRating: true,
      }
    : dbFarmer;

  // Demo farmers no longer have any demo products (the mock catalog was
  // removed); only real Supabase farmers list real products here.
  const farmerProducts = mockFarmer ? [] : dbProducts;

  if (!display) {
    return (
      <main className="py-16 text-center">
        <p className="text-muted-foreground">Agricultor não encontrado.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Voltar ao início</Link>
      </main>
    );
  }

  return (
    <main className="py-8">
      <div className="container">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        {isOwner && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
            <div className="flex items-start gap-3">
              <Eye className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Pré-visualização: é assim que os clientes veem a sua página.</p>
                {pause && (
                  <p className="mt-0.5 text-muted-foreground">
                    A sua quinta está em pausa: os clientes não veem os produtos.
                  </p>
                )}
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/agricultor/informacoes">Editar informações da exploração</Link>
            </Button>
          </div>
        )}

        {/* Hero */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="relative h-56 md:h-72 overflow-hidden">
            <img src={display.image} alt={display.farm} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
            <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
              <h1 className="font-display text-2xl font-bold text-primary-foreground md:text-4xl">{display.farm}</h1>
              <p className="mt-1 text-primary-foreground/80">{display.name}</p>
            </div>
          </div>

          {/* Os agricultores de demonstração não têm encomendas nem avaliações reais. */}
          {id && !mockFarmer && <FarmerReviewsBar farmerId={id} />}

          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-4">
              {(display.location || display.region) && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {[display.location, display.region].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
              {display.showRating && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < Math.floor(display.rating) ? "fill-highlight text-coral" : "text-border"}`} />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{display.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({display.reviews} avaliações)</span>
                </div>
              )}
            </div>

            {pause && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
                <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    Em pausa até {formatReturnDate(pause.until)}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    {pause.note || "Este agricultor não está a aceitar encomendas de momento."}
                  </p>
                </div>
              </div>
            )}

            <p className="mt-4 text-muted-foreground leading-relaxed">{display.description}</p>

            {pickupWindows.length > 0 && (
              <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Porta aberta para levantamentos</span>
                  <PickupAvailabilityBadge windows={pickupWindows} className="mt-0" />
                </div>
                <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                  {formatPickupHours(pickupWindows).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {pickupNote && <p className="mt-2 text-xs text-muted-foreground">{pickupNote}</p>}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2"
                  onClick={() => downloadPickupIcs(pickupWindows, display.farm, pickupNote)}
                >
                  <CalendarArrowDown className="h-4 w-4" />
                  Adicionar ao meu calendário (iCal)
                </Button>
              </div>

            )}

            {display.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {display.tags.map((p) => (
                  <span key={p} className="rounded-full bg-leaf-light px-3 py-1 text-xs font-medium text-kale">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {id && !mockFarmer && <FarmerExperiences farmerId={id} farmName={display.farm} isOwner={isOwner} />}
        {id && !mockFarmer && <FarmerStays farmerId={id} farmName={display.farm} isOwner={isOwner} />}

        {/* Products */}
        <section className="mt-10">
          <SectionHeading title="Produtos disponíveis" description="Produtos frescos diretamente desta exploração." />

          {farmerProducts.length === 0 ? (
            <p className="mt-8 text-center text-muted-foreground">Nenhum produto disponível de momento.</p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {farmerProducts.map((p) => (
                <ProductCard key={p.id} product={p} market={marketPrices.get(marketKey(p.name))} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default FarmerProfile;

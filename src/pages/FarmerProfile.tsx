import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { farmers } from "@/data/farmers";
import { type Product } from "@/data/products";
import { getCategoryByName } from "@/data/categories";
import { useCart } from "@/contexts/CartContext";
import { useStock } from "@/contexts/StockContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PickupAvailabilityBadge from "@/components/PickupAvailabilityBadge";
import { formatPickupHours, parsePickupHours, type PickupWindow } from "@/lib/pickup-hours";

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
  const mockFarmer = farmers.find((f) => f.id === id);
  const { addItem, items: cartItems } = useCart();
  const { registerStock } = useStock();
  const { toast } = useToast();

  const [dbFarmer, setDbFarmer] = useState<FarmerDisplay | null>(null);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

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
        .select("id, company_name, address, description, pickup_hours, pickup_hours_note")
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
      }

      const { data: rows } = await supabase
        .from("products")
        .select("id, name, unit, client_price, discount_percent, stock_quantity, media_urls, delivery_mode, shipping_days, category")
        .eq("farmer_id", id)
        .eq("active", true)
        .gt("stock_quantity", 0);

      const mapped = await Promise.all(
        (rows ?? []).map(async (r) => {
          const category = r.category ? getCategoryByName(r.category) : undefined;
          let image = category?.image ?? FALLBACK_FARM_IMAGE;
          const path = r.media_urls?.[0];
          if (path) {
            const { data: signed } = await supabase.storage
              .from("product-media")
              .createSignedUrl(path, 60 * 60);
            if (signed?.signedUrl) image = signed.signedUrl;
          }
          const product: Product = {
            id: r.id,
            name: r.name,
            farmerId: id,
            farmer: farmer.company_name,
            price: Math.round(r.client_price * (1 - (r.discount_percent ?? 0) / 100) * 100) / 100,
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
        })
      );

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
                      <Star key={i} className={`h-4 w-4 ${i < Math.floor(display.rating) ? "fill-accent text-accent" : "text-border"}`} />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{display.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({display.reviews} avaliações)</span>
                </div>
              )}
            </div>

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
              </div>
            )}

            {display.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {display.tags.map((p) => (
                  <span key={p} className="rounded-full bg-leaf-light px-3 py-1 text-xs font-medium text-primary">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Products */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold text-foreground">Produtos Disponíveis</h2>
          <p className="mt-1 text-sm text-muted-foreground">Produtos frescos diretamente desta exploração.</p>

          {farmerProducts.length === 0 ? (
            <p className="mt-8 text-center text-muted-foreground">Nenhum produto disponível de momento.</p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {farmerProducts.map((p) => {
                const available = p.stock;
                const inCart = cartItems.find((i) => i.id === p.id)?.quantity ?? 0;
                const canAdd = inCart < available;
                return (
                <div key={p.id} className="group overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <div className="relative h-40 overflow-hidden">
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                    <a
                      href={`#stock-${p.id}`}
                      onClick={(e) => e.preventDefault()}
                      className={`mt-1 inline-block text-xs font-medium hover:underline ${available <= 5 ? "text-destructive" : "text-primary"}`}
                      title="Stock definido pelo agricultor"
                    >
                      {available} em stock
                    </a>
                    <p className="mt-2 text-xs font-medium text-primary">
                      {p.deliveryMode === "shipping"
                        ? `Entrega em casa (${p.shippingDays ?? "?"} dias)`
                        : p.deliveryMode === "both"
                        ? `Levantamento ou entrega em casa (${p.shippingDays ?? "?"} dias)`
                        : "Apenas levantamento na propriedade"}
                    </p>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <span className="text-lg font-bold text-primary">{p.price.toFixed(2)}€</span>
                        <span className="text-xs text-muted-foreground">/{p.unit}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canAdd}
                        onClick={() => {
                          addItem(p);
                          toast({ title: "Adicionado ao carrinho", description: p.name });
                        }}
                      >
                        {canAdd ? "Adicionar" : "Sem stock"}
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default FarmerProfile;

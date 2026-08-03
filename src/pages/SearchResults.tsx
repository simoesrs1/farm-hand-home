import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { MapPin, ArrowLeft, ArrowUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Product } from "@/data/products";
import { getCategoryByName } from "@/data/categories";
import { useCart } from "@/contexts/CartContext";
import { useStock } from "@/contexts/StockContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=400&fit=crop";

type SortOption = "mais-avaliado" | "menos-avaliado" | "preco-maior" | "preco-menor";

const sortLabels: Record<SortOption, string> = {
  "mais-avaliado": "Mais avaliado",
  "menos-avaliado": "Menos avaliado",
  "preco-maior": "Preço maior",
  "preco-menor": "Preço menor",
};

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem, items: cartItems } = useCart();
  const { registerStock } = useStock();
  const { toast } = useToast();
  const location = searchParams.get("location") || "";
  const radius = searchParams.get("radius") || "25";
  const sort = (searchParams.get("sort") as SortOption) || "mais-avaliado";

  const [products, setProducts] = useState<Product[]>([]);

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
        if (!cancelled) setProducts([]);
        return;
      }

      const farmerIds = [...new Set(rows.map((r) => r.farmer_id))];
      const { data: farmers } = await supabase
        .from("public_farmer_profiles")
        .select("id, company_name, address")
        .in("id", farmerIds);
      const farmerById = new Map((farmers ?? []).map((f) => [f.id, f]));

      const mapped = await Promise.all(
        rows.map(async (r) => {
          const farmer = farmerById.get(r.farmer_id);
          const category = r.category ? getCategoryByName(r.category) : undefined;
          let image = category?.image ?? FALLBACK_IMAGE;
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
            farmerId: r.farmer_id,
            farmer: farmer?.company_name ?? "Agricultor",
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
            stock: r.stock_quantity ?? 0,
          };
          return product;
        })
      );

      if (!cancelled) {
        setProducts(mapped);
        registerStock(mapped.map((p) => ({ id: p.id, quantity: p.stock })));
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

    switch (sort) {
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
  }, [products, location, sort]);

  return (
    <main className="py-8">
      <div className="container">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Resultados da Pesquisa</h1>
          <p className="mt-2 text-muted-foreground">
            {location ? (
              <>Produtos disponíveis perto de <span className="font-semibold text-foreground">{location}</span> num raio de <span className="font-semibold text-foreground">{radius} km</span></>
            ) : (
              "Todos os produtos disponíveis na plataforma"
            )}
          </p>
        </div>

        {/* Sort controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> produto{filtered.length !== 1 && "s"} encontrado{filtered.length !== 1 && "s"}
          </p>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sortLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => {
            const available = p.stock;
            const inCart = cartItems.find((i) => i.id === p.id)?.quantity ?? 0;
            const canAdd = inCart < available;
            return (
            <div key={p.id} className="group overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
              <div className="relative h-40 overflow-hidden">
                <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {p.location && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
                    <MapPin className="h-3 w-3 text-primary" />
                    {p.location}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                <Link to={`/agricultor/${p.farmerId}`} className="text-xs text-primary hover:underline">{p.farmer}</Link>
                <Link
                  to={`/agricultor/${p.farmerId}`}
                  className={`mt-1 block text-xs font-medium hover:underline ${available <= 5 ? "text-destructive" : "text-primary"}`}
                  title="Stock definido pelo agricultor"
                >
                  {available} em stock
                </Link>
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

        {filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            Nenhum produto encontrado para esta localização.
          </div>
        )}
      </div>
    </main>
  );
};

export default SearchResults;

import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Star, MapPin, ArrowLeft, ArrowUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { products } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

type SortOption = "mais-avaliado" | "menos-avaliado" | "preco-maior" | "preco-menor";

const sortLabels: Record<SortOption, string> = {
  "mais-avaliado": "Mais avaliado",
  "menos-avaliado": "Menos avaliado",
  "preco-maior": "Preço maior",
  "preco-menor": "Preço menor",
};

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();
  const { toast } = useToast();
  const location = searchParams.get("location") || "";
  const radius = searchParams.get("radius") || "25";
  const sort = (searchParams.get("sort") as SortOption) || "mais-avaliado";

  const handleSortChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sort", value);
    setSearchParams(newParams);
  };

  // Simulate filtering by location — in a real app this would use geolocation
  const filtered = useMemo(() => {
    let result = [...products];

    // If a location is provided, prioritize products from matching regions/locations
    if (location) {
      const q = location.toLowerCase();
      result = result.filter(
        (p) =>
          p.location.toLowerCase().includes(q) ||
          p.region.toLowerCase().includes(q) ||
          p.farmer.toLowerCase().includes(q)
      );
      // If no exact matches, show all (simulating "nearby")
      if (result.length === 0) result = [...products];
    }

    // Sort
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
  }, [location, sort]);

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
          {filtered.map((p) => (
            <div key={p.id} className="group overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
              <div className="relative h-40 overflow-hidden">
                <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
                  <MapPin className="h-3 w-3 text-primary" />
                  {p.location}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                <Link to={`/agricultor/${p.farmerId}`} className="text-xs text-primary hover:underline">{p.farmer}</Link>
                <div className="mt-1.5 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  <span className="text-xs font-medium text-foreground">{p.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({p.reviews})</span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <span className="text-lg font-bold text-primary">{p.price.toFixed(2)}€</span>
                    <span className="text-xs text-muted-foreground">/{p.unit}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => {
                      addItem(p);
                      toast({ title: "Adicionado ao carrinho", description: p.name });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          ))}
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

import { useState } from "react";
import { Search, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { products } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

const categories = ["Todos", "Hortícolas", "Frutas", "Biológicos", "Azeite", "Mel", "Queijos", "Ovos", "Ervas"];

const Catalog = () => {
  const [active, setActive] = useState("Todos");
  const [search, setSearch] = useState("");
  const { addItem } = useCart();
  const { toast } = useToast();

  const filtered = products.filter((p) => {
    const matchCat = active === "Todos" || p.category === active;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <main className="py-12">
      <div className="container">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Catálogo</h1>
          <p className="mt-2 text-muted-foreground">Explore produtos frescos diretamente dos nossos agricultores.</p>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar produtos..."
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="text-xs font-medium">Filtros:</span>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
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
                <p className="text-xs text-muted-foreground">{p.farmer}</p>
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
            Nenhum produto encontrado.
          </div>
        )}
      </div>
    </main>
  );
};

export default Catalog;

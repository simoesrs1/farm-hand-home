import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = ["Todos", "Hortícolas", "Frutas", "Biológicos", "Azeite", "Mel", "Queijos", "Ovos", "Ervas"];

const products = [
  { name: "Tomates Biológicos", farmer: "Quinta do Vale Verde", price: "3.50", unit: "kg", category: "Biológicos", image: "https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=400&h=300&fit=crop" },
  { name: "Laranjas do Algarve", farmer: "Pomar da Serra", price: "2.80", unit: "kg", category: "Frutas", image: "https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=300&fit=crop" },
  { name: "Azeite Extra Virgem", farmer: "Monte Alentejano", price: "8.90", unit: "L", category: "Azeite", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=300&fit=crop" },
  { name: "Mel de Rosmaninho", farmer: "Horta da Avó Maria", price: "7.50", unit: "500g", category: "Mel", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop" },
  { name: "Alface Frisada", farmer: "Terras do Minho", price: "1.20", unit: "un", category: "Hortícolas", image: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=300&fit=crop" },
  { name: "Ovos de Campo", farmer: "Terras do Minho", price: "3.00", unit: "dúzia", category: "Ovos", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop" },
  { name: "Queijo de Cabra", farmer: "Jardins do Douro", price: "6.50", unit: "300g", category: "Queijos", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop" },
  { name: "Manjericão Fresco", farmer: "Quinta do Vale Verde", price: "1.50", unit: "molho", category: "Ervas", image: "https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=400&h=300&fit=crop" },
];

const Catalog = () => {
  const [active, setActive] = useState("Todos");
  const [search, setSearch] = useState("");

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

        {/* Search & Filters */}
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

        {/* Category pills */}
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

        {/* Products grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => (
            <div
              key={p.name}
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
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <span className="text-lg font-bold text-primary">{p.price}€</span>
                    <span className="text-xs text-muted-foreground">/{p.unit}</span>
                  </div>
                  <Button size="sm" variant="outline">
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

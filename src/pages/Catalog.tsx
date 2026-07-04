import { useMemo, useState } from "react";
import { Search, Filter, Plus, ArrowUpDown, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { products } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

const categories = ["Todos", "Hortícolas", "Frutas", "Biológico", "Azeite", "Derivados", "Carne"];

type SortKey = "az" | "price-asc" | "price-desc";

const sortLabels: Record<SortKey, string> = {
  az: "A a Z",
  "price-asc": "Preço: menor para maior",
  "price-desc": "Preço: maior para menor",
};

const Catalog = () => {
  const [active, setActive] = useState("Todos");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("az");
  const { addItem } = useCart();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      const matchCat = active === "Todos" || p.category === active;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
    const sorted = [...list];
    if (sort === "az") sorted.sort((a, b) => a.name.localeCompare(b.name, "pt"));
    else if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    return sorted;
  }, [active, search, sort]);

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

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Tag className="h-4 w-4" />
                  {active === "Todos" ? "Categorias" : active}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Tipos de produto</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={active} onValueChange={setActive}>
                  {categories.map((cat) => (
                    <DropdownMenuRadioItem key={cat} value={cat}>
                      {cat}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowUpDown className="h-4 w-4" />
                  Ordenar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <DropdownMenuRadioItem value="az">A a Z</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price-desc">Preço: maior para menor</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price-asc">Preço: menor para maior</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="ml-1 hidden items-center gap-1.5 text-muted-foreground sm:flex">
              <Filter className="h-4 w-4" />
              <span className="text-xs">{sortLabels[sort]}</span>
            </div>
          </div>
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

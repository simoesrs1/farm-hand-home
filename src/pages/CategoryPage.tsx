import { useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { products } from "@/data/products";
import { getCategoryBySlug } from "@/data/categories";
import { useCart } from "@/contexts/CartContext";
import { useStock } from "@/contexts/StockContext";
import { useToast } from "@/hooks/use-toast";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const category = slug ? getCategoryBySlug(slug) : undefined;
  const { addItem, items: cartItems } = useCart();
  const { getAvailable } = useStock();
  const { toast } = useToast();

  const items = useMemo(() => {
    if (!category) return [];
    const name = category.name.toLowerCase();
    return products
      .filter((p) => p.category.toLowerCase() === name)
      .filter((p) => getAvailable(p.id) > 0);
  }, [category, getAvailable]);

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

        <div className="mb-8 overflow-hidden rounded-xl border border-border">
          <div className="relative h-40 sm:h-56">
            <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <h1 className="absolute bottom-4 left-5 font-display text-3xl font-bold text-white md:text-4xl">
              {category.name}
            </h1>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            Ainda não há produtos nesta categoria.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((p) => {
              const available = getAvailable(p.id);
              const inCart = cartItems.find((i) => i.id === p.id)?.quantity ?? 0;
              const canAdd = inCart < available;
              return (
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
                    <Link
                      to={`/agricultor/${p.farmerId}`}
                      className={`mt-1 inline-block text-xs font-medium hover:underline ${available <= 5 ? "text-destructive" : "text-primary"}`}
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
        )}
      </div>
    </main>
  );
};

export default CategoryPage;

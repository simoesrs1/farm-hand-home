import { useParams, Link } from "react-router-dom";
import { Star, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { farmers } from "@/data/farmers";
import { products } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

const FarmerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const farmer = farmers.find((f) => f.id === id);
  const { addItem } = useCart();
  const { toast } = useToast();

  if (!farmer) {
    return (
      <main className="py-16 text-center">
        <p className="text-muted-foreground">Agricultor não encontrado.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Voltar ao início</Link>
      </main>
    );
  }

  const farmerProducts = products.filter((p) => p.farmerId === farmer.id);

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
            <img src={farmer.image} alt={farmer.farm} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
            <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
              <h1 className="font-display text-2xl font-bold text-primary-foreground md:text-4xl">{farmer.farm}</h1>
              <p className="mt-1 text-primary-foreground/80">{farmer.name}</p>
            </div>
          </div>

          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">{farmer.location}, {farmer.region}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.floor(farmer.rating) ? "fill-accent text-accent" : "text-border"}`} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-foreground">{farmer.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({farmer.reviews} avaliações)</span>
              </div>
            </div>

            <p className="mt-4 text-muted-foreground leading-relaxed">{farmer.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {farmer.products.map((p) => (
                <span key={p} className="rounded-full bg-leaf-light px-3 py-1 text-xs font-medium text-primary">
                  {p}
                </span>
              ))}
            </div>
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
              {farmerProducts.map((p) => (
                <div key={p.id} className="group overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <div className="relative h-40 overflow-hidden">
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                    <div className="mt-1 flex items-center gap-1">
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
                        onClick={() => {
                          addItem(p);
                          toast({ title: "Adicionado ao carrinho", description: p.name });
                        }}
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default FarmerProfile;

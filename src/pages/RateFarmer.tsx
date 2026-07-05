import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface FarmerInfo {
  id: string;
  company_name: string | null;
  pickup_address: string | null;
}

const RateFarmer = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [farmer, setFarmer] = useState<FarmerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !orderId) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("farmer:farmer_id(id,company_name,pickup_address)")
        .eq("id", orderId)
        .maybeSingle();
      setFarmer(((data as { farmer: FarmerInfo | null })?.farmer) ?? null);
      setLoading(false);
    })();
  }, [user, orderId]);

  const submit = async () => {
    if (rating === 0) {
      toast({ title: "Escolhe uma avaliação", description: "Seleciona de 1 a 5 estrelas.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    // Placeholder: persistência das avaliações requer uma tabela dedicada.
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    toast({ title: "Avaliação enviada", description: "Obrigado pelo teu feedback!" });
    navigate("/encomendas");
  };

  if (!user) {
    return (
      <main className="container py-16 text-center">
        <p className="text-muted-foreground">Inicia sessão para avaliar.</p>
      </main>
    );
  }

  return (
    <main className="container max-w-xl py-8">
      <Link to="/encomendas" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> As minhas encomendas
      </Link>

      <h1 className="mb-2 font-display text-3xl font-bold text-foreground">Avaliar agricultor</h1>
      {loading ? (
        <Skeleton className="h-6 w-48" />
      ) : (
        <p className="mb-8 text-muted-foreground">
          {farmer?.company_name ?? "Quinta"}{farmer?.pickup_address ? ` · ${farmer.pickup_address}` : ""}
        </p>
      )}

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-3 text-sm font-medium text-foreground">A tua avaliação</p>
        <div className="mb-6 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="transition-transform hover:scale-110"
                aria-label={`${n} estrelas`}
              >
                <Star className={`h-9 w-9 ${active ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              </button>
            );
          })}
        </div>

        <label className="mb-2 block text-sm font-medium text-foreground">Comentário (opcional)</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conta como foi a tua experiência com este agricultor..."
          rows={5}
        />

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/encomendas")}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "A enviar..." : "Enviar avaliação"}
          </Button>
        </div>
      </div>
    </main>
  );
};

export default RateFarmer;

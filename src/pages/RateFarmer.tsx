import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { reviewContext, type ReviewableOrder } from "@/lib/review-eligibility";
import { avatarPublicUrl, isStoredAvatar } from "@/lib/avatar";

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
  // Motivo para não mostrar o formulário (null = pode avaliar).
  const [blocked, setBlocked] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);

  useEffect(() => {
    if (!user || !orderId) return;
    (async () => {
      const [{ data }, { data: reviews }, { data: myProfile }] = await Promise.all([
        supabase
          .from("orders")
          .select("status,delivery_address,expected_delivery_at,pickup_deadline,farmer:farmer_id(id,company_name,pickup_address)")
          .eq("id", orderId)
          .maybeSingle(),
        supabase.rpc("my_order_reviews"),
        supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle(),
      ]);
      setPhotoPath(isStoredAvatar(myProfile?.avatar_url) ? myProfile.avatar_url : null);
      const order = data as unknown as (ReviewableOrder & { farmer: FarmerInfo | null }) | null;
      setFarmer(order?.farmer ?? null);
      if (!order) setBlocked("Encomenda não encontrada.");
      else if ((reviews ?? []).some((r) => r.order_id === orderId)) setBlocked("Esta encomenda já foi avaliada.");
      else if (!reviewContext(order)) {
        setBlocked("Podes avaliar depois de receberes a encomenda, se o agricultor a cancelar ou se a entrega se atrasar mais de 24 horas.");
      }
      setLoading(false);
    })();
  }, [user, orderId]);

  const submit = async () => {
    if (rating === 0) {
      toast({ title: "Escolhe uma avaliação", description: "Seleciona de 1 a 5 estrelas.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_farmer_review", {
      p_order_id: orderId as string,
      p_rating: rating,
      p_comment: comment,
      p_show_photo: !!photoPath && showPhoto,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Não foi possível enviar", description: error.message, variant: "destructive" });
      return;
    }
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

      {blocked ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">{blocked}</p>
      ) : !loading && (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-3 text-sm font-medium text-foreground">A tua avaliação</p>
        <p className="mb-3 text-xs text-muted-foreground">Depois de enviada, a avaliação não pode ser alterada.</p>
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

        {photoPath && (
          <label htmlFor="show-photo" className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
            <Checkbox id="show-photo" checked={showPhoto} onCheckedChange={(v) => setShowPhoto(v === true)} />
            <img src={avatarPublicUrl(photoPath)} alt="" className="h-9 w-9 rounded-full object-cover" />
            <span className="text-sm text-foreground">
              Autorizo mostrar a minha fotografia nesta avaliação
              <span className="block text-xs text-muted-foreground">
                Fica visível para todos. Podes retirar a autorização em As minhas encomendas.
              </span>
            </span>
          </label>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/encomendas")}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "A enviar..." : "Enviar avaliação"}
          </Button>
        </div>
      </div>
      )}
    </main>
  );
};

export default RateFarmer;

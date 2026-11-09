import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { REVIEW_CONTEXT_LABELS, type ReviewContext } from "@/lib/review-eligibility";
import { avatarPublicUrl, isStoredAvatar } from "@/lib/avatar";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  reviewer_photo_path: string | null;
  context: string;
  created_at: string;
}

const RECENT_LIMIT = 10;
// Mínimo de cartões por volta, para a faixa nunca ficar com um espaço vazio.
const MIN_CARDS_PER_LOOP = 8;
const SECONDS_PER_CARD = 8;

const Stars = ({ value }: { value: number }) => (
  <div className="flex items-center gap-0.5" aria-label={`${value} em 5 estrelas`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < Math.round(value) ? "fill-accent text-accent" : "text-border"}`} />
    ))}
  </div>
);

const ReviewCard = ({ review, clamp = false }: { review: Review; clamp?: boolean }) => {
  const label = REVIEW_CONTEXT_LABELS[review.context as ReviewContext];
  return (
    <div className="h-full rounded-xl border border-border bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <Stars value={review.rating} />
        <span className="text-xs text-muted-foreground">
          {new Date(review.created_at).toLocaleDateString("pt-PT")}
        </span>
      </div>
      {review.comment && (
        <p className={`mt-2 break-words text-sm text-foreground ${clamp ? "line-clamp-4" : ""}`}>{review.comment}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {isStoredAvatar(review.reviewer_photo_path) && (
          <img
            src={avatarPublicUrl(review.reviewer_photo_path)}
            alt=""
            loading="lazy"
            className="h-7 w-7 rounded-full object-cover"
          />
        )}
        <span className="text-xs font-medium text-muted-foreground">{review.reviewer_name}</span>
        {label && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{label}</span>
        )}
      </div>
    </div>
  );
};

/** Barra de avaliações do perfil público do agricultor. */
const FarmerReviewsBar = ({ farmerId }: { farmerId: string }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("farmer_reviews")
        .select("id, rating, comment, reviewer_name, reviewer_photo_path, context, created_at")
        .eq("farmer_id", farmerId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setReviews(data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [farmerId]);

  const average = useMemo(
    () => (reviews.length ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0),
    [reviews],
  );

  // A animação recua metade da faixa, por isso cada volta aparece duas vezes.
  const recent = useMemo(() => reviews.slice(0, RECENT_LIMIT), [reviews]);
  const track = useMemo(() => {
    if (recent.length === 0) return [];
    const repeats = Math.ceil(MIN_CARDS_PER_LOOP / recent.length);
    const loop = Array.from({ length: repeats }, () => recent).flat();
    return [...loop, ...loop];
  }, [recent]);

  return (
    <section aria-label="Avaliações dos clientes" className="border-b border-border p-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Avaliações dos clientes</h2>
          {reviews.length > 0 && (
            <>
              <Stars value={average} />
              <span className="text-sm font-semibold text-foreground">{average.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({reviews.length})</span>
            </>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAllOpen(true)}>
          Ver todas
        </Button>
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-24 w-full" />
      ) : reviews.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Ainda sem avaliações.</p>
      ) : (
        // Com "reduzir movimento" ativo, a faixa fica parada e sem repetições.
        <div className="mt-3 overflow-hidden pb-2 motion-reduce:overflow-x-auto">
          <ul
            className="flex w-max animate-reviews-marquee hover:[animation-play-state:paused] motion-reduce:animate-none"
            style={{ animationDuration: `${(track.length / 2) * SECONDS_PER_CARD}s` }}
          >
            {track.map((r, i) => {
              const repeated = i >= recent.length;
              return (
                <li
                  key={`${r.id}-${i}`}
                  aria-hidden={repeated || undefined}
                  className={`w-64 shrink-0 pr-3 ${repeated ? "motion-reduce:hidden" : ""}`}
                >
                  <ReviewCard review={r} clamp />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Avaliações dos clientes</DialogTitle>
            <DialogDescription>Avaliações de quem comprou a este agricultor na plataforma.</DialogDescription>
          </DialogHeader>
          {reviews.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Ainda sem avaliações.</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id}>
                  <ReviewCard review={r} />
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default FarmerReviewsBar;

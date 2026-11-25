import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { reviewContext, type ReviewableOrder } from "@/lib/review-eligibility";
import { avatarPublicUrl, isStoredAvatar } from "@/lib/avatar";
import { useTranslation } from "react-i18next";
import { COIN_RULES } from "@/lib/coins";

interface FarmerInfo {
  id: string;
  company_name: string | null;
  pickup_address: string | null;
}

const RateFarmer = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation(["orders", "common", "account"]);
  const [farmer, setFarmer] = useState<FarmerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Motivo para não mostrar o formulário (null = pode avaliar).
  const [blocked, setBlocked] = useState<"notFound" | "alreadyRated" | "notYet" | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  // Só as avaliações de encomendas entregues dão coins (award_review_coins).
  const [earnsCoins, setEarnsCoins] = useState(false);

  useEffect(() => {
    if (!user || !orderId) return;
    (async () => {
      const [{ data }, { data: reviews }, { data: myProfile }] = await Promise.all([
        supabase
          .from("orders")
          .select("status,delivery_address,expected_delivery_at,pickup_deadline,cancelled_by,farmer:farmer_id(id,company_name,pickup_address)")
          .eq("id", orderId)
          .maybeSingle(),
        supabase.rpc("my_order_reviews"),
        supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle(),
      ]);
      setPhotoPath(isStoredAvatar(myProfile?.avatar_url) ? myProfile.avatar_url : null);
      const order = data as unknown as (ReviewableOrder & { farmer: FarmerInfo | null }) | null;
      setFarmer(order?.farmer ?? null);
      if (!order) setBlocked("notFound");
      else if ((reviews ?? []).some((r) => r.order_id === orderId)) setBlocked("alreadyRated");
      else if (!reviewContext(order)) setBlocked("notYet");
      setEarnsCoins(!!order && reviewContext(order) === "delivered");
      setLoading(false);
    })();
  }, [user, orderId]);

  const submit = async () => {
    if (rating === 0) {
      toast({ title: t("rate.chooseRating"), description: t("rate.chooseRatingText"), variant: "destructive" });
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
      toast({ title: t("rate.sendFailed"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("rate.sent"), description: t("rate.sentText") });
    navigate("/encomendas");
  };

  if (!user) {
    return (
      <main className="container py-16 text-center">
        <p className="text-muted-foreground">{t("rate.loginPrompt")}</p>
      </main>
    );
  }

  return (
    <main className="container max-w-xl py-8">
      <Link to="/encomendas" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("my.title")}
      </Link>

      <PageHeader className="mb-2" eyebrow={t("account:myAccount")} title={t("review.rate")} />
      {loading ? (
        <Skeleton className="h-6 w-48" />
      ) : (
        <p className="mb-8 text-muted-foreground">
          {farmer?.company_name ?? t("my.farmFallback")}{farmer?.pickup_address ? ` · ${farmer.pickup_address}` : ""}
        </p>
      )}

      {blocked ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">{t(`rate.blocked.${blocked}`)}</p>
      ) : !loading && (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-3 text-sm font-medium text-foreground">{t("rate.yourRating")}</p>
        <p className="mb-3 text-xs text-muted-foreground">{t("rate.final")}</p>
        {earnsCoins && (
          <p className="mb-3 text-xs text-primary">{t("account:coins.reviewNote", { n: COIN_RULES.review })}</p>
        )}
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
                aria-label={t("rate.stars", { count: n })}
              >
                <Star className={`h-9 w-9 ${active ? "fill-highlight text-coral" : "text-muted-foreground"}`} />
              </button>
            );
          })}
        </div>

        <label className="mb-2 block text-sm font-medium text-foreground">{t("rate.comment")}</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("rate.commentPlaceholder")}
          rows={5}
        />

        {photoPath && (
          <label htmlFor="show-photo" className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
            <Checkbox id="show-photo" checked={showPhoto} onCheckedChange={(v) => setShowPhoto(v === true)} />
            <img src={avatarPublicUrl(photoPath)} alt="" className="h-9 w-9 rounded-full object-cover" />
            <span className="text-sm text-foreground">
              {t("rate.showPhoto")}
              <span className="block text-xs text-muted-foreground">
                {t("rate.showPhotoHint")}
              </span>
            </span>
          </label>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/encomendas")}>{t("common:actions.cancel")}</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t("report.sending") : t("rate.send")}
          </Button>
        </div>
      </div>
      )}
    </main>
  );
};

export default RateFarmer;

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StayForm, { type StayRow } from "@/components/StayForm";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { BlockedRange } from "@/lib/stay-pricing";

/** Criar (/agricultor/alojamento/novo) ou editar (/agricultor/alojamento/:id/editar). */
const StayEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [stay, setStay] = useState<StayRow | null>(null);
  const [gifts, setGifts] = useState<{ product_id: string; extra_price: number }[]>([]);
  const [blocked, setBlocked] = useState<BlockedRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const { data: farmer } = await supabase.from("farmer_details").select("id").eq("user_id", user.id).maybeSingle();
      setFarmerId(farmer?.id ?? null);
      if (farmer && id) {
        const [{ data: s }, { data: g }, { data: b }] = await Promise.all([
          supabase.from("farm_stays").select("*").eq("id", id).maybeSingle(),
          supabase.from("stay_gifts").select("product_id, extra_price").eq("stay_id", id).order("position"),
          supabase.from("stay_blocked_dates").select("start_date, end_date").eq("stay_id", id).order("start_date"),
        ]);
        if (!s || s.farmer_id !== farmer.id) setNotFound(true);
        else {
          setStay(s);
          setGifts(g ?? []);
          setBlocked(b ?? []);
        }
      }
      setLoading(false);
    })();
  }, [user, authLoading, id, navigate]);

  if (loading) {
    return (
      <div className="container flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!farmerId || notFound) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">{notFound ? "Alojamento não encontrado." : "Complete o registo de agricultor para criar alojamento."}</p>
        <Button className="mt-4" onClick={() => navigate(notFound ? "/agricultor/alojamento" : "/onboarding/agricultor")}>
          {notFound ? "O meu alojamento" : "Completar perfil"}
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <button onClick={() => navigate("/agricultor/alojamento")} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> O meu alojamento
      </button>
      <h1 className="mb-6 font-display text-3xl font-bold text-foreground">{stay ? "Editar alojamento" : "Novo alojamento"}</h1>
      <StayForm farmerId={farmerId} stay={stay} gifts={gifts} blocked={blocked} onSaved={() => navigate("/agricultor/alojamento")} />
    </div>
  );
};

export default StayEditor;

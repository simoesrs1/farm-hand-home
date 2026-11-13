import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BedDouble, Loader2, Pencil, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { StayRow } from "@/components/StayForm";

/** Lista do alojamento do agricultor (/agricultor/alojamento). */
const MyStays = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [stays, setStays] = useState<StayRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: farmer } = await supabase.from("farmer_details").select("id").eq("user_id", user.id).maybeSingle();
    setFarmerId(farmer?.id ?? null);
    if (farmer) {
      const { data } = await supabase
        .from("farm_stays")
        .select("*")
        .eq("farmer_id", farmer.id)
        .order("created_at", { ascending: false });
      setStays(data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    load();
  }, [user, authLoading, navigate, load]);

  const toggleActive = async (stay: StayRow, active: boolean) => {
    const { error } = await supabase.from("farm_stays").update({ active }).eq("id", stay.id);
    if (error) {
      toast({ title: "Não foi possível atualizar", description: error.message, variant: "destructive" });
      return;
    }
    setStays((list) => list.map((s) => (s.id === stay.id ? { ...s, active } : s)));
  };

  if (loading) {
    return (
      <div className="container flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!farmerId) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">Complete o registo de agricultor para criar alojamento.</p>
        <Button className="mt-4" onClick={() => navigate("/onboarding/agricultor")}>Completar perfil</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">O meu alojamento</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quartos e unidades que os clientes podem reservar na sua quinta.</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/agricultor/alojamento/novo">
            <Plus className="h-4 w-4" /> Novo alojamento
          </Link>
        </Button>
      </div>

      {stays.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <BedDouble className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Ainda não criou nenhum alojamento.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {stays.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{s.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{Number(s.base_price).toFixed(2)}€ / noite {s.pricing_mode === "per_person" ? "por pessoa" : "por quarto"}</span>
                  <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {s.units_count} quarto(s)</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> até {s.capacity_per_unit} por quarto</span>
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={s.active} onCheckedChange={(v) => toggleActive(s, v)} aria-label="Alojamento ativo" />
                {s.active ? "Ativo" : "Inativo"}
              </label>
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to={`/agricultor/alojamento/${s.id}/editar`}>
                  <Pencil className="h-4 w-4" /> Editar
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyStays;

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Loader2, Pencil, Plus, Tent, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { ExperienceRow } from "@/components/ExperienceForm";
import { formatDuration } from "@/lib/experience-sessions";

/** Lista das experiências do agricultor (/agricultor/experiencias). */
const MyExperiences = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: farmer } = await supabase.from("farmer_details").select("id").eq("user_id", user.id).maybeSingle();
    setFarmerId(farmer?.id ?? null);
    if (farmer) {
      const { data } = await supabase
        .from("farm_experiences")
        .select("*")
        .eq("farmer_id", farmer.id)
        .order("created_at", { ascending: false });
      setExperiences(data ?? []);
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

  const toggleActive = async (exp: ExperienceRow, active: boolean) => {
    const { error } = await supabase.from("farm_experiences").update({ active }).eq("id", exp.id);
    if (error) {
      toast({ title: "Não foi possível atualizar", description: error.message, variant: "destructive" });
      return;
    }
    setExperiences((list) => list.map((e) => (e.id === exp.id ? { ...e, active } : e)));
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
        <p className="text-muted-foreground">Complete o registo de agricultor para criar experiências.</p>
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
          <h1 className="font-display text-3xl font-bold text-foreground">As minhas experiências</h1>
          <p className="mt-1 text-sm text-muted-foreground">Atividades que os clientes podem reservar na sua quinta.</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/agricultor/experiencias/nova">
            <Plus className="h-4 w-4" /> Nova experiência
          </Link>
        </Button>
      </div>

      {experiences.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <Tent className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Ainda não criou nenhuma experiência.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {experiences.map((exp) => (
            <li key={exp.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{exp.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{Number(exp.base_price).toFixed(2)}€ {exp.pricing_mode === "per_person" ? "por pessoa" : "por grupo"}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDuration(exp.duration_minutes)}</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {exp.min_people}–{exp.max_people} pessoas</span>
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={exp.active} onCheckedChange={(v) => toggleActive(exp, v)} aria-label="Experiência ativa" />
                {exp.active ? "Ativa" : "Inativa"}
              </label>
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to={`/agricultor/experiencias/${exp.id}/editar`}>
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

export default MyExperiences;

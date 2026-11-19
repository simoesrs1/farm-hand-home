import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import ExperienceForm, { type ExperienceRow } from "@/components/ExperienceForm";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

/** Criar (/agricultor/experiencias/nova) ou editar (/agricultor/experiencias/:id/editar). */
const ExperienceEditor = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["farmer", "common"]);
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [experience, setExperience] = useState<ExperienceRow | null>(null);
  const [gifts, setGifts] = useState<{ product_id: string; extra_price: number }[]>([]);
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
        const [{ data: exp }, { data: g }] = await Promise.all([
          supabase.from("farm_experiences").select("*").eq("id", id).maybeSingle(),
          supabase.from("experience_gifts").select("product_id, extra_price").eq("experience_id", id).order("position"),
        ]);
        if (!exp || exp.farmer_id !== farmer.id) setNotFound(true);
        else {
          setExperience(exp);
          setGifts(g ?? []);
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
        <p className="text-muted-foreground">{notFound ? t("editors.experienceNotFound") : t("editors.completeForExperiences")}</p>
        <Button className="mt-4" onClick={() => navigate(notFound ? "/agricultor/experiencias" : "/onboarding/agricultor")}>
          {notFound ? t("common:menu.farmer.myExperiences") : t("editors.completeProfile")}
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <button onClick={() => navigate("/agricultor/experiencias")} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("common:menu.farmer.myExperiences")}
      </button>
      <PageHeader className="mb-6" eyebrow={t("area")} title={experience ? t("editors.editExperience") : t("editors.newExperience")} />
      <ExperienceForm
        farmerId={farmerId}
        experience={experience}
        gifts={gifts}
        onSaved={() => navigate("/agricultor/experiencias")}
      />
    </div>
  );
};

export default ExperienceEditor;

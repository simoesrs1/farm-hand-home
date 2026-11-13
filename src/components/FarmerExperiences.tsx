import { useEffect, useState } from "react";
import { Clock, Tent, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ExperienceRow } from "@/components/ExperienceForm";
import ExperienceDialog from "@/components/ExperienceDialog";
import { formatDuration } from "@/lib/experience-sessions";

interface FarmerExperiencesProps {
  farmerId: string;
  farmName: string;
  isOwner: boolean;
}

/** Secção "Experiências na quinta" do perfil público do agricultor. */
const FarmerExperiences = ({ farmerId, farmName, isOwner }: FarmerExperiencesProps) => {
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<ExperienceRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // O dono também recebe as inativas; aqui mostra-se só o que os clientes veem.
      const { data } = await supabase
        .from("farm_experiences")
        .select("*")
        .eq("farmer_id", farmerId)
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const list = data ?? [];
      setExperiences(list);
      const map: Record<string, string> = {};
      await Promise.all(
        list.map(async (e) => {
          const path = e.media_urls.find((p) => !/\.(mp4|webm|mov)$/i.test(p));
          if (!path) return;
          const { data: signed } = await supabase.storage.from("product-media").createSignedUrl(path, 60 * 60);
          if (signed?.signedUrl) map[e.id] = signed.signedUrl;
        }),
      );
      if (!cancelled) setThumbs(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [farmerId]);

  if (experiences.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold text-foreground">Experiências na quinta</h2>
      <p className="mt-1 text-sm text-muted-foreground">Atividades para viver a quinta por dentro, com um brinde para levar.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {experiences.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setSelected(e)}
            className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-40 items-center justify-center overflow-hidden bg-muted">
              {thumbs[e.id] ? (
                <img src={thumbs[e.id]} alt={e.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <Tent className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground">{e.title}</h3>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDuration(e.duration_minutes)}</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {e.min_people}–{e.max_people}</span>
              </p>
              <p className="mt-3">
                <span className="text-lg font-bold text-primary">{Number(e.base_price).toFixed(2)}€</span>
                <span className="text-xs text-muted-foreground"> {e.pricing_mode === "per_person" ? "/pessoa" : "/grupo"}</span>
              </p>
            </div>
          </button>
        ))}
      </div>
      <ExperienceDialog experience={selected} farmName={farmName} isOwner={isOwner} onOpenChange={(o) => !o && setSelected(null)} />
    </section>
  );
};

export default FarmerExperiences;

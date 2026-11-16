import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ExperienceRow } from "@/components/ExperienceForm";
import ExperienceDialog from "@/components/ExperienceDialog";
import ExperienceCard from "@/components/ExperienceCard";

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
          <ExperienceCard key={e.id} experience={e} thumb={thumbs[e.id]} onClick={() => setSelected(e)} />
        ))}
      </div>
      <ExperienceDialog experience={selected} farmName={farmName} isOwner={isOwner} onOpenChange={(o) => !o && setSelected(null)} />
    </section>
  );
};

export default FarmerExperiences;

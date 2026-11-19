import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StayRow } from "@/components/StayForm";
import StayDialog from "@/components/StayDialog";
import StayCard from "@/components/StayCard";
import { isVideoPath, signMedia } from "@/lib/media-upload";
import { useTranslation } from "react-i18next";

interface FarmerStaysProps {
  farmerId: string;
  farmName: string;
  isOwner: boolean;
}

/** Secção "Alojamento na quinta" do perfil público do agricultor. */
const FarmerStays = ({ farmerId, farmName, isOwner }: FarmerStaysProps) => {
  const [stays, setStays] = useState<StayRow[]>([]);
  const { t } = useTranslation("offerings");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<StayRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // O dono também recebe os inativos; aqui mostra-se só o que os clientes veem.
      const { data } = await supabase
        .from("farm_stays")
        .select("*")
        .eq("farmer_id", farmerId)
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const list = data ?? [];
      setStays(list);
      const firstPhotos = list.map((s) => s.media_urls.find((p) => !isVideoPath(p))).filter((p): p is string => !!p);
      const signed = await signMedia(firstPhotos);
      if (!cancelled) {
        setThumbs(Object.fromEntries(list.map((s) => [s.id, signed[s.media_urls.find((p) => !isVideoPath(p)) ?? ""] ?? ""])));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [farmerId]);

  if (stays.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold text-foreground">{t("farmSections.stays")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("farmSections.staysText")}</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stays.map((s) => (
          <StayCard key={s.id} stay={s} thumb={thumbs[s.id]} onClick={() => setSelected(s)} />
        ))}
      </div>
      <StayDialog stay={selected} farmName={farmName} isOwner={isOwner} onOpenChange={(o) => !o && setSelected(null)} />
    </section>
  );
};

export default FarmerStays;

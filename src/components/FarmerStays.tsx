import { useEffect, useState } from "react";
import { BedDouble, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { StayRow } from "@/components/StayForm";
import StayDialog from "@/components/StayDialog";
import { isVideoPath, signMedia } from "@/lib/media-upload";

interface FarmerStaysProps {
  farmerId: string;
  farmName: string;
  isOwner: boolean;
}

/** Secção "Alojamento na quinta" do perfil público do agricultor. */
const FarmerStays = ({ farmerId, farmName, isOwner }: FarmerStaysProps) => {
  const [stays, setStays] = useState<StayRow[]>([]);
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
      <h2 className="font-display text-2xl font-bold text-foreground">Alojamento na quinta</h2>
      <p className="mt-1 text-sm text-muted-foreground">Durma na quinta e leve um brinde da casa.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stays.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelected(s)}
            className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-40 items-center justify-center overflow-hidden bg-muted">
              {thumbs[s.id] ? (
                <img src={thumbs[s.id]} alt={s.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <BedDouble className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> até {s.capacity_per_unit} por quarto</span>
                <span>mínimo {s.min_nights} noite(s)</span>
              </p>
              <p className="mt-3">
                <span className="text-lg font-bold text-primary">{Number(s.base_price).toFixed(2)}€</span>
                <span className="text-xs text-muted-foreground"> /noite {s.pricing_mode === "per_person" ? "por pessoa" : "por quarto"}</span>
              </p>
            </div>
          </button>
        ))}
      </div>
      <StayDialog stay={selected} farmName={farmName} isOwner={isOwner} onOpenChange={(o) => !o && setSelected(null)} />
    </section>
  );
};

export default FarmerStays;

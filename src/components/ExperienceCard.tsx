import { Clock, MapPin, Tent, Users } from "lucide-react";
import type { ExperienceRow } from "@/components/ExperienceForm";
import { formatDuration } from "@/lib/experience-sessions";
import { formatEuro } from "@/lib/format";

interface ExperienceCardProps {
  experience: ExperienceRow;
  thumb?: string;
  /** Nome da quinta (nas páginas que juntam várias quintas). */
  farmName?: string;
  /** Distância até ao cliente, já formatada. */
  distance?: string;
  onClick: () => void;
}

/** Cartão de uma experiência (perfil da quinta e página Experiências). */
const ExperienceCard = ({ experience: e, thumb, farmName, distance, onClick }: ExperienceCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
  >
    <div className="flex h-40 items-center justify-center overflow-hidden bg-muted">
      {thumb ? (
        <img src={thumb} alt={e.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <Tent className="h-8 w-8 text-muted-foreground" />
      )}
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-foreground">{e.title}</h3>
      {farmName && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> {farmName}
          {distance && ` · ${distance}`}
        </p>
      )}
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDuration(e.duration_minutes)}</span>
        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {e.min_people}–{e.max_people}</span>
      </p>
      <p className="mt-3">
        <span className="font-mono tabular-nums text-lg font-bold text-primary">{formatEuro(Number(e.base_price))}</span>
        <span className="text-xs text-muted-foreground"> {e.pricing_mode === "per_person" ? "/pessoa" : "/grupo"}</span>
      </p>
    </div>
  </button>
);

export default ExperienceCard;

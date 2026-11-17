import { BedDouble, MapPin, Users } from "lucide-react";
import type { StayRow } from "@/components/StayForm";
import { formatEuro } from "@/lib/format";

interface StayCardProps {
  stay: StayRow;
  thumb?: string;
  /** Nome da quinta (nas páginas que juntam várias quintas). */
  farmName?: string;
  /** Distância até ao cliente, já formatada. */
  distance?: string;
  onClick: () => void;
}

/** Cartão de um alojamento (perfil da quinta e página Alojamento). */
const StayCard = ({ stay: s, thumb, farmName, distance, onClick }: StayCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
  >
    <div className="flex h-40 items-center justify-center overflow-hidden bg-muted">
      {thumb ? (
        <img src={thumb} alt={s.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <BedDouble className="h-8 w-8 text-muted-foreground" />
      )}
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-foreground">{s.title}</h3>
      {farmName && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> {farmName}
          {distance && ` · ${distance}`}
        </p>
      )}
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> até {s.capacity_per_unit} por quarto</span>
        <span>mínimo {s.min_nights} noite(s)</span>
      </p>
      <p className="mt-3">
        <span className="font-mono tabular-nums text-lg font-bold text-primary">{formatEuro(Number(s.base_price))}</span>
        <span className="text-xs text-muted-foreground"> /noite {s.pricing_mode === "per_person" ? "por pessoa" : "por quarto"}</span>
      </p>
    </div>
  </button>
);

export default StayCard;

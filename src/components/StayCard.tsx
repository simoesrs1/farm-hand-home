import { BedDouble, MapPin, Users } from "lucide-react";
import type { StayRow } from "@/components/StayForm";
import TranslatedText from "@/components/TranslatedText";
import { formatEuro } from "@/lib/format";
import { useTranslation } from "react-i18next";

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
const StayCard = ({ stay: s, thumb, farmName, distance, onClick }: StayCardProps) => {
  const { t } = useTranslation("offerings");
  return (
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
      <h3 className="font-semibold text-foreground">
        <TranslatedText type="stay" id={s.id} field="title" text={s.title} />
      </h3>
      {farmName && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> {farmName}
          {distance && ` · ${distance}`}
        </p>
      )}
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t("stayCard.capacity", { count: s.capacity_per_unit })}</span>
        <span>{t("stayCard.minNights", { count: s.min_nights })}</span>
      </p>
      <p className="mt-3">
        <span className="font-mono tabular-nums text-lg font-bold text-primary">{formatEuro(Number(s.base_price))}</span>
        <span className="text-xs text-muted-foreground"> {s.pricing_mode === "per_person" ? t("units.perNightPerson") : t("units.perNightRoom")}</span>
      </p>
    </div>
  </button>
  );
};

export default StayCard;

import FarmListings from "@/components/FarmListings";
import StayCard from "@/components/StayCard";
import StayDialog from "@/components/StayDialog";
import type { StayRow } from "@/components/StayForm";

/** Alojamento de todas as quintas (/alojamento). */
const Stays = () => (
  <FarmListings<StayRow>
    table="farm_stays"
    title="Alojamento"
    description="Durma numa quinta agrícola e leve um brinde da casa."
    noun={["alojamento", "alojamentos"]}
    emptyText="Ainda não há alojamento disponível."
    renderCard={(s, extra) => <StayCard stay={s} {...extra} />}
    renderDialog={(selected, farm, isOwner, close) => (
      <StayDialog
        stay={selected}
        farmName={farm?.name ?? "Quinta"}
        farmId={farm?.id}
        isOwner={isOwner}
        onOpenChange={(o) => !o && close()}
      />
    )}
  />
);

export default Stays;

import { useTranslation } from "react-i18next";
import FarmListings from "@/components/FarmListings";
import StayCard from "@/components/StayCard";
import StayDialog from "@/components/StayDialog";
import type { StayRow } from "@/components/StayForm";

/** Alojamento de todas as quintas (/alojamento). */
const Stays = () => {
  const { t } = useTranslation("offerings");
  return (
  <FarmListings<StayRow>
    table="farm_stays"
    title={t("staysPage.title")}
    description={t("staysPage.description")}
    countLabel={(count) => t("staysPage.count", { count })}
    emptyText={t("staysPage.empty")}
    renderCard={(s, extra) => <StayCard stay={s} {...extra} />}
    renderDialog={(selected, farm, isOwner, close) => (
      <StayDialog
        stay={selected}
        farmName={farm?.name || t("listings.farmFallback")}
        farmId={farm?.id}
        isOwner={isOwner}
        onOpenChange={(o) => !o && close()}
      />
    )}
  />
  );
};

export default Stays;

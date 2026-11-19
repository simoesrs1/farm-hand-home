import { useTranslation } from "react-i18next";
import FarmListings from "@/components/FarmListings";
import ExperienceCard from "@/components/ExperienceCard";
import ExperienceDialog from "@/components/ExperienceDialog";
import type { ExperienceRow } from "@/components/ExperienceForm";

/** Experiências de todas as quintas (/experiencias). */
const Experiences = () => {
  const { t } = useTranslation("offerings");
  return (
  <FarmListings<ExperienceRow>
    table="farm_experiences"
    title={t("experiencesPage.title")}
    description={t("experiencesPage.description")}
    countLabel={(count) => t("experiencesPage.count", { count })}
    emptyText={t("experiencesPage.empty")}
    renderCard={(e, extra) => <ExperienceCard experience={e} {...extra} />}
    renderDialog={(selected, farm, isOwner, close) => (
      <ExperienceDialog
        experience={selected}
        farmName={farm?.name || t("listings.farmFallback")}
        farmId={farm?.id}
        isOwner={isOwner}
        onOpenChange={(o) => !o && close()}
      />
    )}
  />
  );
};

export default Experiences;

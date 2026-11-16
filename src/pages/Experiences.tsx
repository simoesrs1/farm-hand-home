import FarmListings from "@/components/FarmListings";
import ExperienceCard from "@/components/ExperienceCard";
import ExperienceDialog from "@/components/ExperienceDialog";
import type { ExperienceRow } from "@/components/ExperienceForm";

/** Experiências de todas as quintas (/experiencias). */
const Experiences = () => (
  <FarmListings<ExperienceRow>
    table="farm_experiences"
    title="Experiências"
    description="Atividades para viver a quinta por dentro, cada uma com um brinde da casa."
    noun={["experiência", "experiências"]}
    emptyText="Ainda não há experiências disponíveis."
    renderCard={(e, extra) => <ExperienceCard experience={e} {...extra} />}
    renderDialog={(selected, farm, isOwner, close) => (
      <ExperienceDialog
        experience={selected}
        farmName={farm?.name ?? "Quinta"}
        farmId={farm?.id}
        isOwner={isOwner}
        onOpenChange={(o) => !o && close()}
      />
    )}
  />
);

export default Experiences;

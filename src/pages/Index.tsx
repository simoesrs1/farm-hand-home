import HeroSection from "@/components/HeroSection";
import SeasonalStrip from "@/components/SeasonalStrip";
import CategoryShowcase from "@/components/CategoryShowcase";
import FeaturedFarmers from "@/components/FeaturedFarmers";
import HowItWorks from "@/components/HowItWorks";
import FarmExperiencesRail from "@/components/FarmExperiencesRail";
import ImpactCounters from "@/components/ImpactCounters";
import FarmerCta from "@/components/FarmerCta";

// Ordem das secções: ver docs/planos/2026-11-16-ui-pagina-inicial-catalogo.md (fase 2).
const Index = () => {
  return (
    <main>
      <HeroSection />
      <SeasonalStrip />
      <CategoryShowcase />
      <FeaturedFarmers />
      <HowItWorks />
      <FarmExperiencesRail />
      <ImpactCounters />
      <FarmerCta />
    </main>
  );
};

export default Index;

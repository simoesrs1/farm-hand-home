import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/hooks/useReveal";
import { useTranslation } from "react-i18next";

/** Apelo aos agricultores: registo na plataforma. */
const FarmerCta = () => {
  const scopeRef = useRef<HTMLElement>(null);
  useReveal(scopeRef, ".farmer-cta");
  const { t } = useTranslation("home");

  return (
    <section ref={scopeRef} className="py-16 md:py-20">
      <div className="container">
        <div className="farmer-cta flex flex-col items-start justify-between gap-6 rounded-3xl bg-kale p-8 text-kale-foreground md:flex-row md:items-center md:p-12">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-kale-foreground/80">{t("farmerCta.eyebrow")}</p>
            <h2 className="mt-2 text-balance font-display text-3xl md:text-4xl">
              {t("farmerCta.title")}
            </h2>
            <p className="mt-3 text-kale-foreground/80">
              {t("farmerCta.text")}
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="shrink-0 gap-2 bg-highlight text-highlight-foreground hover:bg-highlight/90"
          >
            <Link to="/auth?tab=signup">
              {t("farmerCta.button")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FarmerCta;

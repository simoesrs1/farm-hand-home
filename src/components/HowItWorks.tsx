import { useRef } from "react";
import SectionHeading from "@/components/SectionHeading";
import { useReveal } from "@/hooks/useReveal";
import { useTranslation } from "react-i18next";

// A ordem é real (é o percurso de uma encomenda), por isso os passos são numerados.
const STEPS = ["choose", "order", "collect"] as const;

/** "Como funciona": três passos numerados (substitui a grelha de ícones). */
const HowItWorks = () => {
  const scopeRef = useRef<HTMLElement>(null);
  useReveal(scopeRef, ".how-step");
  const { t } = useTranslation("home");

  return (
    <section ref={scopeRef} className="py-16 md:py-20">
      <div className="container">
        <SectionHeading className="mb-10" eyebrow={t("how.eyebrow")} title={t("how.title")} />
        <ol className="grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s} className="how-step border-t-2 border-primary pt-4">
              <span className="font-mono text-4xl font-bold tabular-nums text-primary" aria-hidden>
                {i + 1}
              </span>
              <h3 className="mt-3 font-display text-xl text-foreground">{t(`how.steps.${s}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`how.steps.${s}.text`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorks;

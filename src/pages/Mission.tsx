import PageHeader from "@/components/PageHeader";
import { useTranslation } from "react-i18next";

const SECTIONS = ["mission", "vision", "impact", "sustainability"] as const;

const Mission = () => {
  const { t } = useTranslation("home");
  return (
  <main className="py-16">
    <div className="container max-w-3xl">
      <PageHeader className="mb-0" eyebrow={t("mission.eyebrow")} title={t("mission.title")} />

      {/* Secções com filete a tomate por cima, sem ícones (mesmo padrão da página Sobre) */}
      <div className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <section key={s} className="border-t-2 border-primary pt-4">
            <h2 className="font-display text-xl text-foreground">{t(`mission.sections.${s}.title`)}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(`mission.sections.${s}.text`)}</p>
          </section>
        ))}
      </div>
    </div>
  </main>
  );
};

export default Mission;

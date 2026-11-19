import PageHeader from "@/components/PageHeader";
import { useTranslation } from "react-i18next";

const VALUES = ["sustainability", "community", "trust"] as const;

const About = () => {
  const { t } = useTranslation("home");
  return (
  <main className="py-16">
    <div className="container max-w-3xl">
      <PageHeader className="mb-0" eyebrow={t("about.eyebrow")} title={t("about.title")} />
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        {t("about.p1")}
      </p>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        {t("about.p2")}
      </p>

      {/* Valores: filete a tomate por cima, sem ícones (ver docs/planos, fase 1) */}
      <dl className="mt-12 grid gap-8 md:grid-cols-3">
        {VALUES.map((item) => (
          <div key={item} className="border-t-2 border-primary pt-4">
            <dt className="font-display text-xl text-foreground">{t(`about.values.${item}.title`)}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`about.values.${item}.desc`)}</dd>
          </div>
        ))}
      </dl>
    </div>
  </main>
  );
};

export default About;

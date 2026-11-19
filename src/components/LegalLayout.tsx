import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { LEGAL } from "@/lib/legal";
import { formatDate } from "@/lib/format";
import PageHeader from "./PageHeader";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

/** Um documento legal num idioma: título, introdução e secções. */
export interface LegalDoc {
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}

interface Props {
  /** Versão em português: a original, que prevalece. */
  original: LegalDoc;
  /** Traduções de cortesia por idioma (en, de, es, fr). */
  translations: Partial<Record<string, LegalDoc>>;
}

// O scroll para o topo e para âncoras (ex.: /privacidade#cookies) é feito por
// useScrollOnNavigate, igual para todas as páginas. As secções têm os mesmos
// ids em todos os idiomas, para as âncoras funcionarem em qualquer um.
const LegalLayout = ({ original, translations }: Props) => {
  const { t, i18n } = useTranslation("legal");
  const [showOriginal, setShowOriginal] = useState(false);
  const translated = translations[i18n.resolvedLanguage ?? "pt"];
  const doc = translated && !showOriginal ? translated : original;

  return (
    <main className="py-12 md:py-16">
      <div className="container max-w-5xl">
        <PageHeader
          className="mb-0"
          eyebrow={t("eyebrow")}
          title={doc.title}
          description={t("lastUpdated", { date: formatDate(`${LEGAL.lastUpdated}T12:00:00`, { day: "numeric", month: "long", year: "numeric" }) })}
        />

        {translated && (
          <div className="mt-6 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
            <Languages className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1">{t("courtesy")}</span>
            <button
              type="button"
              onClick={() => setShowOriginal((s) => !s)}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {showOriginal ? t("showTranslation") : t("showOriginal")}
            </button>
          </div>
        )}

        <div className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground" lang={doc === original ? "pt-PT" : undefined}>
          {doc.intro}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]" lang={doc === original ? "pt-PT" : undefined}>
          <nav aria-label={t("toc")} className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">{t("toc")}</p>
              <ol className="space-y-2 border-l border-border">
                {doc.sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="-ml-px block border-l border-transparent pl-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {i + 1}. {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <div className="min-w-0 space-y-10">
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {i + 1}. {s.title}
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5">
                  {s.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default LegalLayout;

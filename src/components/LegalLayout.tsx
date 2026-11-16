import { ReactNode } from "react";
import { LEGAL } from "@/lib/legal";
import PageHeader from "./PageHeader";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface Props {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}

// O scroll para o topo e para âncoras (ex.: /privacidade#cookies) é feito por
// useScrollOnNavigate, igual para todas as páginas.
const LegalLayout = ({ eyebrow, title, intro, sections }: Props) => {
  return (
    <main className="py-12 md:py-16">
      <div className="container max-w-5xl">
        <PageHeader
          className="mb-0"
          eyebrow={eyebrow}
          title={title}
          description={`Última atualização: ${LEGAL.lastUpdated}`}
        />
        <div className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground">{intro}</div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Índice" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Índice</p>
              <ol className="space-y-2 border-l border-border">
                {sections.map((s, i) => (
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
            {sections.map((s, i) => (
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

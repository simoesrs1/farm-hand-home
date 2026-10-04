import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { LEGAL } from "@/lib/legal";

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

const LegalLayout = ({ eyebrow, title, intro, sections }: Props) => {
  const { hash } = useLocation();

  // O React Router não faz scroll para âncoras (ex.: /privacidade#cookies).
  // Adiado para depois do layout, senão o navegador repõe o scroll anterior.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
      else window.scrollTo({ top: 0 });
    }, 50);
    return () => window.clearTimeout(id);
  }, [hash]);

  return (
    <main className="py-12 md:py-16">
      <div className="container max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {LEGAL.lastUpdated}</p>
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

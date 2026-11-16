import { useRef } from "react";
import SectionHeading from "@/components/SectionHeading";
import { useReveal } from "@/hooks/useReveal";

// A ordem é real (é o percurso de uma encomenda), por isso os passos são numerados.
const steps = [
  {
    title: "Escolha perto de si",
    text: "Pesquise pela sua localização e veja o que os agricultores da zona têm à venda esta semana.",
  },
  {
    title: "Encomende à quinta",
    text: "Paga na plataforma e a encomenda vai diretamente para o agricultor, sem intermediários.",
  },
  {
    title: "Levante ou receba em casa",
    text: "Leve o código de levantamento à quinta no horário indicado, ou receba em casa quando o agricultor entrega.",
  },
];

/** "Como funciona": três passos numerados (substitui a grelha de ícones). */
const HowItWorks = () => {
  const scopeRef = useRef<HTMLElement>(null);
  useReveal(scopeRef, ".how-step");

  return (
    <section ref={scopeRef} className="py-16 md:py-20">
      <div className="container">
        <SectionHeading className="mb-10" eyebrow="Como funciona" title="Do campo à sua mesa em três passos" />
        <ol className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="how-step border-t-2 border-primary pt-4">
              <span className="font-mono text-4xl font-bold tabular-nums text-primary" aria-hidden>
                {i + 1}
              </span>
              <h3 className="mt-3 font-display text-xl text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorks;

import PageHeader from "@/components/PageHeader";

const sections = [
  {
    title: "Missão",
    text: "Democratizar o acesso a produtos agrícolas frescos, de qualidade e a preços acessíveis, criando um mercado digital que valoriza o trabalho dos pequenos e médios agricultores portugueses, enquanto oferece aos consumidores uma experiência de compra transparente e de confiança.",
  },
  {
    title: "Visão",
    text: "Ser a principal plataforma de ligação entre produtores e consumidores em Portugal, contribuindo para um sistema alimentar mais justo, sustentável e comunitário.",
  },
  {
    title: "Impacto social",
    text: "Cada transação no ValorRural fortalece a economia local, preserva práticas agrícolas tradicionais e reduz o desperdício alimentar ao encurtar a cadeia de distribuição.",
  },
  {
    title: "Sustentabilidade",
    text: "Ao reduzir intermediários e distâncias de transporte, contribuímos para uma pegada de carbono significativamente menor no setor alimentar.",
  },
];

const Mission = () => (
  <main className="py-16">
    <div className="container max-w-3xl">
      <PageHeader className="mb-0" eyebrow="Missão & Visão" title="O nosso compromisso com a agricultura local" />

      {/* Secções com filete a tomate por cima, sem ícones (mesmo padrão da página Sobre) */}
      <div className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-2">
        {sections.map((s) => (
          <section key={s.title} className="border-t-2 border-primary pt-4">
            <h2 className="font-display text-xl text-foreground">{s.title}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{s.text}</p>
          </section>
        ))}
      </div>
    </div>
  </main>
);

export default Mission;

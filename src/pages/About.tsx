import PageHeader from "@/components/PageHeader";

const values = [
  {
    title: "Sustentabilidade",
    desc: "Reduzimos a pegada ecológica ao eliminar intermediários e grandes cadeias logísticas.",
  },
  {
    title: "Comunidade",
    desc: "Ligamos pessoas reais: consumidores conscientes e produtores dedicados.",
  },
  {
    title: "Confiança",
    desc: "Só quem compra pode avaliar, por isso as avaliações são autênticas e fiáveis.",
  },
];

const About = () => (
  <main className="py-16">
    <div className="container max-w-3xl">
      <PageHeader className="mb-0" eyebrow="Sobre nós" title="A ponte entre o campo e a cidade" />
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        O ValorRural nasceu da vontade de encurtar a distância entre quem produz e quem consome.
        Acreditamos que a agricultura local é o futuro da alimentação sustentável e que cada compra
        direta fortalece não só a economia rural, mas também a confiança entre pessoas.
      </p>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        A nossa plataforma foi desenhada para ser simples, transparente e justa. Cada avaliação é
        verificada por prova de compra. Cada agricultor é um parceiro com rosto e história.
      </p>

      {/* Valores: filete a tomate por cima, sem ícones (ver docs/planos, fase 1) */}
      <dl className="mt-12 grid gap-8 md:grid-cols-3">
        {values.map((item) => (
          <div key={item.title} className="border-t-2 border-primary pt-4">
            <dt className="font-display text-xl text-foreground">{item.title}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</dd>
          </div>
        ))}
      </dl>
    </div>
  </main>
);

export default About;

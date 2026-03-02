import { Leaf, Users, Heart } from "lucide-react";

const About = () => (
  <main className="py-16">
    <div className="container max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent">Sobre nós</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-5xl">
        A ponte entre o campo e a cidade
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        O FarmConnect nasceu da vontade de encurtar a distância entre quem produz e quem consome. 
        Acreditamos que a agricultura local é o futuro da alimentação sustentável — e que cada compra 
        direta fortalece não só a economia rural, mas também a confiança entre pessoas.
      </p>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        A nossa plataforma foi desenhada para ser simples, transparente e justa. Cada avaliação é 
        verificada por prova de compra. Cada agricultor é um parceiro com rosto e história.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {[
          { icon: Leaf, title: "Sustentabilidade", desc: "Reduzimos a pegada ecológica ao eliminar intermediários e grandes cadeias logísticas." },
          { icon: Users, title: "Comunidade", desc: "Conectamos pessoas reais — consumidores conscientes e produtores dedicados." },
          { icon: Heart, title: "Confiança", desc: "O nosso sistema de avaliação por prova de compra garante reviews autênticos e fiáveis." },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-border bg-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mt-4 font-display text-base font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </main>
);

export default About;

import { Target, Eye, TrendingUp, Globe } from "lucide-react";

const Mission = () => (
  <main className="py-16">
    <div className="container max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent">Missão & Visão</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-5xl">
        O nosso compromisso com a agricultura local
      </h1>

      <div className="mt-12 space-y-10">
        <div className="flex gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Missão</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Democratizar o acesso a produtos agrícolas frescos e de qualidade, criando um mercado 
              digital que valoriza o trabalho dos pequenos e médios agricultores portugueses, enquanto 
              oferece aos consumidores uma experiência de compra transparente e de confiança.
            </p>
          </div>
        </div>

        <div className="flex gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Eye className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Visão</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Ser a principal plataforma de ligação entre produtores e consumidores em Portugal, 
              contribuindo para um sistema alimentar mais justo, sustentável e comunitário.
            </p>
          </div>
        </div>

        <div className="flex gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Impacto Social</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Cada transação no FarmConnect fortalece a economia local, preserva práticas agrícolas 
              tradicionais e reduz o desperdício alimentar ao encurtar a cadeia de distribuição.
            </p>
          </div>
        </div>

        <div className="flex gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Sustentabilidade</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Ao reduzir intermediários e distâncias de transporte, contribuímos para uma pegada 
              de carbono significativamente menor no setor alimentar.
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
);

export default Mission;

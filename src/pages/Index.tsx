import HeroSection from "@/components/HeroSection";
import FeaturedFarmers from "@/components/FeaturedFarmers";
import { ShieldCheck, Truck, Star } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Avaliações Verificadas",
    description: "Só quem compra pode avaliar — garantimos transparência total.",
  },
  {
    icon: Truck,
    title: "Proximidade Real",
    description: "Encontre produtores num raio à sua escolha com geolocalização.",
  },
  {
    icon: Star,
    title: "Qualidade Garantida",
    description: "Agricultores do país, classificados pela comunidade..",
  },
];

const Index = () => {
  return (
    <main>
      <HeroSection />

      {/* Value props */}
      <section className="border-b border-border bg-card py-12">
        <div className="container grid gap-8 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <FeaturedFarmers />
    </main>
  );
};

export default Index;

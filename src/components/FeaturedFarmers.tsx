import FarmerCard from "./FarmerCard";
import { farmers } from "@/data/farmers";

const FeaturedFarmers = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Destaques
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
            Agricultores Melhor Classificados
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Conheça os produtores com as melhores avaliações verificadas por compra em todo o país.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {farmers.map((farmer) => (
            <FarmerCard key={farmer.id} {...farmer} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedFarmers;

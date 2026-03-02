import FarmerCard from "./FarmerCard";

const farmers = [
  {
    name: "António Silva",
    farm: "Quinta do Vale Verde",
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=400&fit=crop",
    rating: 4.8,
    reviews: 127,
    location: "Sintra",
    products: ["Hortícolas", "Frutas", "Biológicos"],
  },
  {
    name: "Maria Santos",
    farm: "Horta da Avó Maria",
    image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&h=400&fit=crop",
    rating: 4.9,
    reviews: 89,
    location: "Évora",
    products: ["Frutas", "Mel", "Compotas"],
  },
  {
    name: "João Ferreira",
    farm: "Monte Alentejano",
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=400&fit=crop",
    rating: 4.7,
    reviews: 203,
    location: "Beja",
    products: ["Azeite", "Azeitonas", "Ervas"],
  },
  {
    name: "Clara Oliveira",
    farm: "Jardins do Douro",
    image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&h=400&fit=crop",
    rating: 4.6,
    reviews: 156,
    location: "Vila Real",
    products: ["Vinho", "Uvas", "Queijos"],
  },
  {
    name: "Pedro Rodrigues",
    farm: "Terras do Minho",
    image: "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=600&h=400&fit=crop",
    rating: 4.8,
    reviews: 74,
    location: "Braga",
    products: ["Biológicos", "Hortícolas", "Ovos"],
  },
  {
    name: "Ana Costa",
    farm: "Pomar da Serra",
    image: "https://images.unsplash.com/photo-1595855759920-86582396756a?w=600&h=400&fit=crop",
    rating: 4.5,
    reviews: 98,
    location: "Coimbra",
    products: ["Frutas", "Nozes", "Mel"],
  },
];

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
            <FarmerCard key={farmer.farm} {...farmer} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedFarmers;

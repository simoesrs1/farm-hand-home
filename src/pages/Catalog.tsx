import { Link } from "react-router-dom";
import { categories } from "@/data/categories";

const Catalog = () => {
  return (
    <main className="py-12">
      <div className="container">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Catálogo</h1>
          <p className="mt-2 text-muted-foreground">
            Explore por categoria os produtos frescos dos nossos agricultores.
          </p>
        </div>

        <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/catalogo/${c.slug}`}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="relative h-32 sm:h-40 overflow-hidden">
                <img
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <h2 className="absolute bottom-2 left-3 right-3 text-base sm:text-lg font-semibold text-white drop-shadow">
                  {c.name}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Catalog;

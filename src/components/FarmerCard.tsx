import { Star, MapPin } from "lucide-react";

interface FarmerCardProps {
  name: string;
  farm: string;
  image: string;
  rating: number;
  reviews: number;
  location: string;
  products: string[];
}

const FarmerCard = ({ name, farm, image, rating, reviews, location, products }: FarmerCardProps) => {
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={`Exploração ${farm}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
          <MapPin className="h-3 w-3 text-primary" />
          {location}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg font-semibold text-foreground">{farm}</h3>
        <p className="text-sm text-muted-foreground">{name}</p>
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < Math.floor(rating)
                    ? "fill-accent text-accent"
                    : "text-border"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-foreground">{rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({reviews})</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {products.slice(0, 3).map((p) => (
            <span
              key={p}
              className="rounded-full bg-leaf-light px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FarmerCard;

import { Star, MapPin, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useFavorite } from "@/hooks/useFavorite";
import { cn } from "@/lib/utils";

interface FarmerCardProps {
  id: string;
  /** Linha secundária (ex.: "5 produtos disponíveis"). */
  name: string;
  farm: string;
  image: string;
  /** Sem avaliações (reviews = 0 ou ausente), as estrelas não aparecem. */
  rating?: number;
  reviews?: number;
  location: string;
  products: string[];
}

/** Cartão de agricultor: o mesmo estilo do ProductCard (imagem 4:3, sombra ao passar o rato). */
const FarmerCard = ({ id, name, farm, image, rating = 0, reviews = 0, location, products }: FarmerCardProps) => {
  const { isFavorite, toggle, loading } = useFavorite(id, farm);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  };

  return (
    <Link
      to={`/agricultor/${id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-shadow duration-300 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={image}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
        />
        <button
          type="button"
          onClick={handleFavoriteClick}
          disabled={loading}
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          aria-pressed={isFavorite}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-transform motion-safe:hover:scale-110 disabled:opacity-50"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
            )}
          />
        </button>
        {location && (
          <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
            <MapPin className="h-3 w-3 shrink-0 text-primary" />
            <span className="truncate">{location}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-xl text-foreground">{farm}</h3>
        <p className="text-sm text-muted-foreground">{name}</p>
        {reviews > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${i < Math.floor(rating) ? "fill-highlight text-coral" : "text-border"}`}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-foreground">{rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({reviews})</span>
          </div>
        )}
        {products.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {products.slice(0, 3).map((p) => (
              <Badge key={p} variant="outline" className="font-medium">
                {p}
              </Badge>
            ))}
            {products.length > 3 && (
              <Badge variant="muted" className="font-medium">
                +{products.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default FarmerCard;

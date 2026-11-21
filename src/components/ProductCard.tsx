import { forwardRef, useRef } from "react";
import { Link } from "react-router-dom";
import { MapPin, Navigation, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PickupAvailabilityBadge from "@/components/PickupAvailabilityBadge";
import SavingsBadge from "@/components/SavingsBadge";
import TranslatedText from "@/components/TranslatedText";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { type Product } from "@/data/products";
import { type MarketPrice } from "@/hooks/useMarketPrices";
import { type PickupWindow } from "@/lib/pickup-hours";
import { cn } from "@/lib/utils";
import { formatEuro, formatNumber } from "@/lib/format";
import { deliveryModeLabel } from "@/lib/fulfillment";
import { directionsUrl, formatKm, type LatLng } from "@/lib/geo";
import { gsap } from "@/lib/animation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTranslation } from "react-i18next";


/**
 * "Voar para o cesto": uma cópia da imagem voa até ao ícone do carrinho
 * (elemento com data-cart-target, no Header) e o ícone dá um salto.
 */
const flyToCart = (img: HTMLImageElement) => {
  const target = document.querySelector<HTMLElement>("[data-cart-target]");
  if (!target) return;
  const from = img.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const clone = img.cloneNode() as HTMLImageElement;
  Object.assign(clone.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    objectFit: "cover",
    borderRadius: "12px",
    zIndex: "60",
    pointerEvents: "none",
  });
  clone.setAttribute("aria-hidden", "true");
  document.body.appendChild(clone);
  gsap.to(clone, {
    x: to.left + to.width / 2 - (from.left + from.width / 2),
    y: to.top + to.height / 2 - (from.top + from.height / 2),
    scale: 0.1,
    autoAlpha: 0.7,
    duration: 0.7,
    ease: "power2.in",
    onComplete: () => {
      clone.remove();
      gsap.fromTo(target, { scale: 1 }, { scale: 1.25, duration: 0.15, yoyo: true, repeat: 1, ease: "power1.out" });
    },
  });
};

/** Produto com os dados opcionais que o cartão sabe mostrar. */
export type ProductCardProduct = Product & {
  /** Preço antes do desconto do agricultor. */
  originalPrice?: number;
  isOrganic?: boolean;
  /** Limite a partir do qual o stock aparece como baixo (por defeito 5). */
  lowStockThreshold?: number;
  pickupWindows?: PickupWindow[];
};

interface ProductCardProps {
  product: ProductCardProduct;
  market?: MarketPrice;
  /** Mostra a localização do agricultor sobre a imagem. */
  showLocation?: boolean;
  /** Realça o cartão (ex.: quando se chega por uma notificação com ?produto=). */
  highlighted?: boolean;
  /** Distância à localização de pesquisa, em km (mostrada sobre a imagem). */
  distanceKm?: number | null;
  /** Quinta onde se levanta: mostra o botão "Direções" (Google Maps). */
  directionsTo?: LatLng | null;
  className?: string;
}

const deliveryLabel = (p: Product) => deliveryModeLabel(p.deliveryMode, p.deliveryAvailable !== false);

/**
 * Cartão de produto partilhado (categoria, resultados de pesquisa).
 * O cartão inteiro abre o produto: o nome é a ligação principal e estende-se
 * por cima do cartão; a ligação ao agricultor e o botão ficam por cima dela.
 */
const ProductCard = forwardRef<HTMLElement, ProductCardProps>(
  ({ product: p, market, showLocation = false, highlighted = false, distanceKm, directionsTo, className }, ref) => {
    const { addItem, items: cartItems } = useCart();
    const { toast } = useToast();
    const { t } = useTranslation("catalog");
    const reducedMotion = useReducedMotion();
    const imgRef = useRef<HTMLImageElement>(null);

    const available = p.stock;
    const inCart = cartItems.find((i) => i.id === p.id)?.quantity ?? 0;
    const canAdd = inCart < available;
    const lowStock = available <= (p.lowStockThreshold ?? 5);

    return (
      <article
        ref={ref}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow duration-300 hover:shadow-md focus-within:shadow-md",
          highlighted ? "border-primary ring-2 ring-primary/30 shadow-lg" : "border-border",
          className,
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            ref={imgRef}
            src={p.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
          />
          {p.isOrganic && (
            <Badge variant="organic" className="absolute left-2 top-2">
              {t("product.organic")}
            </Badge>
          )}
          {distanceKm != null && (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-foreground backdrop-blur-sm">
              <MapPin className="h-3 w-3 shrink-0 text-primary" />
              {formatKm(distanceKm)}
            </div>
          )}
          {showLocation && p.location && (
            <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
              <MapPin className="h-3 w-3 shrink-0 text-primary" />
              <span className="truncate">{p.location}</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="font-semibold text-foreground">
            <Link
              to={`/produto/${p.id}`}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              <TranslatedText type="product" id={p.id} field="name" text={p.name} />
            </Link>
          </h3>
          <Link
            to={`/agricultor/${p.farmerId}`}
            className="relative z-10 self-start text-xs font-medium text-kale underline-offset-4 hover:underline"
          >
            {p.farmer}
          </Link>
          {p.reviews > 0 && (
            <span
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground"
              title={t("product.farmerRating")}
            >
              <Star className="h-3 w-3 fill-highlight text-coral" aria-hidden />
              <span className="font-medium text-foreground">{formatNumber(p.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              ({t("product.reviews", { count: p.reviews })})
            </span>
          )}
          <span
            className={cn("mt-1 text-xs font-medium", lowStock ? "text-destructive" : "text-success")}
            title={t("product.stockHint")}
          >
            {t("product.inStock", { count: available })}
          </span>
          {p.pickupWindows && <PickupAvailabilityBadge windows={p.pickupWindows} className="self-start" />}
          <p className="mt-2 text-xs text-muted-foreground">{deliveryLabel(p)}</p>
          {directionsTo && (
            <a
              href={directionsUrl(directionsTo)}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 mt-1 inline-flex items-center gap-1 self-start text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              <Navigation className="h-3 w-3" aria-hidden />
              {t("product.directions")}
            </a>
          )}
          <SavingsBadge price={p.price} originalPrice={p.originalPrice} unit={p.unit} market={market} />

          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <p className="font-mono text-lg font-bold tabular-nums text-foreground">
              {formatEuro(p.price)}
              <span className="text-xs font-normal text-muted-foreground"> /{p.unit}</span>
            </p>
            <Button
              size="sm"
              className="relative z-10 gap-1"
              disabled={!canAdd}
              onClick={() => {
                if (!reducedMotion && imgRef.current) flyToCart(imgRef.current);
                addItem(p);
                toast({ title: t("product.added"), description: p.name });
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {canAdd ? t("product.add") : t("product.outOfStock")}
            </Button>
          </div>
        </div>
      </article>
    );
  },
);
ProductCard.displayName = "ProductCard";

/** Esqueleto com as mesmas proporções do cartão, para não haver saltos (CLS). */
export const ProductCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-border bg-card">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="space-y-2 p-4">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
      <div className="flex items-end justify-between pt-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  </div>
);

export default ProductCard;

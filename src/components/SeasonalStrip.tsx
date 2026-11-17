import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap, useGSAP } from "@/lib/animation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { isInSeason, useHomeProducts, type HomeProduct } from "@/hooks/useHomeProducts";
import { formatEuro } from "@/lib/format";

const monthName = () => new Date().toLocaleDateString("pt-PT", { month: "long" });

const StripItem = ({ p, hidden = false }: { p: HomeProduct; hidden?: boolean }) => (
  <Link
    to={`/produto/${p.id}`}
    aria-hidden={hidden || undefined}
    tabIndex={hidden ? -1 : undefined}
    className="flex shrink-0 items-center gap-3 rounded-full bg-background/70 py-1.5 pl-1.5 pr-4 text-highlight-foreground transition-colors hover:bg-background"
  >
    <img src={p.image} alt="" className="h-9 w-9 rounded-full object-cover" loading="lazy" />
    <span className="whitespace-nowrap text-sm font-semibold">{p.name}</span>
    <span className="whitespace-nowrap font-mono text-sm tabular-nums">{formatEuro(p.price)}</span>
  </Link>
);

/**
 * Faixa "Da época": produtos com prazo de disponibilidade que inclui hoje.
 * Corre em contínuo (GSAP), para ao passar o rato ou com o foco do teclado,
 * e fica parada (com scroll horizontal) com movimento reduzido.
 */
const SeasonalStrip = () => {
  const { data: products = [] } = useHomeProducts();
  const seasonal = useMemo(() => products.filter((p) => isInSeason(p)).slice(0, 14), [products]);
  const reducedMotion = useReducedMotion();
  const scopeRef = useRef<HTMLElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useGSAP(
    () => {
      if (reducedMotion || seasonal.length === 0) return;
      // A lista está duplicada: andar metade da largura dá a volta sem salto.
      tweenRef.current = gsap.to(".strip-track", {
        xPercent: -50,
        repeat: -1,
        ease: "none",
        duration: Math.max(20, seasonal.length * 4),
      });
    },
    { scope: scopeRef, dependencies: [reducedMotion, seasonal.length], revertOnUpdate: true },
  );

  if (seasonal.length === 0) return null;

  const pause = () => tweenRef.current?.pause();
  const play = () => tweenRef.current?.play();

  return (
    <section
      ref={scopeRef}
      aria-label={`Produtos da época em ${monthName()}`}
      className="border-b border-border bg-highlight text-highlight-foreground"
    >
      <div className="flex items-center gap-4 py-3">
        <p className="shrink-0 pl-[max(1.5rem,env(safe-area-inset-left))] font-display text-lg md:text-xl">
          Da época · <span className="capitalize">{monthName()}</span>
        </p>
        <div
          className={reducedMotion ? "min-w-0 flex-1 overflow-x-auto" : "min-w-0 flex-1 overflow-hidden"}
          onMouseEnter={pause}
          onMouseLeave={play}
          onFocus={pause}
          onBlur={play}
        >
          <div className="strip-track flex w-max gap-3 pr-3">
            {seasonal.map((p) => (
              <StripItem key={p.id} p={p} />
            ))}
            {!reducedMotion && seasonal.map((p) => <StripItem key={`dup-${p.id}`} p={p} hidden />)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SeasonalStrip;

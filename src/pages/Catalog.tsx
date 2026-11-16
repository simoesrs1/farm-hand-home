import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categories } from "@/data/categories";
import PageHeader from "@/components/PageHeader";
import { isInSeason, useHomeProducts } from "@/hooks/useHomeProducts";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Flip, gsap, useGSAP } from "@/lib/animation";
import { cn } from "@/lib/utils";

/** Compara sem acentos nem maiúsculas ("halofitas" encontra "Halófitas"). */
const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

type Chip = "com-produtos" | "da-epoca";

const Catalog = () => {
  const { data: products = [], isLoading } = useHomeProducts();
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<Set<Chip>>(new Set());

  // Contagem de produtos (e dos que são da época) por categoria.
  const tiles = useMemo(() => {
    const total = new Map<string, number>();
    const seasonal = new Map<string, number>();
    for (const p of products) {
      total.set(p.category, (total.get(p.category) ?? 0) + 1);
      if (isInSeason(p)) seasonal.set(p.category, (seasonal.get(p.category) ?? 0) + 1);
    }
    return categories
      .map((c) => ({ ...c, count: total.get(c.name) ?? 0, seasonal: seasonal.get(c.name) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt"));
  }, [products]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return tiles.filter(
      (c) =>
        (!q || normalize(c.name).includes(q)) &&
        (!chips.has("com-produtos") || c.count > 0) &&
        (!chips.has("da-epoca") || c.seasonal > 0),
    );
  }, [tiles, query, chips]);
  const visibleKey = visible.map((c) => c.slug).join(",");
  const topSlug = tiles[0]?.count ? tiles[0].slug : null;

  // Flip: guarda as posições antes de filtrar e anima depois do render.
  const gridRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const captureFlip = () => {
    if (reducedMotion || !gridRef.current) return;
    flipState.current = Flip.getState(gridRef.current.querySelectorAll(".flip-item"));
  };

  const toggleChip = (chip: Chip) => {
    captureFlip();
    setChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  };

  const clearAll = () => {
    captureFlip();
    setQuery("");
    setChips(new Set());
  };

  useGSAP(
    () => {
      const state = flipState.current;
      flipState.current = null;
      if (!state || reducedMotion || !gridRef.current) return;
      Flip.from(state, {
        targets: gridRef.current.querySelectorAll(".flip-item"),
        duration: 0.45,
        ease: "power2.inOut",
        stagger: 0.015,
        onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.3 }),
      });
    },
    { dependencies: [visibleKey] },
  );

  const chipList: { key: Chip; label: string }[] = [
    { key: "com-produtos", label: "Com produtos" },
    { key: "da-epoca", label: "Da época" },
  ];

  return (
    <main className="py-12">
      <div className="container">
        <PageHeader
          title="Catálogo"
          description="Explore por categoria os produtos frescos dos nossos agricultores."
          actions={
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="catalog-search" className="sr-only">
                Procurar categoria
              </label>
              <Input
                id="catalog-search"
                type="search"
                value={query}
                onChange={(e) => {
                  captureFlip();
                  setQuery(e.target.value);
                }}
                placeholder="Procurar categoria…"
                className="pl-9"
              />
            </div>
          }
        />

        <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar categorias">
          {chipList.map((c) => {
            const on = chips.has(c.key);
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleChip(c.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  on
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:border-foreground/40",
                )}
              >
                {c.label}
              </button>
            );
          })}
          {(chips.size > 0 || query) && (
            <Button variant="ghost" size="sm" className="gap-1" onClick={clearAll}>
              <X className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center">
            <p className="text-muted-foreground">Nenhuma categoria corresponde à pesquisa.</p>
            <Button variant="link" onClick={clearAll}>
              Limpar pesquisa
            </Button>
          </div>
        ) : (
          <div
            ref={gridRef}
            className="grid grid-flow-dense auto-rows-[150px] grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:auto-rows-[170px] lg:grid-cols-4"
          >
            {visible.map((c) => {
              const empty = !isLoading && c.count === 0;
              const featured = c.slug === topSlug && !query && chips.size === 0;
              return (
                <Link
                  key={c.slug}
                  to={`/catalogo/${c.slug}`}
                  data-flip-id={c.slug}
                  className={cn(
                    "flip-item group relative overflow-hidden rounded-2xl border border-border bg-muted",
                    featured && "col-span-2 row-span-2",
                  )}
                >
                  <img
                    src={c.image}
                    alt=""
                    loading="lazy"
                    className={cn(
                      "absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105",
                      empty && "opacity-60 grayscale",
                    )}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 md:p-4">
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block font-display text-background",
                          featured ? "text-2xl md:text-4xl" : "text-lg md:text-xl",
                        )}
                      >
                        {c.name}
                      </span>
                      {c.seasonal > 0 && (
                        <span className="block text-xs text-background/80">
                          {c.seasonal} da época
                        </span>
                      )}
                    </span>
                    {isLoading ? null : c.count > 0 ? (
                      <Badge variant="highlight" className="shrink-0 font-mono tabular-nums">
                        {c.count} {c.count === 1 ? "produto" : "produtos"}
                      </Badge>
                    ) : (
                      <Badge variant="muted" className="shrink-0">
                        Brevemente
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default Catalog;

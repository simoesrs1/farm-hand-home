import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SectionHeading from "@/components/SectionHeading";
import { categories, categoryLabel } from "@/data/categories";
import { useHomeProducts } from "@/hooks/useHomeProducts";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// 1 grande (2x2) + 4 pequenas: enche duas linhas certas em 4 colunas (desktop) e em 2 colunas (telemóvel).
const MAX_TILES = 5;

/** Categorias com mais produtos à venda, em mosaico; a primeira em destaque. */
const CategoryShowcase = () => {
  const { data: products = [], isLoading } = useHomeProducts();
  const scopeRef = useRef<HTMLElement>(null);
  const { t } = useTranslation("home");

  const tiles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return categories
      .map((c) => ({ ...c, count: counts.get(c.name) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt"))
      .slice(0, MAX_TILES);
  }, [products]);

  useReveal(scopeRef, ".category-tile", [isLoading, tiles.length]);

  return (
    <section ref={scopeRef} className="py-16 md:py-20">
      <div className="container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow={t("categories.eyebrow")}
            title={t("categories.title")}
            description={t("categories.description")}
          />
          <Button asChild variant="outline" className="gap-2">
            <Link to="/catalogo">
              {t("categories.seeAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid auto-rows-[150px] grid-cols-2 gap-3 md:auto-rows-[180px] md:grid-cols-4 md:gap-4">
          {tiles.map((c, i) => (
            <Link
              key={c.slug}
              to={`/catalogo/${c.slug}`}
              className={cn(
                "category-tile group relative overflow-hidden rounded-2xl border border-border bg-muted",
                i === 0 && "col-span-2 row-span-2",
              )}
            >
              <img
                src={c.image}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 md:p-4">
                <span
                  className={cn(
                    "font-display text-background",
                    i === 0 ? "text-2xl md:text-4xl" : "text-lg md:text-xl",
                  )}
                >
                  {categoryLabel(c.slug)}
                </span>
                {c.count > 0 ? (
                  <Badge variant="highlight" className="shrink-0 font-mono tabular-nums">
                    {t("categories.products", { count: c.count })}
                  </Badge>
                ) : (
                  <Badge variant="muted" className="shrink-0">
                    {t("categories.soon")}
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryShowcase;

import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { gsap, useGSAP } from "@/lib/animation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useHomeProducts } from "@/hooks/useHomeProducts";
import { useTranslation } from "react-i18next";
import { formatNumber } from "@/lib/format";

/**
 * Contadores reais. Cada um só aparece acima de um mínimo (não mostrar "1 agricultor"),
 * e a secção só aparece com pelo menos dois contadores.
 */
const MINIMUMS = { farmers: 5, products: 20, reviews: 10 };

const fetchReviewCount = async () => {
  const { count } = await supabase
    .from("farmer_reviews")
    .select("id", { count: "exact", head: true })
    .is("removed_at", null);
  return count ?? 0;
};

const ImpactCounters = () => {
  const { data: products = [] } = useHomeProducts();
  const { data: reviews = 0 } = useQuery({ queryKey: ["home-review-count"], queryFn: fetchReviewCount, staleTime: 5 * 60 * 1000 });
  const reducedMotion = useReducedMotion();
  const scopeRef = useRef<HTMLElement>(null);
  const { t } = useTranslation("home");

  const counters = useMemo(() => {
    const farmers = new Set(products.map((p) => p.farmerId)).size;
    return [
      { key: "farmers", value: farmers, label: t("impact.farmers"), min: MINIMUMS.farmers },
      { key: "products", value: products.length, label: t("impact.products"), min: MINIMUMS.products },
      { key: "reviews", value: reviews, label: t("impact.reviews"), min: MINIMUMS.reviews },
    ].filter((c) => c.value >= c.min);
  }, [products, reviews, t]);
  const countersKey = counters.map((c) => `${c.key}:${c.value}`).join(",");

  // Conta de 0 até ao valor quando a secção entra no ecrã (uma vez).
  useGSAP(
    () => {
      if (reducedMotion || !scopeRef.current) return;
      gsap.utils.toArray<HTMLElement>(".counter-value", scopeRef.current).forEach((el) => {
        const target = Number(el.dataset.value);
        const state = { val: 0 };
        gsap.to(state, {
          val: target,
          duration: 1.4,
          ease: "power2.out",
          snap: { val: 1 },
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: () => {
            el.textContent = formatNumber(state.val);
          },
        });
      });
    },
    { scope: scopeRef, dependencies: [reducedMotion, countersKey], revertOnUpdate: true },
  );

  if (counters.length < 2) return null;

  return (
    <section ref={scopeRef} aria-label={t("impact.aria")} className="py-14">
      <dl className="container grid gap-8 sm:grid-cols-3">
        {counters.map((c) => (
          <div key={c.key} className="flex flex-col-reverse border-t-2 border-primary pt-4">
            <dt className="mt-2 text-sm text-muted-foreground">{c.label}</dt>
            <dd
              className="counter-value font-mono text-5xl font-bold tabular-nums text-foreground"
              data-value={c.value}
            >
              {formatNumber(c.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default ImpactCounters;

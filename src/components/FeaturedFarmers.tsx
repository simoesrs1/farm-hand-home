import { useEffect, useRef, useState } from "react";
import { useReveal } from "@/hooks/useReveal";
import { Link } from "react-router-dom";
import FarmerCard from "./FarmerCard";
import SectionHeading from "./SectionHeading";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryByName } from "@/data/categories";
import { isPaused } from "@/lib/farmer-activity";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=400&fit=crop";

interface FeaturedFarmer {
  id: string;
  farm: string;
  name: string;
  image: string;
  location: string;
  products: string[];
}

/**
 * Os 6 agricultores mais ativos (atividade + certificados), escolhidos
 * diariamente por compute_farmer_activity() — ver featured_rank.
 */
const FeaturedFarmers = () => {
  const [farmers, setFarmers] = useState<FeaturedFarmer[] | null>(null);
  const scopeRef = useRef<HTMLElement>(null);
  useReveal(scopeRef, ".farmer-card", [farmers?.length ?? -1]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows, error } = await supabase
        .from("public_farmer_profiles")
        .select("id, company_name, address, paused_until, featured_rank")
        .not("featured_rank", "is", null)
        .order("featured_rank", { ascending: true })
        .limit(6);
      const featured = (rows ?? []).filter((r) => r.id && !isPaused(r.paused_until));
      if (error || featured.length === 0) {
        if (!cancelled) setFarmers([]);
        return;
      }

      const ids = featured.map((r) => r.id as string);
      const { data: products } = await supabase
        .from("products")
        .select("farmer_id, category, media_urls, created_at")
        .in("farmer_id", ids)
        .eq("active", true)
        .gt("stock_quantity", 0)
        .order("created_at", { ascending: false });

      // Uma fotografia por agricultor (a do produto mais recente com media), num único pedido.
      const coverPath = (farmerId: string) =>
        (products ?? []).find((p) => p.farmer_id === farmerId && p.media_urls?.length)?.media_urls?.[0];
      const paths = featured.map((f) => coverPath(f.id as string)).filter((p): p is string => !!p);
      const signedByPath = new Map<string, string>();
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("product-media").createSignedUrls(paths, 60 * 60);
        for (const s of signed ?? []) if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
      }

      const mapped = featured.map((f) => {
        const own = (products ?? []).filter((p) => p.farmer_id === f.id);
        const categories = [...new Set(own.map((p) => p.category).filter(Boolean))] as string[];
        const path = coverPath(f.id as string);
        const image =
          (path && signedByPath.get(path)) ||
          (categories[0] && getCategoryByName(categories[0])?.image) ||
          FALLBACK_IMAGE;
        return {
          id: f.id as string,
          farm: f.company_name ?? "Agricultor",
          name: `${own.length} ${own.length === 1 ? "produto disponível" : "produtos disponíveis"}`,
          image,
          location: f.address ?? "",
          products: categories,
        };
      });
      if (!cancelled) setFarmers(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section ref={scopeRef} className="border-t border-border bg-card py-16 md:py-20">
      <div className="container">
        <SectionHeading
          className="mb-10"
          eyebrow="Quem cultiva"
          title="Agricultores em destaque"
          description={
            <>
              Os produtores mais ativos desta semana: stock em dia, respostas rápidas e produtos
              prontos a encomendar.{" "}
              <Link to="/termos#ordenacao" className="underline-offset-4 hover:text-primary hover:underline">
                Como escolhemos?
              </Link>
            </>
          }
        />
        {farmers !== null && farmers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground">
              Ainda não há agricultores em destaque esta semana. Os destaques são atualizados todos os dias.
            </p>
            <Link to="/catalogo" className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
              Ver o catálogo
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {farmers === null
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)
              : farmers.map((farmer) => (
                  <div key={farmer.id} className="farmer-card">
                    <FarmerCard {...farmer} />
                  </div>
                ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedFarmers;

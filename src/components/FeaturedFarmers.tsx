import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FarmerCard from "./FarmerCard";
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

      const mapped = await Promise.all(
        featured.map(async (f) => {
          const own = (products ?? []).filter((p) => p.farmer_id === f.id);
          const categories = [...new Set(own.map((p) => p.category).filter(Boolean))] as string[];
          let image = (categories[0] && getCategoryByName(categories[0])?.image) || FALLBACK_IMAGE;
          const path = own.find((p) => p.media_urls?.length)?.media_urls?.[0];
          if (path) {
            const { data: signed } = await supabase.storage
              .from("product-media")
              .createSignedUrl(path, 60 * 60);
            if (signed?.signedUrl) image = signed.signedUrl;
          }
          return {
            id: f.id as string,
            farm: f.company_name ?? "Agricultor",
            name: `${own.length} ${own.length === 1 ? "produto disponível" : "produtos disponíveis"}`,
            image,
            location: f.address ?? "",
            products: categories,
          };
        }),
      );
      if (!cancelled) setFarmers(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (farmers !== null && farmers.length === 0) return null;

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Destaques
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
            Agricultores em destaque
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Os produtores mais ativos desta semana: stock em dia, respostas rápidas e produtos
            prontos a encomendar.{" "}
            <Link to="/termos#ordenacao" className="underline-offset-4 hover:text-primary hover:underline">
              Como escolhemos?
            </Link>
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {farmers === null
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)
            : farmers.map((farmer) => <FarmerCard key={farmer.id} {...farmer} />)}
        </div>
      </div>
    </section>
  );
};

export default FeaturedFarmers;

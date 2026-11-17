import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryByName } from "@/data/categories";
import { isPaused } from "@/lib/farmer-activity";
import type { ProductCardProduct } from "@/components/ProductCard";

/** Produto à venda, com os campos que a página inicial usa. */
export type HomeProduct = ProductCardProduct & {
  availabilityStart: string | null;
  availabilityEnd: string | null;
  createdAt: string;
  /** true quando a imagem é uma fotografia do produto (não a da categoria). */
  hasPhoto: boolean;
};

const isVideo = (path: string) => /\.(mp4|webm|mov)$/i.test(path);

const fetchHomeProducts = async (): Promise<HomeProduct[]> => {
  const { data: rows, error } = await supabase
    .from("products")
    .select(
      "id, name, unit, client_price, discount_percent, stock_quantity, low_stock_threshold, media_urls, delivery_mode, shipping_days, category, farmer_id, is_organic, availability_start, availability_end, created_at",
    )
    .eq("active", true)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  if (!rows?.length) return [];

  const farmerIds = [...new Set(rows.map((r) => r.farmer_id))];
  const { data: farmers } = await supabase
    .from("public_farmer_profiles")
    .select("id, company_name, address, paused_until")
    .in("id", farmerIds);
  // Agricultores em pausa não aparecem na página inicial.
  const farmerById = new Map(
    (farmers ?? []).filter((f) => f.id && !isPaused(f.paused_until)).map((f) => [f.id as string, f]),
  );

  // Fotografias num único pedido (bucket privado: URLs assinados por 1 hora).
  const photoPath = (media: string[] | null) => media?.find((p) => !isVideo(p));
  const paths = rows.map((r) => photoPath(r.media_urls)).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from("product-media").createSignedUrls(paths, 60 * 60);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  return rows
    .filter((r) => farmerById.has(r.farmer_id))
    .map((r) => {
      const farmer = farmerById.get(r.farmer_id)!;
      const path = photoPath(r.media_urls);
      const photo = path ? signed.get(path) : undefined;
      return {
        id: r.id,
        name: r.name,
        farmerId: r.farmer_id,
        farmer: farmer.company_name ?? "Agricultor",
        price: Math.round(r.client_price * (1 - (r.discount_percent ?? 0) / 100) * 100) / 100,
        originalPrice: r.client_price,
        unit: r.unit,
        category: r.category ?? "",
        image: photo ?? (r.category ? getCategoryByName(r.category)?.image : undefined) ?? "",
        hasPhoto: !!photo,
        rating: 0,
        reviews: 0,
        location: farmer.address ?? "",
        region: "",
        deliveryMode: r.delivery_mode,
        shippingDays: r.shipping_days ?? undefined,
        stock: r.stock_quantity ?? 0,
        isOrganic: r.is_organic,
        lowStockThreshold: r.low_stock_threshold,
        availabilityStart: r.availability_start,
        availabilityEnd: r.availability_end,
        createdAt: r.created_at,
      };
    });
};

/** Produtos à venda, partilhados pelas secções da página inicial (um só pedido). */
export const useHomeProducts = () =>
  useQuery({ queryKey: ["home-products"], queryFn: fetchHomeProducts, staleTime: 5 * 60 * 1000 });

const todayISO = () => new Date().toISOString().slice(0, 10);

/** "Da época": produtos com prazo de disponibilidade que inclui hoje. */
export const isInSeason = (p: HomeProduct, today = todayISO()) =>
  !!p.availabilityEnd && p.availabilityEnd >= today && (!p.availabilityStart || p.availabilityStart <= today);

/** Até `n` produtos de categorias diferentes, com fotografia primeiro. */
export const pickVaried = (list: HomeProduct[], n: number) => {
  const sorted = [...list].sort((a, b) => Number(b.hasPhoto) - Number(a.hasPhoto));
  const seen = new Set<string>();
  const picked: HomeProduct[] = [];
  for (const p of sorted) {
    if (picked.length >= n) break;
    if (seen.has(p.category)) continue;
    seen.add(p.category);
    picked.push(p);
  }
  return picked;
};

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MarketPrice = {
  productKey: string;
  displayName: string;
  unit: string;
  avgPrice: number;
  sampleSize: number;
  collectedAt: string;
};

/** Chave normalizada usada para casar produtos com os preços de supermercado. */
export const marketKey = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Preços médios de grandes superfícies, recolhidos diariamente.
 * Devolve um mapa por chave normalizada do nome do produto.
 */
export const useMarketPrices = () => {
  const [prices, setPrices] = useState<Map<string, MarketPrice>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("market_prices")
        .select("product_key, display_name, unit, avg_price, sample_size, collected_at");
      if (cancelled || !data) return;
      setPrices(
        new Map(
          data.map((r) => [
            r.product_key,
            {
              productKey: r.product_key,
              displayName: r.display_name,
              unit: r.unit,
              avgPrice: Number(r.avg_price),
              sampleSize: r.sample_size,
              collectedAt: r.collected_at,
            },
          ])
        )
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return prices;
};

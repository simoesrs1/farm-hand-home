import { supabase } from "@/integrations/supabase/client";

/**
 * Encomendas com unidades vendidas à espera de o agricultor indicar o lote
 * (produtos com "Escolher o lote em cada venda").
 */
export const ordersWithPendingLots = async (orderIds?: string[]) => {
  let q = supabase.from("order_lot_allocations").select("order_id").is("batch_id", null);
  if (orderIds) q = q.in("order_id", orderIds);
  const { data } = await q;
  return new Set((data ?? []).map((r) => r.order_id));
};

/** Unidades à espera de lote, por produto. */
export const pendingLotUnitsByProduct = async () => {
  const { data } = await supabase.from("order_lot_allocations").select("product_id, quantity").is("batch_id", null);
  const map: Record<string, number> = {};
  for (const r of data ?? []) map[r.product_id] = (map[r.product_id] ?? 0) + Number(r.quantity);
  return map;
};

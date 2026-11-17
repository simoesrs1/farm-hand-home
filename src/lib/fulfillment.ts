/**
 * Levantamento na quinta ou entrega ao domicílio (feita pelo próprio agricultor).
 *
 * A fonte por produto é products.delivery_mode:
 *   pickup   → só levantamento
 *   shipping → só entrega ao domicílio
 *   both     → à escolha do cliente
 * O cliente escolhe por encomenda, entre as opções comuns a todos os produtos.
 *
 * A mesma regra está em supabase/functions/_shared/fulfillment.ts (Deno), que é
 * quem valida a encomenda; esta versão serve para o carrinho e o artigo.
 */
import { distanceKm, type LatLng } from "@/lib/geo";
import type { Database } from "@/integrations/supabase/types";

export type DeliveryMode = Database["public"]["Enums"]["delivery_mode"];
export type Fulfillment = "pickup" | "delivery";

export const modeAllowsPickup = (mode: DeliveryMode) => mode !== "shipping";
export const modeAllowsDelivery = (mode: DeliveryMode) => mode !== "pickup";

/** O agricultor só entrega se tiver raio e localização da quinta definidos. */
export const farmerDelivers = (radiusKm: number | null | undefined, farm: LatLng | null | undefined) =>
  radiusKm != null && radiusKm > 0 && farm != null;

/** O mesmo, a partir de uma linha de public_farmer_profiles. */
export const farmerDeliversFromProfile = (
  f: { delivery_radius_km?: number | null; pickup_lat?: number | null; pickup_lng?: number | null } | null | undefined,
) =>
  farmerDelivers(
    f?.delivery_radius_km != null ? Number(f.delivery_radius_km) : null,
    f?.pickup_lat != null && f?.pickup_lng != null ? { lat: Number(f.pickup_lat), lng: Number(f.pickup_lng) } : null,
  );

/** Opções comuns a todos os produtos da encomenda (vazio se não houver nenhuma). */
export const fulfillmentOptions = (modes: DeliveryMode[], { delivers }: { delivers: boolean }): Fulfillment[] => {
  if (modes.length === 0) return [];
  const options: Fulfillment[] = [];
  if (modes.every(modeAllowsPickup)) options.push("pickup");
  if (delivers && modes.every(modeAllowsDelivery)) options.push("delivery");
  return options;
};

/** Prazo mínimo de preparação da entrega: o maior entre os produtos, em dias. */
export const preparationDays = (products: { shipping_days: number | null }[]) =>
  Math.max(0, ...products.map((p) => Math.max(0, Math.round(Number(p.shipping_days ?? 0)))));

/** Primeiro momento possível para a entrega, contando o prazo de preparação. */
export const earliestDelivery = (days: number, now: Date = new Date()) =>
  new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

export const isWithinDeliveryRadius = (farm: LatLng, point: LatLng, radiusKm: number) =>
  distanceKm(farm, point) <= radiusKm;

export const FULFILLMENT_LABELS: Record<Fulfillment, string> = {
  pickup: "Levantar na quinta",
  delivery: "Receber em casa",
};

/**
 * Texto curto das formas de entrega de um produto (cartões e página do artigo).
 * `deliveryAvailable` é falso quando o agricultor ainda não tem zona de entrega:
 * nesse caso só se anuncia o que o cliente pode mesmo escolher.
 */
export const deliveryModeLabel = (mode: DeliveryMode | undefined, deliveryAvailable = true) => {
  if (mode === "shipping") {
    return deliveryAvailable ? "Entrega ao domicílio pelo agricultor" : "Entrega ao domicílio ainda indisponível";
  }
  if (mode === "both") {
    return deliveryAvailable ? "Levantamento ou entrega ao domicílio" : "Levantamento na quinta";
  }
  return "Levantamento na quinta";
};

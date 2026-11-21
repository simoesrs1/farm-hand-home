/**
 * Carrinho por agricultor: cada agricultor do carrinho dá origem a uma
 * encomenda, com a sua forma de entrega, horário e morada. Aqui fica a parte
 * pura (opções, horários, preço da entrega e o que falta preencher); a página
 * do carrinho só guarda as escolhas e mostra.
 *
 * As mesmas regras são validadas no servidor (supabase/functions/create-order).
 */
import { computeDeliveryFee, type DeliveryFeeResult } from "@/lib/delivery-fee";
import {
  earliestDelivery,
  farmerDelivers,
  fulfillmentOptions,
  isWithinDeliveryRadius,
  preparationDays,
  type DeliveryMode,
  type Fulfillment,
} from "@/lib/fulfillment";
import type { LatLng } from "@/lib/geo";
import { parsePickupHours, pickupSlots, type PickupWindow } from "@/lib/pickup-hours";

/** Campos de entrega de cada produto do carrinho, lidos da base de dados. */
export interface CartProduct {
  id: string;
  delivery_mode: DeliveryMode;
  delivery_tracking: boolean;
  delivery_fee: number | null;
  shipping_days: number | null;
}

/** Horários, raio e localização de um agricultor (public_farmer_profiles). */
export interface FarmerSettings {
  pickupWindows: PickupWindow[];
  pickupNote: string;
  deliveryWindows: PickupWindow[];
  deliveryNote: string;
  radiusKm: number | null;
  farmPoint: LatLng | null;
  freeThreshold: number | null;
}

/** Linha de public_farmer_profiles com os campos usados no carrinho. */
export interface FarmerSettingsRow {
  pickup_hours: unknown;
  pickup_hours_note: string | null;
  delivery_hours: unknown;
  delivery_note: string | null;
  delivery_radius_km: number | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  free_delivery_threshold: number | null;
}

export const parseFarmerSettings = (row: FarmerSettingsRow): FarmerSettings => ({
  pickupWindows: parsePickupHours(row.pickup_hours),
  pickupNote: row.pickup_hours_note ?? "",
  deliveryWindows: parsePickupHours(row.delivery_hours),
  deliveryNote: row.delivery_note ?? "",
  radiusKm: row.delivery_radius_km != null ? Number(row.delivery_radius_km) : null,
  farmPoint:
    row.pickup_lat != null && row.pickup_lng != null
      ? { lat: Number(row.pickup_lat), lng: Number(row.pickup_lng) }
      : null,
  freeThreshold: row.free_delivery_threshold ?? null,
});

/** O que o cliente escolheu para um agricultor. */
export interface GroupChoice {
  fulfillment: Fulfillment | null;
  /** Horário em ISO ("" se ainda não escolheu). */
  slot: string;
  address: string;
  point: LatLng | null;
  tracking: boolean;
}

export const emptyChoice = (fulfillment: Fulfillment | null = null, slot = ""): GroupChoice => ({
  fulfillment,
  slot,
  address: "",
  point: null,
  tracking: false,
});

/** Estado calculado de um agricultor do carrinho. */
export interface GroupState {
  /** Dados do agricultor e dos produtos já carregados. */
  ready: boolean;
  options: Fulfillment[];
  /** A escolha do cliente, se ainda for possível; senão a primeira opção. */
  fulfillment: Fulfillment | null;
  isDelivery: boolean;
  noCommonOption: boolean;
  prepDays: number;
  needsSchedule: boolean;
  slots: Date[];
  /** Horário escolhido, só se ainda estiver entre os disponíveis. */
  slot: string;
  deliveryFee: DeliveryFeeResult | null;
  productsTotal: number;
  total: number;
  trackingAvailable: boolean;
  outOfRadius: boolean;
}

export const deriveGroup = (
  products: CartProduct[] | null,
  settings: FarmerSettings | null | undefined,
  choice: GroupChoice,
  productsTotal: number,
  now: Date = new Date(),
): GroupState => {
  const ready = products !== null && settings != null;
  const delivers = settings ? farmerDelivers(settings.radiusKm, settings.farmPoint) : false;
  const options = ready ? fulfillmentOptions(products.map((p) => p.delivery_mode), { delivers }) : [];
  const fulfillment =
    choice.fulfillment && options.includes(choice.fulfillment) ? choice.fulfillment : options[0] ?? null;
  const isDelivery = fulfillment === "delivery";
  const prepDays = preparationDays(products ?? []);
  const windows = settings ? (isDelivery ? settings.deliveryWindows : settings.pickupWindows) : [];
  const slots = pickupSlots(windows, { from: now, earliest: isDelivery ? earliestDelivery(prepDays, now) : undefined });
  const slot = choice.slot && slots.some((d) => d.toISOString() === choice.slot) ? choice.slot : "";
  const deliveryFee = isDelivery
    ? computeDeliveryFee(products ?? [], productsTotal, settings?.freeThreshold ?? null)
    : null;
  const outOfRadius =
    isDelivery &&
    choice.point != null &&
    settings?.farmPoint != null &&
    settings.radiusKm != null &&
    !isWithinDeliveryRadius(settings.farmPoint, choice.point, settings.radiusKm);
  return {
    ready,
    options,
    fulfillment,
    isDelivery,
    noCommonOption: ready && options.length === 0,
    prepDays,
    needsSchedule: windows.length > 0,
    slots,
    slot,
    deliveryFee,
    productsTotal,
    total: productsTotal + (deliveryFee?.fee ?? 0),
    trackingAvailable: isDelivery && (products ?? []).some((p) => p.delivery_tracking),
    outOfRadius,
  };
};

/** O que falta para poder pagar a encomenda deste agricultor (null se nada). */
export type GroupProblem =
  | "loading"
  | "noCommon"
  | "chooseDelivery"
  | "choosePickup"
  | "noAddress"
  | "noPoint"
  | "outOfRadius";

export const groupProblem = (state: GroupState, choice: GroupChoice): GroupProblem | null => {
  if (!state.ready) return "loading";
  if (state.noCommonOption || !state.fulfillment) return "noCommon";
  if (state.needsSchedule && !state.slot) return state.isDelivery ? "chooseDelivery" : "choosePickup";
  if (state.isDelivery) {
    if (choice.address.trim().length < 5) return "noAddress";
    if (!choice.point) return "noPoint";
    if (state.outOfRadius) return "outOfRadius";
  }
  return null;
};

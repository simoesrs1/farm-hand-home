/**
 * Padrão de entrega do agricultor (cartão "Entrega" do formulário de produto).
 *
 * O padrão vive em farmer_details e preenche os produtos novos. Cada produto
 * guarda sempre os seus valores; aplicar "a todos os produtos" atualiza o
 * padrão e todos os produtos ativos, só nos campos alterados
 * (RPC apply_delivery_defaults). O limite da entrega grátis é único por
 * agricultor, porque se aplica ao carrinho inteiro.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type DeliveryModeValue = Database["public"]["Enums"]["delivery_mode"];

export interface DeliverySettings {
  delivery_mode: DeliveryModeValue;
  local_delivery: boolean;
  delivery_tracking: boolean;
  shipping_days: number;
  delivery_fee: number;
}

export interface FarmerDeliveryDefaults {
  /** null enquanto o agricultor não guardar um padrão. */
  settings: DeliverySettings | null;
  freeDeliveryThreshold: number | null;
}

export const DELIVERY_FIELD_LABELS: Record<keyof DeliverySettings, string> = {
  delivery_mode: "Modo de entrega",
  local_delivery: "Entrega ao domicílio",
  delivery_tracking: "Acompanhamento da entrega",
  shipping_days: "Dias de envio",
  delivery_fee: "Preço da entrega",
};

/** O preço da entrega aplica-se a envio ao domicílio ou a entrega em mão. */
export const hasHomeDelivery = (s: Pick<DeliverySettings, "delivery_mode" | "local_delivery">) =>
  s.delivery_mode !== "pickup" || s.local_delivery;

/** Valores coerentes antes de comparar ou gravar. */
export const normalizeDeliverySettings = (s: DeliverySettings): DeliverySettings => ({
  delivery_mode: s.delivery_mode,
  local_delivery: s.local_delivery,
  delivery_tracking: s.local_delivery && s.delivery_tracking,
  shipping_days: s.delivery_mode === "pickup" ? 0 : Math.max(1, Math.round(s.shipping_days || 1)),
  delivery_fee: hasHomeDelivery(s) ? Math.round(Math.max(0, s.delivery_fee || 0) * 100) / 100 : 0,
});

export const changedDeliveryFields = (a: DeliverySettings, b: DeliverySettings) => {
  const na = normalizeDeliverySettings(a);
  const nb = normalizeDeliverySettings(b);
  return (Object.keys(DELIVERY_FIELD_LABELS) as (keyof DeliverySettings)[]).filter((k) => na[k] !== nb[k]);
};

export const loadDeliveryDefaults = async (farmerId: string): Promise<FarmerDeliveryDefaults> => {
  const { data } = await supabase
    .from("farmer_details")
    .select(
      "default_delivery_mode, default_local_delivery, default_delivery_tracking, default_shipping_days, default_delivery_fee, free_delivery_threshold",
    )
    .eq("id", farmerId)
    .maybeSingle();
  const settings: DeliverySettings | null =
    data?.default_delivery_mode != null
      ? {
          delivery_mode: data.default_delivery_mode,
          local_delivery: !!data.default_local_delivery,
          delivery_tracking: !!data.default_delivery_tracking,
          shipping_days: data.default_shipping_days ?? 0,
          delivery_fee: Number(data.default_delivery_fee ?? 0),
        }
      : null;
  return { settings, freeDeliveryThreshold: data?.free_delivery_threshold ?? null };
};

/**
 * Grava os campos indicados como padrão e aplica-os a todos os produtos ativos.
 * Passar só `free_delivery_threshold` atualiza apenas o limite do agricultor.
 */
export const applyDeliveryDefaults = async (
  farmerId: string,
  values: Partial<DeliverySettings> & { free_delivery_threshold?: number | null },
) => {
  const { error } = await supabase.rpc("apply_delivery_defaults", {
    p_farmer_id: farmerId,
    p_values: values as Json,
  });
  return error;
};

/** Converte texto do formulário ("3,50") em número, ou null se vazio/inválido. */
export const parseEuro = (text: string): number | null => {
  const n = parseFloat(text.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

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
import i18n from "@/i18n";
import type { Database, Json } from "@/integrations/supabase/types";

export type DeliveryModeValue = Database["public"]["Enums"]["delivery_mode"];

/**
 * delivery_mode é a única fonte da entrega: "shipping" é a entrega ao
 * domicílio feita pelo próprio agricultor (ver @/lib/fulfillment).
 * shipping_days é o prazo mínimo de preparação da entrega, em dias.
 */
export interface DeliverySettings {
  delivery_mode: DeliveryModeValue;
  delivery_tracking: boolean;
  shipping_days: number;
  delivery_fee: number;
}

export interface FarmerDeliveryDefaults {
  /** null enquanto o agricultor não guardar um padrão. */
  settings: DeliverySettings | null;
  freeDeliveryThreshold: number | null;
}

/** Nomes dos campos de entrega, no idioma atual. */
export const DELIVERY_FIELD_LABELS: Record<keyof DeliverySettings, string> = {
  get delivery_mode() {
    return i18n.t("common:deliverySettings.fields.delivery_mode");
  },
  get delivery_tracking() {
    return i18n.t("common:deliverySettings.fields.delivery_tracking");
  },
  get shipping_days() {
    return i18n.t("common:deliverySettings.fields.shipping_days");
  },
  get delivery_fee() {
    return i18n.t("common:deliverySettings.fields.delivery_fee");
  },
};

const modeOption = (value: DeliveryModeValue) => ({
  value,
  get label() {
    return i18n.t(`common:deliverySettings.modes.${value}.label`);
  },
  get hint() {
    return i18n.t(`common:deliverySettings.modes.${value}.hint`);
  },
});

/** Opções do formulário de produto (um só controlo para a entrega). */
export const DELIVERY_MODE_OPTIONS: { value: DeliveryModeValue; label: string; hint: string }[] = [
  modeOption("pickup"),
  modeOption("shipping"),
  modeOption("both"),
];

/** Tracking, preço e prazo de preparação só existem com entrega ao domicílio. */
export const hasHomeDelivery = (s: Pick<DeliverySettings, "delivery_mode">) => s.delivery_mode !== "pickup";

/** Valores coerentes antes de comparar ou gravar. */
export const normalizeDeliverySettings = (s: DeliverySettings): DeliverySettings => ({
  delivery_mode: s.delivery_mode,
  delivery_tracking: hasHomeDelivery(s) && s.delivery_tracking,
  shipping_days: hasHomeDelivery(s) ? Math.max(0, Math.round(s.shipping_days || 0)) : 0,
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
      "default_delivery_mode, default_delivery_tracking, default_shipping_days, default_delivery_fee, free_delivery_threshold",
    )
    .eq("id", farmerId)
    .maybeSingle();
  const settings: DeliverySettings | null =
    data?.default_delivery_mode != null
      ? {
          delivery_mode: data.default_delivery_mode,
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

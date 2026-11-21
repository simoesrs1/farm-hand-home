/**
 * Subscrições dos agricultores (cabazes com entrega em casa do cliente).
 *
 * As regras que contam (cobrança, entregas, cancelamento, multa) estão na base
 * de dados: supabase/migrations/20261121150000_subscricoes.sql. Aqui fica o que
 * o browser precisa para mostrar e validar os formulários.
 */
import i18n from "@/i18n";
import type { Tables } from "@/integrations/supabase/types";

export type SubscriptionInterval = "week" | "fortnight" | "month";
export const SUBSCRIPTION_INTERVALS: SubscriptionInterval[] = ["week", "fortnight", "month"];

export type SubscriptionPlan = Tables<"subscription_plans">;
export type Subscription = Tables<"subscriptions">;

const WEEKS: Record<SubscriptionInterval, number> = { week: 1, fortnight: 2, month: 4 };

export const isInterval = (v: string): v is SubscriptionInterval => v in WEEKS;

/** Entregas pagas em cada cobrança (ex.: cobrança mensal, entrega semanal = 4). Igual à função SQL. */
export const deliveriesPerPeriod = (billing: SubscriptionInterval, delivery: SubscriptionInterval) =>
  Math.max(1, Math.floor(WEEKS[billing] / WEEKS[delivery]));

/** A entrega não pode ser menos frequente do que a cobrança. */
export const isValidIntervalPair = (billing: SubscriptionInterval, delivery: SubscriptionInterval) =>
  WEEKS[delivery] <= WEEKS[billing];

/** Valor de cada entrega (a última leva os cêntimos do arredondamento). */
export const pricePerDelivery = (price: number, billing: SubscriptionInterval, delivery: SubscriptionInterval) =>
  Math.round((price / deliveriesPerPeriod(billing, delivery)) * 100) / 100;

/** "por semana", "por quinzena", "por mês". */
export const billingLabel = (interval: string) =>
  i18n.t(`offerings:subscriptions.billing.${isInterval(interval) ? interval : "month"}`);

/** "todas as semanas", "de 15 em 15 dias", "uma vez por mês". */
export const deliveryLabel = (interval: string) =>
  i18n.t(`offerings:subscriptions.delivery.${isInterval(interval) ? interval : "month"}`);

/** Linhas não vazias do campo "o que inclui". */
export const includesList = (includes: string) =>
  includes
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

/** Prazo para cancelar uma entrega sem custo (igual a cancel_subscription). */
export const CANCEL_CUTOFF_HOURS = 48;

export interface PlanFormValues {
  title: string;
  description: string;
  includes: string;
  price: string;
  billingInterval: SubscriptionInterval;
  deliveryInterval: SubscriptionInterval;
  preparationDays: string;
  radiusKm: string;
}

export type PlanFormErrors = Partial<Record<keyof PlanFormValues, string>>;

/** As mesmas regras das restrições da tabela subscription_plans. */
export const validatePlan = (v: PlanFormValues): PlanFormErrors => {
  const e: PlanFormErrors = {};
  type ErrorKey = "title" | "description" | "includes" | "price" | "interval" | "preparation" | "radius";
  const t = (k: ErrorKey) => i18n.t(`offerings:subscriptions.errors.${k}`);
  if (v.title.trim().length < 3 || v.title.trim().length > 80) e.title = t("title");
  if (v.description.trim().length < 20) e.description = t("description");
  if (includesList(v.includes).length === 0) e.includes = t("includes");
  const price = Number(v.price.replace(",", "."));
  if (!Number.isFinite(price) || price < 1 || price > 2000) e.price = t("price");
  if (!isValidIntervalPair(v.billingInterval, v.deliveryInterval)) e.deliveryInterval = t("interval");
  const prep = Number(v.preparationDays);
  if (!Number.isInteger(prep) || prep < 1 || prep > 14) e.preparationDays = t("preparation");
  const radius = Number(v.radiusKm.replace(",", "."));
  if (!Number.isFinite(radius) || radius <= 0 || radius > 200) e.radiusKm = t("radius");
  return e;
};

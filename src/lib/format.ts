/**
 * Formatação de valores para a interface, no idioma escolhido no site.
 * Usar sempre estas funções em vez de `toFixed(2) + "€"` ou `"pt-PT"` fixo, para os
 * preços e as datas terem o mesmo aspeto em todo o site: "2,40 €" (pt), "€2.40" (en).
 */
import i18n from "@/i18n";
import { localeFor } from "@/i18n/languages";

/** Código Intl do idioma atual (ex.: "pt-PT", "en-GB"). */
export const currentLocale = () => localeFor(i18n.resolvedLanguage ?? i18n.language ?? "pt");

const euroFormats = new Map<string, Intl.NumberFormat>();

/** 2.4 → "2,40 €". Valores nulos ou inválidos contam como 0. */
export const formatEuro = (value: number | string | null | undefined) => {
  const locale = currentLocale();
  let format = euroFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
    euroFormats.set(locale, format);
  }
  const n = Number(value ?? 0);
  return format.format(Number.isFinite(n) ? n : 0);
};

type DateInput = string | number | Date;

/** Data no idioma atual (por omissão "19/11/2026"). */
export const formatDate = (value: DateInput, options?: Intl.DateTimeFormatOptions) =>
  new Date(value).toLocaleDateString(currentLocale(), options);

/** Data e hora no idioma atual. */
export const formatDateTime = (value: DateInput, options?: Intl.DateTimeFormatOptions) =>
  new Date(value).toLocaleString(currentLocale(), options);

/** Hora no idioma atual. */
export const formatTime = (value: DateInput, options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }) =>
  new Date(value).toLocaleTimeString(currentLocale(), options);

/** Número no idioma atual (ex.: 1 234,5). */
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
  value.toLocaleString(currentLocale(), options);

const BOOKING_UNITS = ["pessoa", "grupo", "noite", "entrega"] as const;

/**
 * Unidade de uma linha de encomenda no idioma atual. As reservas guardam
 * "pessoa", "grupo" ou "noite" e as subscrições "entrega"; as outras unidades
 * (Kg, L…) ficam como estão.
 */
export const unitLabel = (unit: string | null | undefined, count = 1) => {
  if (!unit) return "";
  const known = BOOKING_UNITS.find((u) => u === unit);
  return known ? i18n.t(`common:orderUnits.${known}`, { count }) : unit;
};

/**
 * Unidade a seguir a uma quantidade. Nos produtos a unidade é o tamanho da
 * embalagem ("1 Kg", "500 g"), por isso leva "×"; sem número ("Kg") fica igual.
 */
export const unitSuffix = (unit: string | null | undefined, count = 1) => {
  const label = unitLabel(unit, count);
  return /^\s*\d/.test(label) ? `× ${label}` : label;
};

/** Quantidade com a unidade: "120 × 1 Kg", "120 Kg", "2 pessoas". */
export const amountLabel = (quantity: number, unit: string | null | undefined) =>
  [quantity, unitSuffix(unit, quantity)].filter((part) => part !== "").join(" ");

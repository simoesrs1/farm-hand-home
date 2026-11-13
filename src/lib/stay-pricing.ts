/**
 * Alojamento: noites, preço e datas fechadas. A mesma regra está em
 * create_stay_booking (SQL), que é a que conta; esta versão serve para mostrar
 * valores ao cliente. O cancelamento usa cancellationQuote (experience-pricing).
 */
import { unitPriceFor } from "@/lib/experience-pricing";
import { addDaysISO, weekdayOf } from "@/lib/experience-sessions";

export type StayPricingMode = "per_room" | "per_person";

export const REGISTRATION_LABELS: Record<string, string> = {
  AL: "Alojamento Local",
  TER: "Turismo no Espaço Rural",
};

export interface BlockedRange {
  start_date: string;
  end_date: string;
}

/** Noites da estadia (datas AAAA-MM-DD em que se dorme). */
export const stayNights = (checkIn: string, checkOut: string) => {
  const nights: string[] = [];
  for (let d = checkIn; d < checkOut && nights.length <= 366; d = addDaysISO(d, 1)) nights.push(d);
  return nights;
};

/** Soma, noite a noite, o preço do dia (ou o base) por quarto ou por pessoa. */
export const stayAmount = (
  mode: StayPricingMode,
  basePrice: number,
  dayPrices: unknown,
  checkIn: string,
  checkOut: string,
  guests: number,
  units: number,
) => {
  const total = stayNights(checkIn, checkOut).reduce(
    (acc, night) => acc + unitPriceFor(basePrice, dayPrices, weekdayOf(night)) * (mode === "per_person" ? guests : units),
    0,
  );
  return Math.round(total * 100) / 100;
};

/** Alguma noite da estadia cai numa data fechada pelo agricultor. */
export const overlapsBlocked = (blocked: BlockedRange[], checkIn: string, checkOut: string) =>
  blocked.some((b) => b.start_date < checkOut && b.end_date >= checkIn);

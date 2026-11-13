/**
 * Preços e cancelamento das experiências. A mesma regra está em
 * create_experience_booking e cancel_farm_booking (SQL), que são as que
 * contam; esta versão serve para mostrar valores ao cliente.
 */
export type PricingMode = "per_person" | "per_group";

/** Cancelamento grátis até este número de dias antes da sessão. */
export const FREE_CANCEL_DAYS = 5;
/** Retenção num cancelamento tardio, sobre o valor da experiência. */
export const LATE_CANCEL_FEE = 0.25;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Preço do dia da semana (0 = domingo) ou, sem ele, o preço base. */
export const unitPriceFor = (basePrice: number, dayPrices: unknown, weekday: number) => {
  const value = (dayPrices as Record<string, unknown> | null)?.[String(weekday)];
  const n = Number(value);
  return value != null && Number.isFinite(n) && n > 0 ? n : basePrice;
};

export const experienceAmount = (mode: PricingMode, unitPrice: number, people: number) =>
  round2(mode === "per_person" ? unitPrice * people : unitPrice);

export const freeCancellationUntil = (bookingStart: Date) =>
  new Date(bookingStart.getTime() - FREE_CANCEL_DAYS * 24 * 60 * 60 * 1000);

export const cancellationQuote = (
  bookingAmount: number,
  total: number,
  bookingStart: Date,
  now = new Date(),
) => {
  const free = now.getTime() <= freeCancellationUntil(bookingStart).getTime();
  const fee = free ? 0 : round2(bookingAmount * LATE_CANCEL_FEE);
  return { free, fee, refund: round2(total - fee) };
};

/**
 * "Porta aberta" — weekly windows in which a farmer receives clients to hand
 * over orders. Stored on farmer_details.pickup_hours as a JSON array.
 */
import i18n from "@/i18n";
export interface PickupWindow {
  /** 0 = Domingo … 6 = Sábado */
  day: number;
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
}

const DAYS = ["0", "1", "2", "3", "4", "5", "6"] as const;

/** Nome do dia no idioma atual (0 = domingo). */
export const dayLabel = (day: number) => i18n.t(`common:days.${DAYS[day]}`);

/** Abreviatura do dia no idioma atual ("Seg", "Mon"…). */
export const dayShort = (day: number) => i18n.t(`common:daysShort.${DAYS[day]}`);

/** Os sete dias, de domingo a sábado. */
export const dayLabels = () => DAYS.map((_, d) => dayLabel(d));

export const parsePickupHours = (raw: unknown): PickupWindow[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (w): w is PickupWindow =>
        !!w &&
        typeof w === "object" &&
        typeof (w as PickupWindow).day === "number" &&
        typeof (w as PickupWindow).start === "string" &&
        typeof (w as PickupWindow).end === "string",
    )
    .filter((w) => w.day >= 0 && w.day <= 6 && w.start < w.end);
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

/** Total hours of open door per week — used for the "more time, more sales" hint. */
export const weeklyHours = (windows: PickupWindow[]) =>
  Math.round(
    (windows.reduce((acc, w) => acc + (toMinutes(w.end) - toMinutes(w.start)), 0) / 60) * 10,
  ) / 10;

export interface PickupStatus {
  open: boolean;
  /** Short human label, e.g. "Porta aberta agora" or "Abre sexta às 09:00". */
  label: string;
}

export const pickupStatus = (
  windows: PickupWindow[],
  now: Date = new Date(),
): PickupStatus | null => {
  if (windows.length === 0) return null;
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();

  const openNow = windows.find(
    (w) => w.day === day && toMinutes(w.start) <= mins && mins < toMinutes(w.end),
  );
  if (openNow) return { open: true, label: i18n.t("common:pickup.openNow", { end: openNow.end }) };

  // Find the next window within the coming 7 days.
  for (let offset = 0; offset < 7; offset++) {
    const d = (day + offset) % 7;
    const candidates = windows
      .filter((w) => w.day === d && (offset > 0 || toMinutes(w.start) > mins))
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    if (candidates.length > 0) {
      const next = candidates[0];
      const time = next.start;
      if (offset === 0) return { open: false, label: i18n.t("common:pickup.opensToday", { time }) };
      if (offset === 1) return { open: false, label: i18n.t("common:pickup.opensTomorrow", { time }) };
      // Em inglês e alemão os dias escrevem-se com maiúscula.
      const dayName = /^(en|de)/.test(i18n.resolvedLanguage ?? "") ? dayLabel(d) : dayLabel(d).toLowerCase();
      return { open: false, label: i18n.t("common:pickup.opensOn", { day: dayName, time }) };
    }
  }
  return { open: false, label: i18n.t("common:pickup.unavailable") };
};

/** True when `date` falls inside one of the farmer's open-door windows. */
export const isWithinPickupWindows = (windows: PickupWindow[], date: Date): boolean => {
  if (windows.length === 0) return true;
  const mins = date.getHours() * 60 + date.getMinutes();
  return windows.some(
    (w) => w.day === date.getDay() && toMinutes(w.start) <= mins && mins < toMinutes(w.end),
  );
};

/**
 * Bookable pickup moments for the coming `days`, in `stepMinutes` steps,
 * restricted to the farmer's open-door windows and always in the future.
 * `earliest` (ex.: prazo mínimo de preparação da entrega) adia o primeiro
 * momento possível; os `days` contam a partir daí.
 */
export const pickupSlots = (
  windows: PickupWindow[],
  {
    days = 14,
    stepMinutes = 30,
    from: now = new Date(),
    earliest,
  }: { days?: number; stepMinutes?: number; from?: Date; earliest?: Date } = {},
): Date[] => {
  if (windows.length === 0) return [];
  const from = earliest && earliest.getTime() > now.getTime() ? earliest : now;
  const slots: Date[] = [];
  for (let offset = 0; offset < days; offset++) {
    const base = new Date(from);
    base.setDate(base.getDate() + offset);
    base.setHours(0, 0, 0, 0);
    const dayWindows = windows
      .filter((w) => w.day === base.getDay())
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    for (const w of dayWindows) {
      for (let m = toMinutes(w.start); m < toMinutes(w.end); m += stepMinutes) {
        const d = new Date(base);
        d.setHours(Math.floor(m / 60), m % 60, 0, 0);
        if (d.getTime() > from.getTime()) slots.push(d);
      }
    }
  }
  return slots.sort((a, b) => a.getTime() - b.getTime());
};

export const formatSlotDate = (d: Date) =>
  `${dayShort(d.getDay())}, ${d.getDate()}/${d.getMonth() + 1}`;

export const formatSlotTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Groups windows by day for display: "Seg 09:00–13:00, 15:00–18:00". */

export const formatPickupHours = (windows: PickupWindow[]): string[] => {
  const byDay = new Map<number, PickupWindow[]>();
  for (const w of windows) {
    byDay.set(w.day, [...(byDay.get(w.day) ?? []), w]);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(
      ([d, list]) =>
        `${dayShort(d)} ${list
          .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
          .map((w) => `${w.start}–${w.end}`)
          .join(", ")}`,
    );
};

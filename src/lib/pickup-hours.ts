/**
 * "Porta aberta" — weekly windows in which a farmer receives clients to hand
 * over orders. Stored on farmer_details.pickup_hours as a JSON array.
 */
export interface PickupWindow {
  /** 0 = Domingo … 6 = Sábado */
  day: number;
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
}

export const DAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
  if (openNow) return { open: true, label: `Porta aberta agora (até ${openNow.end})` };

  // Find the next window within the coming 7 days.
  for (let offset = 0; offset < 7; offset++) {
    const d = (day + offset) % 7;
    const candidates = windows
      .filter((w) => w.day === d && (offset > 0 || toMinutes(w.start) > mins))
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    if (candidates.length > 0) {
      const next = candidates[0];
      const when = offset === 0 ? "hoje" : offset === 1 ? "amanhã" : DAY_LABELS[d].toLowerCase();
      return { open: false, label: `Abre ${when} às ${next.start}` };
    }
  }
  return { open: false, label: "Horário indisponível" };
};

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
        `${DAY_SHORT[d]} ${list
          .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
          .map((w) => `${w.start}–${w.end}`)
          .join(", ")}`,
    );
};

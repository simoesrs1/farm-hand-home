// Levantamento na quinta ou entrega ao domicílio (feita pelo próprio agricultor).
//
// Mesma regra de src/lib/fulfillment.ts e src/lib/pickup-hours.ts (o browser
// usa essas para mostrar); esta é a que valida a encomenda.
//   products.delivery_mode: pickup → só levantamento; shipping → só entrega;
//   both → à escolha do cliente, entre as opções comuns a todos os produtos.

export type DeliveryMode = "pickup" | "shipping" | "both";
export type Fulfillment = "pickup" | "delivery";

export const modeAllowsPickup = (mode: DeliveryMode) => mode !== "shipping";
export const modeAllowsDelivery = (mode: DeliveryMode) => mode !== "pickup";

export function fulfillmentOptions(modes: DeliveryMode[], delivers: boolean): Fulfillment[] {
  if (modes.length === 0) return [];
  const options: Fulfillment[] = [];
  if (modes.every(modeAllowsPickup)) options.push("pickup");
  if (delivers && modes.every(modeAllowsDelivery)) options.push("delivery");
  return options;
}

/** Distância em linha reta (Haversine), em km. Igual a src/lib/geo.ts. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Janelas semanais (porta aberta ou horário de entregas), em Europe/Lisbon.
export interface TimeWindow {
  day: number;
  start: string;
  end: string;
}

export function parseWindows(raw: unknown): TimeWindow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (w): w is TimeWindow =>
      !!w &&
      typeof w === "object" &&
      typeof (w as TimeWindow).day === "number" &&
      typeof (w as TimeWindow).start === "string" &&
      typeof (w as TimeWindow).end === "string" &&
      (w as TimeWindow).start < (w as TimeWindow).end,
  );
}

const LISBON = "Europe/Lisbon";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday + minutes-of-day of a Date, as seen in Europe/Lisbon. */
function lisbonParts(date: Date): { day: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: LISBON,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = WEEKDAYS.indexOf(get("weekday"));
  const hour = parseInt(get("hour"), 10) % 24;
  const minute = parseInt(get("minute"), 10);
  return { day, minutes: hour * 60 + minute };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

export function isWithinWindows(windows: TimeWindow[], date: Date): boolean {
  if (windows.length === 0) return true;
  const { day, minutes } = lisbonParts(date);
  return windows.some((w) => w.day === day && toMinutes(w.start) <= minutes && minutes < toMinutes(w.end));
}

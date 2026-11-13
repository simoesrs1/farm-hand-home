/**
 * Sessões das experiências: horas de início por dia da semana, na hora de
 * Lisboa. Guardadas em farm_experiences.sessions como
 * [{ "day": 6, "times": ["10:00", "15:00"] }] (0 = domingo).
 */
export interface SessionDay {
  day: number;
  times: string[];
}

export interface SessionSlot {
  /** AAAA-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
}

/** Ordem de apresentação: segunda a domingo. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const normalizeSessions = (raw: unknown): SessionDay[] => {
  if (!Array.isArray(raw)) return [];
  const byDay = new Map<number, Set<string>>();
  for (const s of raw) {
    const day = Number((s as SessionDay)?.day);
    const times = (s as SessionDay)?.times;
    if (!Number.isInteger(day) || day < 0 || day > 6 || !Array.isArray(times)) continue;
    const set = byDay.get(day) ?? new Set<string>();
    for (const t of times) if (typeof t === "string" && TIME_RE.test(t)) set.add(t);
    if (set.size) byDay.set(day, set);
  }
  return WEEK_ORDER.filter((d) => byDay.has(d)).map((d) => ({ day: d, times: [...byDay.get(d)!].sort() }));
};

/** Dia da semana de uma data de calendário, sem depender do fuso do browser. */
export const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

export const addDaysISO = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Data e hora (HH:MM) de um instante, em Lisboa. */
export const lisbonParts = (date: Date): SessionSlot => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
};

export const slotKey = (s: SessionSlot) => `${s.date} ${s.time}`;

/** Próximas sessões, a partir de agora (hora de Lisboa). */
export const upcomingSessions = (sessions: SessionDay[], days = 60, now = new Date()): SessionSlot[] => {
  const today = lisbonParts(now);
  const out: SessionSlot[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(today.date, i);
    const times = sessions.find((s) => s.day === weekdayOf(date))?.times ?? [];
    for (const time of times) {
      if (i === 0 && time <= today.time) continue;
      out.push({ date, time });
    }
  }
  return out;
};

export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ") || "0 min";
};

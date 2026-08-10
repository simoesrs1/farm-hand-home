import { DAY_LABELS, type PickupWindow } from "./pickup-hours";

const ICAL_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const pad = (n: number) => String(n).padStart(2, "0");

const toLocalStamp = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}00`;

const toUtcStamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours(),
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

const escape = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** First date on/after `from` that falls on the given weekday, at HH:MM. */
const nextOccurrence = (day: number, hhmm: string, from: Date) => {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const d = new Date(from);
  d.setHours(h || 0, m || 0, 0, 0);
  const diff = (day - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
};

/**
 * Builds an iCalendar (.ics) feed with one weekly recurring event per pickup
 * window, so clients can subscribe to a farmer's "porta aberta" schedule.
 */
export const buildPickupIcs = (
  windows: PickupWindow[],
  farmName: string,
  note?: string,
): string => {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FarmConnect//Disponibilidade//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(`Porta aberta — ${farmName}`)}`,
  ];

  windows.forEach((w, i) => {
    const start = nextOccurrence(w.day, w.start, now);
    const end = nextOccurrence(w.day, w.end, start);
    lines.push(
      "BEGIN:VEVENT",
      `UID:farmconnect-${w.day}-${w.start.replace(":", "")}-${i}@farmconnect`,
      `DTSTAMP:${toUtcStamp(now)}`,
      `DTSTART:${toLocalStamp(start)}`,
      `DTEND:${toLocalStamp(end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${ICAL_DAYS[w.day]}`,
      `SUMMARY:${escape(`Porta aberta — ${farmName}`)}`,
      `DESCRIPTION:${escape(
        `${DAY_LABELS[w.day]} das ${w.start} às ${w.end}. Levantamento de encomendas na quinta.${
          note ? ` ${note}` : ""
        }`,
      )}`,
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
};

export const downloadPickupIcs = (
  windows: PickupWindow[],
  farmName: string,
  note?: string,
) => {
  const ics = buildPickupIcs(windows, farmName, note);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `porta-aberta-${farmName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "agricultor"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

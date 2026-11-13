import { describe, expect, it } from "vitest";
import { cancellationQuote, experienceAmount, unitPriceFor } from "@/lib/experience-pricing";
import { normalizeSessions, upcomingSessions, weekdayOf } from "@/lib/experience-sessions";

describe("preços das experiências", () => {
  it("usa o preço do dia ou o preço base", () => {
    expect(unitPriceFor(20, { "6": 30 }, 6)).toBe(30);
    expect(unitPriceFor(20, { "6": 30 }, 2)).toBe(20);
    expect(unitPriceFor(20, { "6": "" }, 6)).toBe(20);
  });

  it("multiplica por pessoa só no preço por pessoa", () => {
    expect(experienceAmount("per_person", 12.5, 3)).toBe(37.5);
    expect(experienceAmount("per_group", 80, 6)).toBe(80);
  });

  it("cancelamento grátis até 5 dias antes", () => {
    const start = new Date("2026-12-20T10:00:00Z");
    expect(cancellationQuote(100, 108, start, new Date("2026-12-15T10:00:00Z"))).toEqual({ free: true, fee: 0, refund: 108 });
  });

  it("depois retém 25% da experiência e devolve os brindes pagos", () => {
    const start = new Date("2026-12-20T10:00:00Z");
    expect(cancellationQuote(100, 108, start, new Date("2026-12-15T10:01:00Z"))).toEqual({ free: false, fee: 25, refund: 83 });
  });
});

describe("sessões das experiências", () => {
  it("normaliza, ordena e ignora horas inválidas", () => {
    expect(normalizeSessions([{ day: 0, times: ["15:00", "10:00", "25:00"] }, { day: 1, times: ["09:30"] }, { day: 9, times: ["10:00"] }])).toEqual([
      { day: 1, times: ["09:30"] },
      { day: 0, times: ["10:00", "15:00"] },
    ]);
  });

  it("calcula o dia da semana da data de calendário", () => {
    expect(weekdayOf("2026-11-14")).toBe(6);
  });

  it("lista as próximas sessões sem as que já passaram hoje", () => {
    const sessions = normalizeSessions([{ day: 6, times: ["10:00", "15:00"] }]);
    // Sábado, 14/11/2026, 12:00 em Lisboa (UTC+0 no inverno).
    const slots = upcomingSessions(sessions, 8, new Date("2026-11-14T12:00:00Z"));
    expect(slots).toEqual([
      { date: "2026-11-14", time: "15:00" },
      { date: "2026-11-21", time: "10:00" },
      { date: "2026-11-21", time: "15:00" },
    ]);
  });
});

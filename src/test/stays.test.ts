import { describe, expect, it } from "vitest";
import { overlapsBlocked, stayAmount, stayNights } from "@/lib/stay-pricing";

describe("alojamento", () => {
  it("conta as noites entre a entrada e a saída", () => {
    expect(stayNights("2026-11-13", "2026-11-16")).toEqual(["2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(stayNights("2026-11-13", "2026-11-13")).toEqual([]);
  });

  it("usa o preço de cada noite e multiplica por quarto", () => {
    // Sexta 13/11 (dia 5) a 70€, sábado 14/11 (dia 6) a 90€, domingo 15/11 ao preço base.
    expect(stayAmount("per_room", 60, { "5": 70, "6": 90 }, "2026-11-13", "2026-11-16", 3, 2)).toBe((70 + 90 + 60) * 2);
  });

  it("multiplica por hóspede no preço por pessoa", () => {
    expect(stayAmount("per_person", 25, {}, "2026-11-13", "2026-11-15", 3, 1)).toBe(150);
  });

  it("deteta datas fechadas dentro da estadia", () => {
    const blocked = [{ start_date: "2026-12-24", end_date: "2026-12-26" }];
    expect(overlapsBlocked(blocked, "2026-12-20", "2026-12-24")).toBe(false);
    expect(overlapsBlocked(blocked, "2026-12-26", "2026-12-28")).toBe(true);
    expect(overlapsBlocked(blocked, "2026-12-27", "2026-12-29")).toBe(false);
  });
});

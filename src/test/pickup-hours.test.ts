import { describe, expect, it } from "vitest";
import { pickupSlots } from "@/lib/pickup-hours";

// Datas locais (o carrinho usa a hora do browser).
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe("pickupSlots", () => {
  // Terça-feira, 17/11/2026, 10:00.
  const now = at(2026, 11, 17, 10, 0);
  const tuesdayMorning = [{ day: 2, start: "09:00", end: "11:00" }];

  it("só devolve momentos futuros dentro das janelas", () => {
    const slots = pickupSlots(tuesdayMorning, { from: now, days: 1 });
    expect(slots.map((s) => s.getHours() * 60 + s.getMinutes())).toEqual([10 * 60 + 30]);
  });

  it("sem janelas não há momentos", () => {
    expect(pickupSlots([], { from: now })).toEqual([]);
  });

  it("o prazo mínimo adia o primeiro momento", () => {
    const earliest = at(2026, 11, 19, 12, 0); // quinta-feira
    const slots = pickupSlots(tuesdayMorning, { from: now, earliest, days: 14 });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.getTime() > earliest.getTime())).toBe(true);
    // A primeira terça possível é a da semana seguinte.
    expect(slots[0].getDate()).toBe(24);
  });

  it("um prazo mínimo no passado não altera nada", () => {
    const past = at(2026, 11, 1);
    expect(pickupSlots(tuesdayMorning, { from: now, earliest: past, days: 1 })).toEqual(
      pickupSlots(tuesdayMorning, { from: now, days: 1 }),
    );
  });
});

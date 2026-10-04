import { afterEach, describe, expect, it, vi } from "vitest";
import {
  farmerRank,
  isPaused,
  levelFor,
  nextLevel,
  suggestedActions,
} from "@/lib/farmer-activity";

describe("levelFor", () => {
  it("segue os limiares da base de dados", () => {
    expect(levelFor(0)).toBe("semente");
    expect(levelFor(39)).toBe("semente");
    expect(levelFor(40)).toBe("rebento");
    expect(levelFor(69)).toBe("rebento");
    expect(levelFor(70)).toBe("colheita");
    expect(levelFor(89)).toBe("colheita");
    expect(levelFor(90)).toBe("pomar");
    expect(levelFor(100)).toBe("pomar");
  });
});

describe("nextLevel", () => {
  it("indica os pontos em falta", () => {
    expect(nextLevel(55)).toMatchObject({ id: "colheita", missing: 15 });
  });
  it("devolve null no nível máximo", () => {
    expect(nextLevel(95)).toBeNull();
  });
});

describe("farmerRank", () => {
  it("soma atividade e certificados, tratando nulos como 0", () => {
    expect(farmerRank(80, 30)).toBe(110);
    expect(farmerRank(null, 20)).toBe(20);
    expect(farmerRank(undefined, undefined)).toBe(0);
  });
  it("um agricultor ativo sem certificados pode ultrapassar um certificado parado", () => {
    expect(farmerRank(90, 0)).toBeGreaterThan(farmerRank(20, 50));
  });
});

describe("isPaused", () => {
  afterEach(() => vi.useRealTimers());

  it("está em pausa até ao dia de regresso (exclusive)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T10:00:00Z"));
    expect(isPaused("2026-10-05")).toBe(true);
    expect(isPaused("2026-10-04")).toBe(false);
    expect(isPaused("2026-10-01")).toBe(false);
    expect(isPaused(null)).toBe(false);
  });
});

describe("suggestedActions", () => {
  it("sugere o primeiro produto quando não há catálogo", () => {
    const actions = suggestedActions({ catalog: { active_products: 0 } });
    expect(actions[0].to).toBe("/agricultor/produtos/novo");
  });

  it("prioriza encomendas pendentes e limita a 3 ações", () => {
    const actions = suggestedActions({
      orders: { pending: 2 },
      catalog: { active_products: 5, in_stock_products: 2, days_since_update: 20 },
      chat: { client_messages: 4, answered: 1 },
    });
    expect(actions).toHaveLength(3);
    expect(actions[0].text).toContain("2 encomendas pendentes");
  });

  it("não sugere nada a um agricultor em dia", () => {
    expect(
      suggestedActions({
        orders: { pending: 0 },
        catalog: { active_products: 3, in_stock_products: 3, days_since_update: 2 },
        chat: { client_messages: 2, answered: 2 },
      }),
    ).toEqual([]);
  });
});

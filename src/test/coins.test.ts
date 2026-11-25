import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COIN_RULES, coinsForOrder, coinsToEuroHint, parseCoinsSummary } from "@/lib/coins";

describe("COIN_RULES", () => {
  it("coincide com a tabela coin_rules da migração", () => {
    const sql = readFileSync(
      resolve(__dirname, "../../supabase/migrations/20261125120000_coins_clientes.sql"),
      "utf-8",
    );
    const block = sql.slice(sql.indexOf("INSERT INTO public.coin_rules"), sql.indexOf("ON CONFLICT (key)"));
    const fromSql = Object.fromEntries(
      [...block.matchAll(/\('(\w+)',\s*(\d+)\)/g)].map(([, key, value]) => [key, Number(value)]),
    );
    expect(fromSql).toEqual(COIN_RULES);
  });
});

describe("coinsForOrder", () => {
  it("dá 1 coin por cada euro gasto, sem a taxa de entrega", () => {
    expect(coinsForOrder(23.9, 3, "product")).toBe(20);
    expect(coinsForOrder(0.99, 0, "product")).toBe(0);
  });

  it("acrescenta os bónus de subscrição, experiência e estadia", () => {
    expect(coinsForOrder(10, 0, "subscription")).toBe(10 + COIN_RULES.subscription_bonus);
    expect(coinsForOrder(40, 0, "experience")).toBe(40 + COIN_RULES.booking_bonus);
    expect(coinsForOrder(120.5, 0, "stay")).toBe(120 + COIN_RULES.booking_bonus);
  });

  it("nunca dá coins negativas", () => {
    expect(coinsForOrder(2, 5, "product")).toBe(0);
  });
});

describe("coinsToEuroHint", () => {
  it("100 coins valem cerca de 1 € em brindes", () => {
    expect(coinsToEuroHint(300)).toBe(3);
    expect(coinsToEuroHint(-5)).toBe(0);
  });
});

describe("parseCoinsSummary", () => {
  it("tolera uma resposta vazia", () => {
    expect(parseCoinsSummary(null)).toEqual({
      available: 0,
      pending: 0,
      pending_lots: [],
      expiring_lots: [],
      movements: [],
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  deliveriesPerPeriod,
  includesList,
  isValidIntervalPair,
  pricePerDelivery,
  validatePlan,
  type PlanFormValues,
} from "@/lib/subscriptions";

const valid: PlanFormValues = {
  title: "Cabaz da horta",
  description: "Legumes da época colhidos na véspera da entrega.",
  includes: "2 kg de batata\n- 1 molho de couves\n\n• 6 ovos",
  price: "40,00",
  billingInterval: "month",
  deliveryInterval: "week",
  preparationDays: "2",
  radiusKm: "15",
};

describe("subscrições", () => {
  it("entregas por cobrança (igual à função SQL)", () => {
    expect(deliveriesPerPeriod("month", "week")).toBe(4);
    expect(deliveriesPerPeriod("month", "fortnight")).toBe(2);
    expect(deliveriesPerPeriod("fortnight", "week")).toBe(2);
    expect(deliveriesPerPeriod("week", "week")).toBe(1);
    expect(pricePerDelivery(40, "month", "week")).toBe(10);
    expect(pricePerDelivery(25, "month", "fortnight")).toBe(12.5);
  });

  it("a entrega não pode ser menos frequente do que a cobrança", () => {
    expect(isValidIntervalPair("month", "week")).toBe(true);
    expect(isValidIntervalPair("week", "month")).toBe(false);
    expect(isValidIntervalPair("fortnight", "month")).toBe(false);
  });

  it("o que inclui: uma linha por artigo, sem marcadores nem linhas vazias", () => {
    expect(includesList(valid.includes)).toEqual(["2 kg de batata", "1 molho de couves", "6 ovos"]);
  });

  it("valida o plano como a base de dados", () => {
    expect(validatePlan(valid)).toEqual({});
    const bad = validatePlan({
      ...valid,
      title: "ab",
      description: "curta",
      includes: " \n ",
      price: "0",
      billingInterval: "week",
      deliveryInterval: "month",
      preparationDays: "0",
      radiusKm: "500",
    });
    expect(Object.keys(bad).sort()).toEqual(
      ["deliveryInterval", "description", "includes", "preparationDays", "price", "radiusKm", "title"].sort(),
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  deliveryModeLabel,
  earliestDelivery,
  farmerDelivers,
  farmerDeliversFromProfile,
  fulfillmentOptions,
  isWithinDeliveryRadius,
  preparationDays,
} from "@/lib/fulfillment";

const farm = { lat: 38.7223, lng: -9.1393 }; // Lisboa

describe("fulfillment", () => {
  it("oferece só as opções comuns a todos os produtos", () => {
    expect(fulfillmentOptions(["both", "both"], { delivers: true })).toEqual(["pickup", "delivery"]);
    expect(fulfillmentOptions(["both", "pickup"], { delivers: true })).toEqual(["pickup"]);
    expect(fulfillmentOptions(["both", "shipping"], { delivers: true })).toEqual(["delivery"]);
    expect(fulfillmentOptions(["pickup", "shipping"], { delivers: true })).toEqual([]);
    expect(fulfillmentOptions([], { delivers: true })).toEqual([]);
  });

  it("sem entregas configuradas pelo agricultor não oferece entrega", () => {
    expect(fulfillmentOptions(["both"], { delivers: false })).toEqual(["pickup"]);
    expect(fulfillmentOptions(["shipping"], { delivers: false })).toEqual([]);
  });

  it("o agricultor entrega só com raio e localização", () => {
    expect(farmerDelivers(10, farm)).toBe(true);
    expect(farmerDelivers(0, farm)).toBe(false);
    expect(farmerDelivers(null, farm)).toBe(false);
    expect(farmerDelivers(10, null)).toBe(false);
  });

  it("o prazo de preparação é o maior dos produtos", () => {
    expect(preparationDays([{ shipping_days: 2 }, { shipping_days: 3 }, { shipping_days: null }])).toBe(3);
    expect(preparationDays([])).toBe(0);
    const now = new Date("2026-11-17T10:00:00Z");
    expect(earliestDelivery(2, now).toISOString()).toBe("2026-11-19T10:00:00.000Z");
  });

  it("valida o raio de entrega", () => {
    const almada = { lat: 38.6791, lng: -9.1569 };
    const porto = { lat: 41.1579, lng: -8.6291 };
    expect(isWithinDeliveryRadius(farm, almada, 10)).toBe(true);
    expect(isWithinDeliveryRadius(farm, porto, 50)).toBe(false);
  });

  it("descreve o modo do produto", () => {
    expect(deliveryModeLabel("pickup")).toBe("Levantamento na quinta");
    expect(deliveryModeLabel("shipping")).toBe("Entrega ao domicílio pelo agricultor");
    expect(deliveryModeLabel("both")).toBe("Levantamento ou entrega ao domicílio");
  });

  it("sem zona de entrega só anuncia o que o cliente pode escolher", () => {
    expect(deliveryModeLabel("both", false)).toBe("Levantamento na quinta");
    expect(deliveryModeLabel("shipping", false)).toBe("Entrega ao domicílio ainda indisponível");
    expect(deliveryModeLabel("pickup", false)).toBe("Levantamento na quinta");
  });

  it("lê a zona de entrega de um perfil público", () => {
    expect(farmerDeliversFromProfile({ delivery_radius_km: 15, pickup_lat: 38.7, pickup_lng: -9.1 })).toBe(true);
    expect(farmerDeliversFromProfile({ delivery_radius_km: 15, pickup_lat: null, pickup_lng: -9.1 })).toBe(false);
    expect(farmerDeliversFromProfile(null)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  deriveGroup,
  emptyChoice,
  groupProblem,
  type CartProduct,
  type FarmerSettings,
} from "@/lib/cart-groups";

// Segunda-feira, 23/11/2026, 09:00 (hora local do teste).
const NOW = new Date(2026, 10, 23, 9, 0, 0);

const farm: FarmerSettings = {
  pickupWindows: [{ day: 1, start: "10:00", end: "12:00" }],
  pickupNote: "",
  deliveryWindows: [],
  deliveryNote: "",
  radiusKm: 20,
  farmPoint: { lat: 40.2, lng: -8.4 },
  freeThreshold: 30,
};

const product = (id: string, mode: CartProduct["delivery_mode"], fee = 3): CartProduct => ({
  id,
  delivery_mode: mode,
  delivery_tracking: false,
  delivery_fee: fee,
  shipping_days: 0,
});

describe("carrinho por agricultor", () => {
  it("ainda a carregar: não está pronto e não deixa pagar", () => {
    const state = deriveGroup(null, farm, emptyChoice(), 10, NOW);
    expect(state.ready).toBe(false);
    expect(groupProblem(state, emptyChoice())).toBe("loading");
  });

  it("a escolha vale para todos os artigos e só mostra as opções comuns", () => {
    const both = deriveGroup([product("a", "both"), product("b", "both")], farm, emptyChoice("delivery"), 10, NOW);
    expect(both.options).toEqual(["pickup", "delivery"]);
    expect(both.fulfillment).toBe("delivery");

    // Um artigo só de levantamento: a entrega deixa de ser possível para o grupo.
    const mixed = deriveGroup([product("a", "both"), product("b", "pickup")], farm, emptyChoice("delivery"), 10, NOW);
    expect(mixed.options).toEqual(["pickup"]);
    expect(mixed.fulfillment).toBe("pickup");
  });

  it("sem forma de entrega em comum", () => {
    const state = deriveGroup([product("a", "pickup"), product("b", "shipping")], farm, emptyChoice(), 10, NOW);
    expect(state.noCommonOption).toBe(true);
    expect(groupProblem(state, emptyChoice())).toBe("noCommon");
  });

  it("levantamento exige horário dentro da porta aberta", () => {
    const choice = emptyChoice("pickup");
    const state = deriveGroup([product("a", "both")], farm, choice, 10, NOW);
    expect(state.slots.length).toBeGreaterThan(0);
    expect(groupProblem(state, choice)).toBe("choosePickup");

    const withSlot = { ...choice, slot: state.slots[0].toISOString() };
    expect(groupProblem(deriveGroup([product("a", "both")], farm, withSlot, 10, NOW), withSlot)).toBeNull();

    // Um horário que já não existe é ignorado.
    const stale = { ...choice, slot: new Date(2020, 0, 1).toISOString() };
    expect(deriveGroup([product("a", "both")], farm, stale, 10, NOW).slot).toBe("");
  });

  it("entrega: morada, ponto no mapa e raio; preço da entrega por agricultor", () => {
    const base = emptyChoice("delivery");
    const products = [product("a", "both", 3), product("b", "both", 5)];
    const state = deriveGroup(products, farm, base, 10, NOW);
    expect(state.deliveryFee?.fee).toBe(5);
    expect(state.total).toBe(15);
    expect(groupProblem(state, base)).toBe("noAddress");

    const withAddress = { ...base, address: "Rua das Flores, 1" };
    expect(groupProblem(deriveGroup(products, farm, withAddress, 10, NOW), withAddress)).toBe("noPoint");

    const far = { ...withAddress, point: { lat: 41.5, lng: -8.4 } };
    const farState = deriveGroup(products, farm, far, 10, NOW);
    expect(farState.outOfRadius).toBe(true);
    expect(groupProblem(farState, far)).toBe("outOfRadius");

    const near = { ...withAddress, point: { lat: 40.21, lng: -8.41 } };
    expect(groupProblem(deriveGroup(products, farm, near, 10, NOW), near)).toBeNull();

    // Acima do limite do agricultor, a entrega é grátis.
    expect(deriveGroup(products, farm, near, 40, NOW).deliveryFee?.fee).toBe(0);
  });
});

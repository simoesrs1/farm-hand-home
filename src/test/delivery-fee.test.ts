import { describe, expect, it } from "vitest";
import { computeDeliveryFee } from "@/lib/delivery-fee";

describe("computeDeliveryFee", () => {
  it("sem produtos não cobra nada", () => {
    const r = computeDeliveryFee([], 10, null);
    expect(r).toEqual({ fee: 0, baseFee: 0, freeByThreshold: false, remainingForFree: null });
  });

  it("cobra o preço mais alto entre os produtos", () => {
    const r = computeDeliveryFee([{ delivery_fee: 2.5 }, { delivery_fee: 4 }, { delivery_fee: null }], 10, null);
    expect(r.fee).toBe(4);
    expect(r.remainingForFree).toBeNull();
  });

  it("fica grátis quando o carrinho atinge o limite", () => {
    const r = computeDeliveryFee([{ delivery_fee: 3 }], 30, 30);
    expect(r).toEqual({ fee: 0, baseFee: 3, freeByThreshold: true, remainingForFree: null });
  });

  it("indica quanto falta para a entrega grátis", () => {
    const r = computeDeliveryFee([{ delivery_fee: 3 }], 22.6, 30);
    expect(r.fee).toBe(3);
    expect(r.remainingForFree).toBe(7.4);
  });

  it("entrega a 0 € não mostra limite", () => {
    const r = computeDeliveryFee([{ delivery_fee: 0 }], 5, 30);
    expect(r).toEqual({ fee: 0, baseFee: 0, freeByThreshold: false, remainingForFree: null });
  });
});

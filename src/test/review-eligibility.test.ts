import { describe, expect, it } from "vitest";
import { canFileDeliveryComplaint, reviewContext, type ReviewableOrder } from "@/lib/review-eligibility";

const HOUR = 60 * 60 * 1000;
const expected = new Date("2026-11-10T10:00:00Z");
const order = (over: Partial<ReviewableOrder> = {}): ReviewableOrder => ({
  status: "awaiting_pickup",
  delivery_address: "Rua A, 1",
  expected_delivery_at: expected.toISOString(),
  pickup_deadline: "2026-12-01T10:00:00Z",
  ...over,
});
const after = (hours: number) => expected.getTime() + hours * HOUR;

describe("reviewContext", () => {
  it("permite avaliar depois de entregue", () => {
    expect(reviewContext(order({ status: "delivered" }), after(-48))).toBe("delivered");
  });

  it("permite avaliar quando o agricultor cancela", () => {
    expect(reviewContext(order({ status: "refunded", delivery_address: null }))).toBe("cancelled");
  });

  it("só considera atraso depois das 24 h", () => {
    expect(reviewContext(order(), after(24))).toBeNull();
    expect(reviewContext(order(), after(24.1))).toBe("late");
  });

  it("não considera atraso num levantamento", () => {
    expect(reviewContext(order({ delivery_address: null }), after(100))).toBeNull();
  });

  it("usa o prazo limite nas encomendas sem data prevista", () => {
    const old = order({ expected_delivery_at: null });
    expect(reviewContext(old, after(100))).toBeNull();
    expect(reviewContext(old, new Date("2026-12-02T10:30:00Z").getTime())).toBe("late");
  });
});

describe("canFileDeliveryComplaint", () => {
  it("só aceita entregas atrasadas ainda por entregar", () => {
    expect(canFileDeliveryComplaint(order(), after(25))).toBe(true);
    expect(canFileDeliveryComplaint(order(), after(2))).toBe(false);
    expect(canFileDeliveryComplaint(order({ status: "expired" }), after(25))).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { distanceKm, formatKm, withinRadius } from "@/lib/geo";

const lisboa = { lat: 38.7223, lng: -9.1393 };
const porto = { lat: 41.1579, lng: -8.6291 };

describe("geo", () => {
  it("calcula a distância Lisboa–Porto (cerca de 274 km em linha reta)", () => {
    expect(distanceKm(lisboa, porto)).toBeGreaterThan(270);
    expect(distanceKm(lisboa, porto)).toBeLessThan(278);
  });

  it("filtra pelo raio e ordena do mais perto", () => {
    const pts = [
      { id: "porto", ...porto },
      { id: "sintra", lat: 38.8029, lng: -9.3817 },
      { id: "almada", lat: 38.6791, lng: -9.1569 },
    ];
    expect(withinRadius(pts, lisboa, 50).map((p) => p.id)).toEqual(["almada", "sintra"]);
  });

  it("formata quilómetros", () => {
    expect(formatKm(3.24)).toBe("3,2 km");
    expect(formatKm(48.6)).toBe("49 km");
  });
});

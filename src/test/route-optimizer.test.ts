import { describe, expect, it } from "vitest";
import {
  buildDistanceMatrix,
  googleMapsDirectionsUrls,
  optimizeRoute,
  routeCost,
} from "@/lib/route-optimizer";

// Matriz simples numa reta: quinta em 0, paragens em 1, 2, 3 e 10 km.
const line = (positions: number[]) => {
  const pts = [0, ...positions];
  return pts.map((a) => pts.map((b) => Math.abs(a - b)));
};

// Força bruta para comparar com o resultado exato.
const bruteForce = (matrix: number[][], returnToOrigin: boolean) => {
  const n = matrix.length - 1;
  let best = Infinity;
  const permute = (rest: number[], acc: number[]) => {
    if (rest.length === 0) {
      best = Math.min(best, routeCost(matrix, acc, { returnToOrigin }));
      return;
    }
    rest.forEach((x, i) => permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, x]));
  };
  permute([...Array(n).keys()], []);
  return best;
};

// Gerador determinístico para os testes aleatórios.
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

describe("route-optimizer", () => {
  it("lida com 0, 1 e 2 paragens", () => {
    expect(optimizeRoute(line([]), { returnToOrigin: false })).toEqual({ order: [], cost: 0 });
    expect(optimizeRoute(line([5]), { returnToOrigin: false })).toEqual({ order: [0], cost: 5 });
    expect(optimizeRoute(line([8, 3]), { returnToOrigin: false })).toEqual({ order: [1, 0], cost: 8 });
  });

  it("reordena paragens marcadas por hora num percurso mais curto", () => {
    // Por hora: 10 → 1 → 3 (custo 10 + 9 + 2 = 21); o ótimo é 1 → 3 → 10 (custo 10).
    const matrix = line([10, 1, 3]);
    expect(routeCost(matrix, [0, 1, 2], { returnToOrigin: false })).toBe(21);
    expect(optimizeRoute(matrix, { returnToOrigin: false })).toEqual({ order: [1, 2, 0], cost: 10 });
  });

  it("considera o regresso à quinta quando pedido", () => {
    // Paragens dos dois lados da quinta: com regresso, a ordem tem de cobrir os dois lados.
    const matrix = line([-2, 6]);
    const open = optimizeRoute(matrix, { returnToOrigin: false });
    const closed = optimizeRoute(matrix, { returnToOrigin: true });
    expect(open).toEqual({ order: [0, 1], cost: 10 });
    expect(closed.cost).toBe(16);
  });

  it("dá o mesmo custo que a força bruta (pontos aleatórios)", () => {
    const rand = seeded(42);
    for (let t = 0; t < 20; t++) {
      const origin = { lat: 39 + rand(), lng: -8 - rand() };
      const stops = Array.from({ length: 2 + (t % 6) }, () => ({ lat: 39 + rand(), lng: -8 - rand() }));
      const matrix = buildDistanceMatrix(origin, stops);
      for (const returnToOrigin of [false, true]) {
        const { order, cost } = optimizeRoute(matrix, { returnToOrigin });
        expect([...order].sort((a, b) => a - b)).toEqual([...stops.keys()]);
        expect(cost).toBeCloseTo(bruteForce(matrix, returnToOrigin), 9);
      }
    }
  });

  it("usa a heurística acima de 15 paragens e visita todas uma só vez", () => {
    const rand = seeded(7);
    const stops = Array.from({ length: 25 }, () => ({ lat: 39 + rand(), lng: -8 - rand() }));
    const matrix = buildDistanceMatrix({ lat: 39.5, lng: -8.5 }, stops);
    const { order } = optimizeRoute(matrix, { returnToOrigin: false });
    expect([...order].sort((a, b) => a - b)).toEqual([...stops.keys()]);
  });

  it("aceita coordenadas repetidas", () => {
    const farm = { lat: 39.5, lng: -8 };
    const same = { lat: 39.6, lng: -8.1 };
    const matrix = buildDistanceMatrix(farm, [same, same, { lat: 39.7, lng: -8.2 }]);
    const { order } = optimizeRoute(matrix, { returnToOrigin: false });
    expect([...order].sort()).toEqual([0, 1, 2]);
    expect(order[2]).toBe(2);
  });

  describe("links do Google Maps", () => {
    const pts = (n: number) => Array.from({ length: n }, (_, i) => ({ lat: 39 + i / 100, lng: -8 }));

    it("gera um link com as paragens pela ordem e o destino no fim", () => {
      const [url] = googleMapsDirectionsUrls(pts(3));
      const params = new URL(url).searchParams;
      expect(params.get("api")).toBe("1");
      expect(params.get("origin")).toBeNull();
      expect(params.get("travelmode")).toBe("driving");
      expect(params.get("waypoints")).toBe("39.000000,-8.000000|39.010000,-8.000000");
      expect(params.get("destination")).toBe("39.020000,-8.000000");
    });

    it("uma só paragem não leva waypoints", () => {
      const [url] = googleMapsDirectionsUrls(pts(1));
      expect(new URL(url).searchParams.get("waypoints")).toBeNull();
    });

    it("acrescenta o regresso à quinta como destino", () => {
      const farm = { lat: 40, lng: -9 };
      const [url] = googleMapsDirectionsUrls(pts(2), { returnTo: farm });
      expect(new URL(url).searchParams.get("destination")).toBe("40.000000,-9.000000");
    });

    it("divide em vários links acima de 9 paragens intermédias", () => {
      const urls = googleMapsDirectionsUrls(pts(23));
      expect(urls).toHaveLength(3);
      const waypoints = urls.map((u) => new URL(u).searchParams.get("waypoints")?.split("|").length ?? 0);
      expect(waypoints).toEqual([9, 9, 2]);
      expect(new URL(urls[2]).searchParams.get("destination")).toBe("39.220000,-8.000000");
    });
  });
});

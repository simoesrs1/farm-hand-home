/**
 * Ordem das entregas ao domicílio: o caminho mais curto a partir da quinta,
 * passando por todas as paragens do dia (problema do caixeiro-viajante).
 *
 * Os custos vêm de uma matriz em que o índice 0 é a quinta e os índices
 * 1..n são as paragens. Hoje a matriz é em linha reta (Haversine); pode ser
 * trocada por tempos de condução sem mexer no algoritmo.
 */
import { distanceKm, type LatLng } from "@/lib/geo";

export type CostMatrix = number[][];

export interface OptimizedRoute {
  /** Índices das paragens (0..n-1), pela ordem de visita. */
  order: number[];
  /** Custo total do percurso (na unidade da matriz). */
  cost: number;
}

interface RouteOptions {
  /** Se o percurso termina de volta na quinta. */
  returnToOrigin: boolean;
}

/** Até este número de paragens a solução é exata (Held-Karp); acima disso, heurística. */
const EXACT_MAX_STOPS = 15;

/** Matriz de distâncias em linha reta (km): índice 0 = origem, 1..n = paragens. */
export const buildDistanceMatrix = (origin: LatLng, stops: LatLng[]): CostMatrix => {
  const points = [origin, ...stops];
  return points.map((a) => points.map((b) => distanceKm(a, b)));
};

/** Custo de visitar as paragens pela ordem dada, a partir da origem. */
export const routeCost = (matrix: CostMatrix, order: number[], { returnToOrigin }: RouteOptions) => {
  if (order.length === 0) return 0;
  let cost = 0;
  let prev = 0;
  for (const stop of order) {
    cost += matrix[prev][stop + 1];
    prev = stop + 1;
  }
  return returnToOrigin ? cost + matrix[prev][0] : cost;
};

// Programação dinâmica exata: dp[conjunto visitado][última paragem] = custo mínimo.
const heldKarp = (matrix: CostMatrix, n: number, returnToOrigin: boolean): number[] => {
  const size = 1 << n;
  const dp = new Float64Array(size * n).fill(Infinity);
  const parent = new Int8Array(size * n).fill(-1);
  for (let j = 0; j < n; j++) dp[(1 << j) * n + j] = matrix[0][j + 1];

  for (let mask = 1; mask < size; mask++) {
    for (let j = 0; j < n; j++) {
      const cur = dp[mask * n + j];
      if (!(mask & (1 << j)) || cur === Infinity) continue;
      for (let k = 0; k < n; k++) {
        if (mask & (1 << k)) continue;
        const next = mask | (1 << k);
        const cost = cur + matrix[j + 1][k + 1];
        if (cost < dp[next * n + k]) {
          dp[next * n + k] = cost;
          parent[next * n + k] = j;
        }
      }
    }
  }

  const full = size - 1;
  let last = 0;
  let best = Infinity;
  for (let j = 0; j < n; j++) {
    const cost = dp[full * n + j] + (returnToOrigin ? matrix[j + 1][0] : 0);
    if (cost < best) {
      best = cost;
      last = j;
    }
  }

  const order: number[] = [];
  let mask = full;
  let j = last;
  while (j !== -1) {
    order.push(j);
    const prev = parent[mask * n + j];
    mask &= ~(1 << j);
    j = prev;
  }
  return order.reverse();
};

// Heurística para muitas paragens: vizinho mais próximo, melhorado com 2-opt.
const nearestNeighbourTwoOpt = (matrix: CostMatrix, n: number, options: RouteOptions): number[] => {
  const order: number[] = [];
  const visited = new Set<number>();
  let prev = 0;
  for (let step = 0; step < n; step++) {
    let best = -1;
    for (let k = 0; k < n; k++) {
      if (visited.has(k)) continue;
      if (best === -1 || matrix[prev][k + 1] < matrix[prev][best + 1]) best = k;
    }
    visited.add(best);
    order.push(best);
    prev = best + 1;
  }

  let bestCost = routeCost(matrix, order, options);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
        const cost = routeCost(matrix, candidate, options);
        if (cost < bestCost - 1e-9) {
          order.splice(0, n, ...candidate);
          bestCost = cost;
          improved = true;
        }
      }
    }
  }
  return order;
};

/** Ordem de visita mais curta a partir da origem (índice 0 da matriz). */
export const optimizeRoute = (matrix: CostMatrix, options: RouteOptions): OptimizedRoute => {
  const n = matrix.length - 1;
  if (n <= 0) return { order: [], cost: 0 };
  const order =
    n <= EXACT_MAX_STOPS ? heldKarp(matrix, n, options.returnToOrigin) : nearestNeighbourTwoOpt(matrix, n, options);
  return { order, cost: routeCost(matrix, order, options) };
};

/** Máximo de pontos por link do Google Maps: 9 paragens intermédias + o destino. */
const POINTS_PER_LINK = 10;

const coord = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/**
 * Links do Google Maps (navegação de carro) com as paragens pela ordem dada.
 * Sem origem: a navegação parte de onde o agricultor está. Acima de 9 paragens
 * intermédias, o percurso é dividido em vários links, a seguir uns aos outros.
 */
export const googleMapsDirectionsUrls = (stops: LatLng[], { returnTo }: { returnTo?: LatLng | null } = {}) => {
  const points = returnTo ? [...stops, returnTo] : stops;
  const urls: string[] = [];
  for (let i = 0; i < points.length; i += POINTS_PER_LINK) {
    const chunk = points.slice(i, i + POINTS_PER_LINK);
    const params = new URLSearchParams({
      api: "1",
      destination: coord(chunk[chunk.length - 1]),
      travelmode: "driving",
    });
    if (chunk.length > 1) params.set("waypoints", chunk.slice(0, -1).map(coord).join("|"));
    urls.push(`https://www.google.com/maps/dir/?${params.toString()}`);
  }
  return urls;
};

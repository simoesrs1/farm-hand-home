import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { distanceKm, type LatLng } from "@/lib/geo";
import {
  buildDistanceMatrix,
  googleMapsDirectionsUrls,
  optimizeRoute,
  routeCost,
  type CostMatrix,
} from "@/lib/route-optimizer";
import i18n from "@/i18n";

export interface RouteStop {
  orderId: string;
  label: string;
  address: string | null;
  lat: number;
  lng: number;
  when: Date;
}

export type RouteFarm = LatLng & { name: string };

/** Percurso por estrada (OpenRouteService), pela ordem das paragens do dia. */
export interface RoadRoute {
  /** Pontos [lat, lng] do trajeto. */
  path: [number, number][];
  distanceKm: number;
  durationMin: number;
}

export interface RouteDay {
  key: string;
  date: Date;
  /** Paragens pela ordem do percurso, com a distância em linha reta desde a quinta. */
  stops: (RouteStop & { km: number | null })[];
  /** Km do percurso em linha reta (null sem localização da quinta). */
  totalKm: number | null;
  /** Trajeto por estrada, quando calculado (só com a rota organizada). */
  road: RoadRoute | null;
  /** A calcular o percurso por estrada. */
  roadLoading: boolean;
  /** Mensagem quando o percurso por estrada falhou (fica a estimativa em linha reta). */
  roadError: string | null;
  /** Links do Google Maps com as paragens por esta ordem (vários acima de 9 paragens). */
  mapsUrls: string[];
}

interface Options {
  /** Ordem mais curta a partir da quinta; se falso, ordem pela hora marcada. */
  optimized: boolean;
  /** Se o percurso termina de volta na quinta. */
  returnToOrigin: boolean;
}

interface MatrixResponse {
  durations: CostMatrix;
  distances: CostMatrix;
}

interface DirectionsResponse {
  path: [number, number][];
  distance_km: number;
  duration_min: number;
}

// A Edge Function devolve { error } com a razão; o supabase-js só dá uma mensagem genérica.
const callDeliveryRoute = async <T>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("delivery-route", { body });
  if (error) {
    let msg = i18n.t("farmer:route.roadFailed");
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload?.error) msg = payload.error;
      } catch {
        // corpo não é JSON: fica a mensagem genérica
      }
    }
    throw new Error(msg);
  }
  return data as T;
};

const ROAD_QUERY = { staleTime: 15 * 60 * 1000, gcTime: 30 * 60 * 1000, retry: false } as const;

/**
 * Entregas ao domicílio agrupadas por dia, pela ordem do percurso. Única fonte
 * da ordem: o diálogo "Entregas ao domicílio" e a lista de planeamento em
 * Encomendas usam o mesmo resultado.
 *
 * Com a rota organizada, a ordem usa tempos de condução por estrada e o mapa
 * desenha o trajeto real (Edge Function delivery-route). Se esse cálculo falhar,
 * fica a estimativa em linha reta. Sem a rota organizada não há pedidos externos.
 */
export const useDeliveryRoute = (farm: RouteFarm | null, stops: RouteStop[], { optimized, returnToOrigin }: Options) => {
  // Paragens por dia, pela hora marcada.
  const groups = useMemo(() => {
    const map = new Map<string, { date: Date; stops: RouteStop[] }>();
    for (const s of stops) {
      const key = s.when.toDateString();
      if (!map.has(key)) map.set(key, { date: s.when, stops: [] });
      map.get(key)!.stops.push(s);
    }
    return [...map.entries()]
      .map(([key, g]) => ({
        key,
        date: g.date,
        stops: [...g.stops].sort((a, b) => a.when.getTime() - b.when.getTime()),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [stops]);

  const roadEnabled = optimized && farm != null;

  // 1. Tempos por estrada entre a quinta e as paragens de cada dia.
  const matrixQueries = useQueries({
    queries: groups.map((g) => {
      const ids = g.stops.map((s) => s.orderId);
      return {
        queryKey: ["delivery-route", "matrix", farm?.lat, farm?.lng, ids],
        queryFn: () => callDeliveryRoute<MatrixResponse>({ action: "matrix", order_ids: ids }),
        enabled: roadEnabled && ids.length > 1,
        ...ROAD_QUERY,
      };
    }),
  });
  const matrixKey = matrixQueries.map((q) => `${q.dataUpdatedAt}:${q.errorUpdatedAt}`).join("|");

  // 2. Ordem de cada dia: por hora, ou a mais rápida (tempos por estrada; em linha reta se falharem).
  const ordered = useMemo(
    () =>
      groups.map((g, i) => {
        if (!farm) return { ...g, ordered: g.stops, totalKm: null as number | null, matrixError: null as string | null };
        const straight = buildDistanceMatrix(farm, g.stops);
        const road = optimized ? matrixQueries[i]?.data : undefined;
        const order = optimized
          ? optimizeRoute(road?.durations ?? straight, { returnToOrigin }).order
          : g.stops.map((_, k) => k);
        return {
          ...g,
          ordered: order.map((k) => g.stops[k]),
          totalKm: routeCost(straight, order, { returnToOrigin }),
          matrixError: optimized ? (matrixQueries[i]?.error as Error | null)?.message ?? null : null,
        };
      }),
    // matrixKey muda quando os dados das queries mudam (o array de resultados é novo a cada render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, farm, optimized, returnToOrigin, matrixKey],
  );

  // 3. Trajeto por estrada pela ordem final, para desenhar no mapa.
  const directionsQueries = useQueries({
    queries: ordered.map((d, i) => {
      const ids = d.ordered.map((s) => s.orderId);
      const matrixPending = ids.length > 1 && matrixQueries[i]?.isPending;
      return {
        queryKey: ["delivery-route", "directions", farm?.lat, farm?.lng, ids, returnToOrigin],
        queryFn: () =>
          callDeliveryRoute<DirectionsResponse>({ action: "directions", order_ids: ids, return_to_farm: returnToOrigin }),
        // Espera pela ordem por estrada para não pedir dois trajetos.
        enabled: roadEnabled && ids.length > 0 && !matrixPending,
        ...ROAD_QUERY,
      };
    }),
  });
  const directionsKey = [
    ...directionsQueries.map((q) => `${q.dataUpdatedAt}:${q.errorUpdatedAt}:${q.fetchStatus}`),
    ...matrixQueries.map((q) => q.fetchStatus),
  ].join("|");

  return useMemo<RouteDay[]>(
    () =>
      ordered.map((d, i) => {
        const q = directionsQueries[i];
        const data = roadEnabled ? q?.data : undefined;
        const error = roadEnabled ? d.matrixError ?? (q?.error as Error | null)?.message ?? null : null;
        return {
          key: d.key,
          date: d.date,
          stops: d.ordered.map((s) => ({ ...s, km: farm ? distanceKm(farm, s) : null })),
          totalKm: d.totalKm,
          road: data ? { path: data.path, distanceKm: data.distance_km, durationMin: data.duration_min } : null,
          roadLoading: roadEnabled && !data && !error && (q?.fetchStatus === "fetching" || matrixQueries[i]?.fetchStatus === "fetching"),
          roadError: error,
          mapsUrls: googleMapsDirectionsUrls(d.ordered, { returnTo: returnToOrigin ? farm : null }),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ordered, farm, returnToOrigin, roadEnabled, directionsKey],
  );
};

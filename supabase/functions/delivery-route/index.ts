// Percurso das entregas ao domicílio por estrada (OpenRouteService), para o
// diálogo "Entregas ao domicílio" do agricultor.
//
//   action "matrix":     tempos e distâncias por estrada entre a quinta e as
//                        paragens, para o browser escolher a ordem mais rápida.
//   action "directions": trajeto por estrada pela ordem dada (geometria, km e
//                        tempo), para desenhar no mapa.
//
// Recebe ids de encomendas, nunca coordenadas: as coordenadas são lidas aqui,
// só das encomendas da quinta do agricultor autenticado (não é um proxy aberto).
// A chave do OpenRouteService fica só no servidor (ORS_API_KEY).
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

// api.openrouteservice.org está a ser descontinuado a favor de api.heigit.org
// (https://ask.openrouteservice.org/t/7912).
const ORS_BASE = "https://api.heigit.org/openrouteservice/v2";
// Limites por pedido do OpenRouteService: 50 pontos por percurso.
const MAX_STOPS = 40;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const jsonError = (status: number, message: string) => json(status, { error: message });

async function ors(path: string, apiKey: string, payload: unknown) {
  const res = await fetch(`${ORS_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json, application/geo+json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // 403: quota diária esgotada; 429: demasiados pedidos por minuto.
    console.error("openrouteservice error", res.status, await res.text().catch(() => ""));
    throw new Error(res.status === 403 || res.status === 429 ? "quota" : "ors");
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ORS_API_KEY");
    if (!apiKey) return jsonError(503, "Cálculo de percursos por estrada indisponível.");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "Não autenticado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonError(401, "Sessão inválida");

    const body = await req.json().catch(() => null);
    const action = body?.action;
    if (action !== "matrix" && action !== "directions") return jsonError(400, "Ação inválida");
    const orderIds: unknown = body?.order_ids;
    if (
      !Array.isArray(orderIds) ||
      orderIds.length === 0 ||
      orderIds.length > MAX_STOPS ||
      !orderIds.every((id) => typeof id === "string")
    ) {
      return jsonError(400, "Encomendas inválidas");
    }
    const returnToFarm = body?.return_to_farm === true;

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: farm } = await admin
      .from("farmer_details")
      .select("id, pickup_lat, pickup_lng")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!farm) return jsonError(403, "Apenas agricultores");
    if (farm.pickup_lat == null || farm.pickup_lng == null) {
      return jsonError(400, "Falta a localização da quinta.");
    }

    // Só encomendas desta quinta, com ponto de entrega marcado.
    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("id, delivery_lat, delivery_lng")
      .eq("farmer_id", farm.id)
      .in("id", orderIds as string[])
      .not("delivery_lat", "is", null)
      .not("delivery_lng", "is", null);
    if (ordersErr) throw ordersErr;
    const byId = new Map((orders ?? []).map((o) => [o.id, o]));
    if (byId.size !== new Set(orderIds as string[]).size) return jsonError(403, "Encomendas inválidas");

    // OpenRouteService usa [lng, lat]. A quinta é sempre o primeiro ponto.
    const farmPoint = [Number(farm.pickup_lng), Number(farm.pickup_lat)];
    const stopPoints = (orderIds as string[]).map((id) => {
      const o = byId.get(id)!;
      return [Number(o.delivery_lng), Number(o.delivery_lat)];
    });

    if (action === "matrix") {
      const data = await ors("/matrix/driving-car", apiKey, {
        locations: [farmPoint, ...stopPoints],
        metrics: ["duration", "distance"],
        units: "km",
      });
      return json(200, {
        order_ids: orderIds,
        durations: data.durations, // segundos
        distances: data.distances, // km
      });
    }

    // directions: pela ordem recebida, a partir da quinta (e de volta, se pedido).
    const coordinates = [farmPoint, ...stopPoints, ...(returnToFarm ? [farmPoint] : [])];
    const data = await ors("/directions/driving-car/geojson", apiKey, { coordinates });
    const feature = data?.features?.[0];
    if (!feature) throw new Error("ors");
    const summary = feature.properties?.summary ?? {};
    return json(200, {
      order_ids: orderIds,
      // [lat, lng] para desenhar diretamente no Google Maps.
      path: (feature.geometry?.coordinates ?? []).map((c: number[]) => [c[1], c[0]]),
      distance_km: Number(summary.distance ?? 0) / 1000,
      duration_min: Number(summary.duration ?? 0) / 60,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "quota") {
      return jsonError(429, "Limite diário de cálculos de percurso atingido. Tente mais tarde.");
    }
    console.error("delivery-route error", e);
    return jsonError(502, "Não foi possível calcular o percurso por estrada.");
  }
});

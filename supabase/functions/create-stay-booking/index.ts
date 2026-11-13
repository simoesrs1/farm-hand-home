// Reserva de alojamento na quinta. Toda a validação (datas, quartos livres, preço,
// brindes e stock) é feita de forma atómica em create_stay_booking.
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

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

const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Não autenticado" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Sessão inválida" });

    const body = await req.json().catch(() => null);
    const stayId = body?.stay_id;
    const checkIn = body?.check_in;
    const checkOut = body?.check_out;
    const guests = body?.guests;
    const units = body?.units;
    const paidGiftIds: unknown = body?.paid_gift_ids ?? [];
    const DATE = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof stayId !== "string" || !UUID.test(stayId)) return json(400, { error: "Alojamento inválido" });
    if (typeof checkIn !== "string" || !DATE.test(checkIn) || typeof checkOut !== "string" || !DATE.test(checkOut)) {
      return json(400, { error: "Datas inválidas" });
    }
    const isCount = (n: unknown, max: number) => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= max;
    if (!isCount(guests, 1000)) return json(400, { error: "Número de hóspedes inválido" });
    if (!isCount(units, 50)) return json(400, { error: "Número de quartos inválido" });
    if (!Array.isArray(paidGiftIds) || paidGiftIds.length > 20 || !paidGiftIds.every((g) => typeof g === "string" && UUID.test(g))) {
      return json(400, { error: "Brindes inválidos" });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await admin.rpc("create_stay_booking", {
      p_client: userData.user.id,
      p_stay_id: stayId,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests: guests,
      p_units: units,
      p_paid_gift_ids: paidGiftIds,
    });
    // P0001: erros de regra (RAISE EXCEPTION), com mensagem para o cliente.
    if (error) {
      if (error.code === "P0001") return json(400, { error: error.message });
      throw error;
    }
    return json(200, data);
  } catch (e) {
    console.error("create-stay-booking error", e);
    return json(500, { error: "Erro interno. Tenta novamente." });
  }
});

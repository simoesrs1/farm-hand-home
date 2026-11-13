// Reserva de uma experiência na quinta. Toda a validação (sessão, vagas, preço,
// brindes e stock) é feita de forma atómica em create_experience_booking.
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
    const experienceId = body?.experience_id;
    const date = body?.date;
    const time = body?.time;
    const people = body?.people;
    const paidGiftIds: unknown = body?.paid_gift_ids ?? [];
    if (typeof experienceId !== "string" || !UUID.test(experienceId)) return json(400, { error: "Experiência inválida" });
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(400, { error: "Data inválida" });
    if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) return json(400, { error: "Hora inválida" });
    if (typeof people !== "number" || !Number.isInteger(people) || people < 1 || people > 200) {
      return json(400, { error: "Número de pessoas inválido" });
    }
    if (!Array.isArray(paidGiftIds) || paidGiftIds.length > 20 || !paidGiftIds.every((g) => typeof g === "string" && UUID.test(g))) {
      return json(400, { error: "Brindes inválidos" });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await admin.rpc("create_experience_booking", {
      p_client: userData.user.id,
      p_experience_id: experienceId,
      p_date: date,
      p_time: time,
      p_people: people,
      p_paid_gift_ids: paidGiftIds,
    });
    // P0001: erros de regra (RAISE EXCEPTION), com mensagem para o cliente.
    if (error) {
      if (error.code === "P0001") return json(400, { error: error.message });
      throw error;
    }
    return json(200, data);
  } catch (e) {
    console.error("create-booking error", e);
    return json(500, { error: "Erro interno. Tenta novamente." });
  }
});

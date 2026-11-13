// Cancelamento de uma reserva pelo cliente: grátis até 5 dias antes; depois
// retém 25% do valor da experiência (ver cancel_farm_booking).
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
    const orderId = body?.order_id;
    if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId)) return json(400, { error: "Reserva inválida" });

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await admin.rpc("cancel_farm_booking", {
      p_order_id: orderId,
      p_actor: userData.user.id,
      p_by: "client",
    });
    if (error) {
      if (error.code === "P0001") return json(400, { error: error.message });
      throw error;
    }
    return json(200, data);
  } catch (e) {
    console.error("cancel-booking error", e);
    return json(500, { error: "Erro interno. Tenta novamente." });
  }
});

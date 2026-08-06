// Farmer-side order actions: accept the order, or refund it for lack of stock.
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "Não autenticado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonError(401, "Sessão inválida");
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const orderId = body?.order_id;
    const action = body?.action;
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 300) : "";
    if (typeof orderId !== "string" || !orderId) return jsonError(400, "Encomenda inválida");
    if (action !== "accept" && action !== "refund_no_stock") return jsonError(400, "Ação inválida");

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: order } = await admin
      .from("orders")
      .select("id, client_id, farmer_id, status, total, accepted_at")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return jsonError(404, "Encomenda não encontrada");

    const { data: farmer } = await admin
      .from("farmer_details")
      .select("id, user_id, company_name")
      .eq("id", order.farmer_id)
      .maybeSingle();
    if (!farmer || farmer.user_id !== userId) return jsonError(403, "Sem permissão");

    if (order.status !== "awaiting_pickup") {
      return jsonError(400, "Esta encomenda já não pode ser alterada.");
    }

    const farmName = farmer.company_name || "O agricultor";

    if (action === "accept") {
      if (order.accepted_at) return jsonError(400, "Encomenda já aceite.");
      const now = new Date().toISOString();
      const { error } = await admin.from("orders").update({ accepted_at: now }).eq("id", order.id);
      if (error) throw error;
      await admin.from("notifications").insert({
        user_id: order.client_id,
        order_id: order.id,
        type: "order_accepted",
        title: "Encomenda aceite",
        message: `${farmName} aceitou o teu pedido. Já podes levantar com o teu código QR.`,
        link: `/encomendas?id=${order.id}`,
      });
      return new Response(JSON.stringify({ ok: true, accepted_at: now }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await admin
      .from("orders")
      .update({ status: "refunded", expired_at: new Date().toISOString() })
      .eq("id", order.id);
    if (error) throw error;

    await admin.from("notifications").insert({
      user_id: order.client_id,
      order_id: order.id,
      type: "order_refunded",
      title: "Encomenda devolvida",
      message: `${farmName} não tem stock suficiente. A tua encomenda de ${Number(order.total).toFixed(2)}€ foi devolvida na totalidade.${reason ? ` Motivo: ${reason}` : ""}`,
      link: `/encomendas?id=${order.id}`,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("order-action error", e);
    return jsonError(500, "Erro interno. Tenta novamente.");
  }
});

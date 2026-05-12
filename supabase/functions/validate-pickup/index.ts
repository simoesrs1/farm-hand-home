// Farmer validates pickup by scanning QR or entering code
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const rawCode = (body?.code ?? "").toString().trim().toUpperCase();
    // Accept either plain code or "FC:CODE" QR payload
    const code = rawCode.startsWith("FC:") ? rawCode.slice(3) : rawCode;
    if (!/^[A-Z2-9]{8}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: "Código inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Caller must be a registered farmer
    const { data: farmer } = await admin
      .from("farmer_details")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!farmer) {
      return new Response(JSON.stringify({ error: "Apenas agricultores podem validar entregas" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order } = await admin
      .from("orders")
      .select("id, farmer_id, status, farmer_amount, client_id")
      .eq("pickup_code", code)
      .maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ error: "Código não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.farmer_id !== farmer.id) {
      return new Response(JSON.stringify({ error: "Esta encomenda não é da tua quinta" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.status === "delivered") {
      return new Response(JSON.stringify({ error: "Encomenda já entregue" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.status === "expired") {
      return new Response(JSON.stringify({ error: "Encomenda expirada" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.status !== "awaiting_pickup") {
      return new Response(JSON.stringify({ error: "Encomenda não pode ser validada" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const { error: updErr } = await admin
      .from("orders")
      .update({ status: "delivered", delivered_at: now })
      .eq("id", order.id);
    if (updErr) throw updErr;

    // Notify client
    await admin.from("notifications").insert({
      user_id: order.client_id,
      order_id: order.id,
      type: "delivered",
      title: "Encomenda entregue",
      message: "A tua encomenda foi marcada como entregue. Bom apetite!",
    });

    return new Response(
      JSON.stringify({ ok: true, order_id: order.id, farmer_amount: order.farmer_amount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("validate-pickup error", e);
    return new Response(JSON.stringify({ error: "Erro interno. Tenta novamente." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

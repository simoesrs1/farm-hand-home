// Marks orders past pickup_deadline as expired (90% to platform, 10% to farmer)
// Protected by a shared CRON_SECRET. Caller must send:
//   Authorization: Bearer <CRON_SECRET>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const expected = Deno.env.get("CRON_SECRET");
    if (!expected) {
      console.error("expire-orders: CRON_SECRET not configured");
      return jsonError(503, "Serviço indisponível");
    }
    const authHeader = req.headers.get("Authorization") ?? "";
    const provided = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!provided || !timingSafeEqual(provided, expected)) {
      return jsonError(401, "Não autorizado");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();
    const { data: expired, error } = await admin
      .from("orders")
      .update({ status: "expired", expired_at: now })
      .eq("status", "awaiting_pickup")
      // Só levantamentos: uma entrega ao domicílio por fazer é falha do
      // agricultor e segue o processo de queixa (delivery_complaints).
      .is("delivery_address", null)
      // As reservas de experiências têm regras próprias (abaixo).
      .eq("kind", "product")
      .lt("pickup_deadline", now)
      .select("id, client_id, farmer_id, total");
    if (error) throw error;

    if (expired && expired.length > 0) {
      const farmerIds = [...new Set(expired.map((o) => o.farmer_id))];
      const { data: farmers } = await admin
        .from("farmer_details")
        .select("id, user_id")
        .in("id", farmerIds);
      const farmerUserMap = new Map(farmers?.map((f) => [f.id, f.user_id]) ?? []);

      const notifications = expired.flatMap((o) => {
        const farmerUser = farmerUserMap.get(o.farmer_id);
        const compensation = Math.round(o.total * 0.1 * 100) / 100;
        const out = [];
        if (farmerUser) {
          out.push({
            user_id: farmerUser,
            order_id: o.id,
            type: "expired_farmer",
            title: "Encomenda não levantada",
            message: `O cliente não levantou a encomenda. Já não tens de a vender; recebeste ${compensation.toFixed(2)}€ como compensação.`,
          });
        }
        out.push({
          user_id: o.client_id,
          order_id: o.id,
          type: "expired_client",
          title: "Encomenda expirada",
          message: `Não levantaste a encomenda dentro do prazo. Apenas 10% do valor pago foi reembolsado.`,
        });
        return out;
      });
      if (notifications.length) {
        await admin.from("notifications").insert(notifications);
      }
    }

    // Reservas (experiências e alojamento): o QR code não foi validado até ao fim
    // da sessão ou até à saída. Sem devolução; o agricultor recebe o valor normal
    // (farmer_amount não muda).
    const { data: noShows, error: noShowErr } = await admin
      .from("orders")
      .update({ status: "expired", expired_at: now })
      .eq("status", "awaiting_pickup")
      .in("kind", ["experience", "stay"])
      .lt("pickup_deadline", now)
      .select("id, client_id, farmer_id, farmer_amount");
    if (noShowErr) throw noShowErr;

    if (noShows && noShows.length > 0) {
      const { data: farmers } = await admin
        .from("farmer_details")
        .select("id, user_id")
        .in("id", [...new Set(noShows.map((o) => o.farmer_id))]);
      const farmerUserMap = new Map(farmers?.map((f) => [f.id, f.user_id]) ?? []);
      const notifications = noShows.flatMap((o) => {
        const out = [{
          user_id: o.client_id,
          order_id: o.id,
          type: "booking_no_show",
          title: "Reserva não utilizada",
          message: "Não compareceste à reserva. Por isso, o valor pago não é devolvido.",
        }];
        const farmerUser = farmerUserMap.get(o.farmer_id);
        if (farmerUser) {
          out.push({
            user_id: farmerUser,
            order_id: o.id,
            type: "booking_no_show",
            title: "Cliente não compareceu",
            message: `O cliente não compareceu à reserva. Recebes ${Number(o.farmer_amount).toFixed(2)}€.`,
          });
        }
        return out;
      });
      await admin.from("notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({ expired_count: expired?.length ?? 0, no_show_count: noShows?.length ?? 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("expire-orders error", e);
    return jsonError(500, "Erro interno");
  }
});

// Marks orders past pickup_deadline as expired (90% to platform, 10% to farmer)
// Can be invoked manually or via cron
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();
    const { data: expired, error } = await admin
      .from("orders")
      .update({ status: "expired", expired_at: now })
      .eq("status", "awaiting_pickup")
      .lt("pickup_deadline", now)
      .select("id, client_id, farmer_id, total");
    if (error) throw error;

    // Notify farmers (10% goes to them as compensation)
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

    return new Response(
      JSON.stringify({ expired_count: expired?.length ?? 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("expire-orders error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

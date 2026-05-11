// Mock checkout — creates an order with simulated payment success
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ItemInput {
  product_name: string;
  product_image?: string;
  unit_price: number;
  unit?: string;
  quantity: number;
}

const COMMISSION_RATE = 0.1;

function generatePickupCode(): string {
  // 8 chars, A-Z + 2-9 (no confusing chars)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 8; i++) code += chars[bytes[i] % chars.length];
  return code;
}

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

    // User-scoped client to identify caller
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const clientId = userData.user.id;

    const body = await req.json().catch(() => null);
    const items: ItemInput[] = body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Carrinho vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate items
    for (const it of items) {
      if (
        !it.product_name ||
        typeof it.unit_price !== "number" ||
        it.unit_price < 0 ||
        typeof it.quantity !== "number" ||
        it.quantity <= 0 ||
        it.quantity > 1000
      ) {
        return new Response(JSON.stringify({ error: "Item inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Service-role client for writes
    const admin = createClient(supabaseUrl, serviceKey);

    // Ensure caller has a 'cliente' profile (only clients can buy)
    const { data: profile } = await admin
      .from("profiles")
      .select("profile_type")
      .eq("id", clientId)
      .maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (profile.profile_type === "vendedor") {
      return new Response(JSON.stringify({ error: "Apenas clientes podem comprar" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick a farmer: prefer body.farmer_id if valid; otherwise first registered farmer
    let farmerId: string | null = body?.farmer_id ?? null;
    if (farmerId) {
      const { data: f } = await admin
        .from("farmer_details")
        .select("id, pickup_days")
        .eq("id", farmerId)
        .eq("registration_step", 2)
        .maybeSingle();
      if (!f) farmerId = null;
    }
    let pickupDays = 7;
    if (!farmerId) {
      const { data: anyFarmer } = await admin
        .from("farmer_details")
        .select("id, pickup_days")
        .eq("registration_step", 2)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!anyFarmer) {
        return new Response(
          JSON.stringify({ error: "Nenhum agricultor disponível para receber a encomenda." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      farmerId = anyFarmer.id;
      pickupDays = anyFarmer.pickup_days ?? 7;
    } else {
      const { data: f } = await admin
        .from("farmer_details")
        .select("pickup_days")
        .eq("id", farmerId)
        .single();
      pickupDays = f?.pickup_days ?? 7;
    }

    // Compute totals server-side (never trust client totals)
    const total = items.reduce(
      (acc, it) => acc + Math.round(it.unit_price * 100) * it.quantity,
      0,
    ) / 100;
    const commission = Math.round(total * COMMISSION_RATE * 100) / 100;
    const farmerAmount = Math.round((total - commission) * 100) / 100;

    // Generate unique pickup code (retry on collision)
    let pickupCode = generatePickupCode();
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await admin
        .from("orders")
        .select("id")
        .eq("pickup_code", pickupCode)
        .maybeSingle();
      if (!exists) break;
      pickupCode = generatePickupCode();
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + pickupDays * 24 * 60 * 60 * 1000);

    // Create order — payment is simulated, mark as paid + awaiting_pickup immediately
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        client_id: clientId,
        farmer_id: farmerId,
        total,
        commission_amount: commission,
        farmer_amount: farmerAmount,
        status: "awaiting_pickup",
        pickup_code: pickupCode,
        pickup_deadline: deadline.toISOString(),
        paid_at: now.toISOString(),
      })
      .select()
      .single();
    if (orderErr) throw orderErr;

    // Insert items
    const itemRows = items.map((it) => ({
      order_id: order.id,
      product_name: it.product_name,
      product_image: it.product_image ?? null,
      unit_price: it.unit_price,
      unit: it.unit ?? null,
      quantity: it.quantity,
      subtotal: Math.round(it.unit_price * it.quantity * 100) / 100,
    }));
    const { error: itemsErr } = await admin.from("order_items").insert(itemRows);
    if (itemsErr) throw itemsErr;

    // Notify farmer
    const { data: farmer } = await admin
      .from("farmer_details")
      .select("user_id")
      .eq("id", farmerId)
      .single();
    if (farmer) {
      await admin.from("notifications").insert({
        user_id: farmer.user_id,
        order_id: order.id,
        type: "new_order",
        title: "Nova encomenda",
        message: `Recebeste uma nova encomenda no valor de ${total.toFixed(2)}€. Aguarda o levantamento até ${deadline.toLocaleDateString("pt-PT")}.`,
      });
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        pickup_code: pickupCode,
        pickup_deadline: deadline.toISOString(),
        total,
        commission,
        farmer_amount: farmerAmount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-order error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

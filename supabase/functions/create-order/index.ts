// Mock checkout — creates an order with simulated payment success
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { CATALOG } from "../_shared/products.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ItemInput {
  product_id: string;
  quantity: number;
}

const COMMISSION_RATE = 0.1;
const MAX_QUANTITY = 1000;
const MAX_ITEMS = 50;
const MAX_TOTAL = 10000; // sanity cap (€)

function generatePickupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 8; i++) code += chars[bytes[i] % chars.length];
  return code;
}

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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonError(401, "Sessão inválida");
    const clientId = userData.user.id;

    const body = await req.json().catch(() => null);
    const items: ItemInput[] = body?.items;
    if (!Array.isArray(items) || items.length === 0) return jsonError(400, "Carrinho vazio");
    if (items.length > MAX_ITEMS) return jsonError(400, "Demasiados itens");

    // Validate items: only product_id + quantity are accepted from the client.
    // Prices are read exclusively from the server-side catalog.
    const resolved: { product: typeof CATALOG[string]; quantity: number; subtotal: number }[] = [];
    for (const it of items) {
      if (!it || typeof it.product_id !== "string") return jsonError(400, "Item inválido");
      if (typeof it.quantity !== "number" || !Number.isInteger(it.quantity) || it.quantity <= 0 || it.quantity > MAX_QUANTITY) {
        return jsonError(400, "Quantidade inválida");
      }
      const product = CATALOG[it.product_id];
      if (!product) return jsonError(400, "Produto desconhecido");
      const subtotal = Math.round(product.price * it.quantity * 100) / 100;
      resolved.push({ product, quantity: it.quantity, subtotal });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("profile_type")
      .eq("id", clientId)
      .maybeSingle();
    if (!profile) return jsonError(400, "Perfil não encontrado");
    if (profile.profile_type === "vendedor") return jsonError(403, "Apenas clientes podem comprar");

    let farmerId: string | null = body?.farmer_id ?? null;
    if (farmerId) {
      const { data: f } = await admin
        .from("farmer_details")
        .select("id")
        .eq("id", farmerId)
        .eq("registration_step", 2)
        .maybeSingle();
      if (!f) farmerId = null;
    }
    let pickupDays = 7;
    if (!farmerId) {
      // Prefer fully-registered farmers; fall back to any farmer if none completed onboarding
      const { data: completed } = await admin
        .from("farmer_details")
        .select("id, pickup_days")
        .eq("registration_step", 2)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      let chosen = completed;
      if (!chosen) {
        const { data: anyFarmer } = await admin
          .from("farmer_details")
          .select("id, pickup_days")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        chosen = anyFarmer;
      }
      if (!chosen) return jsonError(400, "Nenhum agricultor disponível para receber a encomenda.");
      farmerId = chosen.id;
      pickupDays = chosen.pickup_days ?? 7;
    } else {
      const { data: f } = await admin
        .from("farmer_details")
        .select("pickup_days")
        .eq("id", farmerId)
        .single();
      pickupDays = f?.pickup_days ?? 7;
    }

    const total = Math.round(resolved.reduce((acc, r) => acc + r.subtotal * 100, 0)) / 100;
    if (total <= 0 || total > MAX_TOTAL) return jsonError(400, "Total inválido");

    const commission = Math.round(total * COMMISSION_RATE * 100) / 100;
    const farmerAmount = Math.round((total - commission) * 100) / 100;

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

    const itemRows = resolved.map((r) => ({
      order_id: order.id,
      product_name: r.product.name,
      product_image: r.product.image || null,
      unit_price: r.product.price,
      unit: r.product.unit,
      quantity: r.quantity,
      subtotal: r.subtotal,
    }));
    const { error: itemsErr } = await admin.from("order_items").insert(itemRows);
    if (itemsErr) throw itemsErr;

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
    return jsonError(500, "Erro interno. Tenta novamente.");
  }
});

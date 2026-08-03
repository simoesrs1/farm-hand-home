// Mock checkout — creates an order with simulated payment success
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

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

    const admin = createClient(supabaseUrl, serviceKey);

    // Validate items: only product_id + quantity are accepted from the client.
    // Prices and stock are read exclusively from the products table, never
    // trusted from the request body.
    const productIds = [...new Set(items.map((it) => it?.product_id).filter((id): id is string => typeof id === "string"))];
    const { data: dbProducts, error: productsErr } = await admin
      .from("products")
      .select("id, name, client_price, discount_percent, unit, active, stock_quantity, farmer_id")
      .in("id", productIds);
    if (productsErr) throw productsErr;
    const productById = new Map((dbProducts ?? []).map((p) => [p.id, p]));

    const resolved: { product: { id: string; name: string; price: number; unit: string; farmerId: string }; quantity: number; subtotal: number }[] = [];
    for (const it of items) {
      if (!it || typeof it.product_id !== "string") return jsonError(400, "Item inválido");
      if (typeof it.quantity !== "number" || !Number.isInteger(it.quantity) || it.quantity <= 0 || it.quantity > MAX_QUANTITY) {
        return jsonError(400, "Quantidade inválida");
      }
      const product = productById.get(it.product_id);
      if (!product || !product.active) return jsonError(400, "Produto desconhecido");
      if (typeof product.stock_quantity === "number" && product.stock_quantity < it.quantity) {
        return jsonError(400, `Stock insuficiente para ${product.name}`);
      }
      // The farmer can run a promotion on a product; the discounted price is
      // recomputed here from the DB so the client can never pick the price.
      const discount = Math.min(90, Math.max(0, Number(product.discount_percent ?? 0)));
      const unitPrice = Math.round(product.client_price * (1 - discount / 100) * 100) / 100;
      const subtotal = Math.round(unitPrice * it.quantity * 100) / 100;
      resolved.push({
        product: {
          id: product.id,
          name: product.name,
          price: unitPrice,
          unit: product.unit,
          farmerId: product.farmer_id,
        },
        quantity: it.quantity,
        subtotal,
      });
    }


    const { data: profile } = await admin
      .from("profiles")
      .select("profile_type")
      .eq("id", clientId)
      .maybeSingle();
    if (!profile) return jsonError(400, "Perfil não encontrado");
    if (profile.profile_type === "vendedor") return jsonError(403, "Apenas clientes podem comprar");

    // The order belongs to whoever actually sells the products — never to a
    // farmer_id supplied by the client, and never to an arbitrary farmer. An
    // order row holds a single farmer_id, so a cart mixing producers cannot be
    // one order; reject it instead of silently paying the wrong farmer.
    const farmerIds = [...new Set(resolved.map((r) => r.product.farmerId))];
    if (farmerIds.length > 1) {
      return jsonError(400, "Só é possível finalizar produtos de um agricultor de cada vez.");
    }
    const farmerId = farmerIds[0];

    const { data: farmerRow } = await admin
      .from("farmer_details")
      .select("id, pickup_days, user_id")
      .eq("id", farmerId)
      .maybeSingle();
    if (!farmerRow) return jsonError(400, "Agricultor indisponível para receber a encomenda.");
    const pickupDays = farmerRow.pickup_days ?? 7;

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
      product_image: null,
      unit_price: r.product.price,
      unit: r.product.unit,
      quantity: r.quantity,
      subtotal: r.subtotal,
    }));
    const { error: itemsErr } = await admin.from("order_items").insert(itemRows);
    if (itemsErr) throw itemsErr;

    // Best-effort stock decrement (read-then-write, not transactional — matches
    // the rest of this mock checkout flow, which doesn't guard against races).
    for (const r of resolved) {
      const current = productById.get(r.product.id)?.stock_quantity;
      if (typeof current === "number") {
        await admin
          .from("products")
          .update({ stock_quantity: Math.max(0, current - r.quantity) })
          .eq("id", r.product.id);
      }
    }

    if (farmerRow.user_id) {
      await admin.from("notifications").insert({
        user_id: farmerRow.user_id,
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

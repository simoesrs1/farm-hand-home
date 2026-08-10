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

interface PickupWindow {
  day: number;
  start: string;
  end: string;
}

function parsePickupWindows(raw: unknown): PickupWindow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (w): w is PickupWindow =>
      !!w &&
      typeof w === "object" &&
      typeof (w as PickupWindow).day === "number" &&
      typeof (w as PickupWindow).start === "string" &&
      typeof (w as PickupWindow).end === "string" &&
      (w as PickupWindow).start < (w as PickupWindow).end,
  );
}

const LISBON = "Europe/Lisbon";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday + minutes-of-day of a Date, as seen in Europe/Lisbon. */
function lisbonParts(date: Date): { day: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: LISBON,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = WEEKDAYS.indexOf(get("weekday"));
  const hour = parseInt(get("hour"), 10) % 24;
  const minute = parseInt(get("minute"), 10);
  return { day, minutes: hour * 60 + minute };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

function isWithinWindows(windows: PickupWindow[], date: Date): boolean {
  if (windows.length === 0) return true;
  const { day, minutes } = lisbonParts(date);
  return windows.some(
    (w) => w.day === day && toMinutes(w.start) <= minutes && minutes < toMinutes(w.end),
  );
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
      .select("id, pickup_days, user_id, pickup_hours")
      .eq("id", farmerId)
      .maybeSingle();
    if (!farmerRow) return jsonError(400, "Agricultor indisponível para receber a encomenda.");
    const pickupDays = farmerRow.pickup_days ?? 7;

    // Optional pickup scheduling — must land inside the farmer's open-door
    // windows (stored as weekday + HH:MM in Europe/Lisbon local time).
    const windows = parsePickupWindows(farmerRow.pickup_hours);
    let scheduledAt: Date | null = null;
    const rawScheduled = body?.scheduled_pickup_at;
    if (rawScheduled != null && rawScheduled !== "") {
      if (typeof rawScheduled !== "string") return jsonError(400, "Agendamento inválido");
      scheduledAt = new Date(rawScheduled);
      if (Number.isNaN(scheduledAt.getTime())) return jsonError(400, "Agendamento inválido");
      if (scheduledAt.getTime() < Date.now() - 60_000) {
        return jsonError(400, "A data de levantamento já passou.");
      }
      if (!isWithinWindows(windows, scheduledAt)) {
        return jsonError(400, "O horário escolhido está fora da disponibilidade do agricultor.");
      }
    } else if (windows.length > 0) {
      return jsonError(400, "Escolha um horário de levantamento dentro da disponibilidade do agricultor.");
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
    let deadline = new Date(now.getTime() + pickupDays * 24 * 60 * 60 * 1000);
    // A scheduled pickup must always fit inside the escrow deadline.
    if (scheduledAt && scheduledAt.getTime() > deadline.getTime()) {
      deadline = new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000);
    }


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

/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock checkout — creates an order with simulated payment success
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import {
  distanceKm,
  fulfillmentOptions,
  isWithinWindows,
  parseWindows,
  type DeliveryMode,
  type Fulfillment,
} from "../_shared/fulfillment.ts";

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

const LISBON = "Europe/Lisbon";
const DAY_MS = 24 * 60 * 60 * 1000;

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
    // Retira os lotes fora de validade antes de validar o stock, para nunca
    // vender produto expirado entre duas execuções do cron.
    for (const id of productIds) {
      const { error: expireErr } = await admin.rpc("expire_stock_batches", { p_product_id: id });
      if (expireErr) console.error("expire_stock_batches failed", id, expireErr);
    }
    const { data: dbProducts, error: productsErr } = await admin
      .from("products")
      .select("id, name, client_price, discount_percent, unit, active, stock_quantity, farmer_id, delivery_mode, delivery_tracking, delivery_fee, shipping_days")
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
      .select("id, pickup_days, user_id, pickup_hours, paused_until, free_delivery_threshold, delivery_hours, delivery_radius_km, pickup_lat, pickup_lng")
      .eq("id", farmerId)
      .maybeSingle();
    if (!farmerRow) return jsonError(400, "Agricultor indisponível para receber a encomenda.");
    // Pausa voluntária: a RLS já oculta os produtos, mas este cliente usa o
    // service_role. paused_until é a data de regresso (Europe/Lisbon).
    const todayLisbon = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
    if (farmerRow.paused_until && farmerRow.paused_until > todayLisbon) {
      return jsonError(400, "Este agricultor está em pausa e não aceita encomendas de momento.");
    }
    const pickupDays = farmerRow.pickup_days ?? 7;

    // Levantamento ou entrega: só as opções comuns a todos os produtos. A
    // entrega exige que o agricultor tenha raio e localização da quinta.
    // Lido de productById: o objeto `resolved` só guarda id/nome/preço/unidade.
    const orderProducts = resolved.map((r) => productById.get(r.product.id)!);
    const farmPoint =
      farmerRow.pickup_lat != null && farmerRow.pickup_lng != null
        ? { lat: Number(farmerRow.pickup_lat), lng: Number(farmerRow.pickup_lng) }
        : null;
    const radiusKm = Number(farmerRow.delivery_radius_km ?? 0);
    const options = fulfillmentOptions(
      orderProducts.map((p) => p.delivery_mode as DeliveryMode),
      radiusKm > 0 && farmPoint != null,
    );
    // Pedido sem `fulfillment` vem do frontend antigo (ainda em cache): entrega
    // se trouxer morada, senão levantamento.
    const legacyRequest = body?.fulfillment == null;
    const fulfillment: Fulfillment = legacyRequest
      ? typeof body?.delivery_address === "string" && body.delivery_address.trim() !== ""
        ? "delivery"
        : "pickup"
      : body.fulfillment;
    if (fulfillment !== "pickup" && fulfillment !== "delivery") return jsonError(400, "Forma de entrega inválida");
    if (options.length === 0) {
      return jsonError(400, "Estes produtos não têm uma forma de entrega em comum. Finalize-os em encomendas separadas.");
    }
    if (!options.includes(fulfillment)) {
      return jsonError(
        400,
        fulfillment === "delivery"
          ? "Esta encomenda não pode ser entregue ao domicílio. Escolha o levantamento na quinta."
          : "Esta encomenda só pode ser entregue ao domicílio.",
      );
    }
    const needsDelivery = fulfillment === "delivery";

    // Prazo mínimo de preparação da entrega: o maior entre os produtos.
    const preparationDays = Math.max(0, ...orderProducts.map((p) => Math.round(Number(p.shipping_days ?? 0))));
    const earliestDelivery = new Date(Date.now() + preparationDays * DAY_MS);

    // Agendamento: dentro da porta aberta (levantamento) ou do horário de
    // entregas (entrega), em Europe/Lisbon. O frontend antigo agendava sempre
    // na porta aberta, por isso esses pedidos continuam a ser validados assim.
    const windows = parseWindows(
      needsDelivery && !legacyRequest ? farmerRow.delivery_hours : farmerRow.pickup_hours,
    );
    const what = needsDelivery ? "entrega" : "levantamento";
    let scheduledAt: Date | null = null;
    const rawScheduled = body?.scheduled_pickup_at;
    if (rawScheduled != null && rawScheduled !== "") {
      if (typeof rawScheduled !== "string") return jsonError(400, "Agendamento inválido");
      scheduledAt = new Date(rawScheduled);
      if (Number.isNaN(scheduledAt.getTime())) return jsonError(400, "Agendamento inválido");
      if (scheduledAt.getTime() < Date.now() - 60_000) {
        return jsonError(400, `A data de ${what} já passou.`);
      }
      if (!isWithinWindows(windows, scheduledAt)) {
        return jsonError(400, "O horário escolhido está fora da disponibilidade do agricultor.");
      }
      if (needsDelivery && !legacyRequest && scheduledAt.getTime() < earliestDelivery.getTime() - 60_000) {
        return jsonError(400, `A entrega só pode ser agendada a partir de ${preparationDays} dia(s) depois da compra.`);
      }
    } else if (windows.length > 0) {
      return jsonError(400, `Escolha um horário de ${what} dentro da disponibilidade do agricultor.`);
    }

    // Entrega ao domicílio: morada, ponto exato no mapa e dentro do raio.
    let deliveryAddress: string | null = null;
    let deliveryLat: number | null = null;
    let deliveryLng: number | null = null;
    if (needsDelivery) {
      const rawAddress = body?.delivery_address;
      const rawLat = body?.delivery_lat;
      const rawLng = body?.delivery_lng;
      if (typeof rawAddress !== "string" || rawAddress.trim().length < 5) {
        return jsonError(400, "Indique a morada de entrega ao domicílio.");
      }
      const lat = Number(rawLat);
      const lng = Number(rawLng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return jsonError(400, "Marque no mapa o ponto exato da entrega.");
      }
      if (farmPoint && distanceKm(farmPoint, { lat, lng }) > radiusKm) {
        return jsonError(400, `A morada está fora da zona de entrega do agricultor (até ${radiusKm} km da quinta).`);
      }
      deliveryAddress = rawAddress.trim().slice(0, 300);
      deliveryLat = lat;
      deliveryLng = lng;
    }

    // Acompanhamento da entrega: só se o cliente o pedir e algum produto o
    // oferecer (incluído no preço, sem custo extra).
    const wantsTracking = needsDelivery && body?.delivery_tracking === true;
    if (wantsTracking && !orderProducts.some((p) => p.delivery_tracking === true)) {
      return jsonError(400, "Esta encomenda não tem acompanhamento da entrega disponível.");
    }
    const deliveryTracking = wantsTracking;

    const productsTotal = Math.round(resolved.reduce((acc, r) => acc + r.subtotal * 100, 0)) / 100;

    // Preço da entrega: uma por encomenda, o mais alto entre os produtos;
    // grátis se os produtos atingirem o limite do agricultor. Mesma regra de
    // src/lib/delivery-fee.ts.
    let deliveryFee = 0;
    if (needsDelivery) {
      const baseFee = Math.max(0, ...orderProducts.map((p) => Number(p.delivery_fee ?? 0)));
      const threshold = Number(farmerRow.free_delivery_threshold ?? 0);
      deliveryFee = threshold > 0 && productsTotal >= threshold ? 0 : Math.round(baseFee * 100) / 100;
    }

    const total = Math.round((productsTotal + deliveryFee) * 100) / 100;
    if (productsTotal <= 0 || total > MAX_TOTAL) return jsonError(400, "Total inválido");

    // A comissão incide só sobre os produtos: a entrega vai inteira para o agricultor.
    const commission = Math.round(productsTotal * COMMISSION_RATE * 100) / 100;
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
    let deadline = new Date(now.getTime() + pickupDays * DAY_MS);
    // A scheduled pickup must always fit inside the escrow deadline.
    if (scheduledAt && scheduledAt.getTime() > deadline.getTime()) {
      deadline = new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000);
    }


    // Data prevista da entrega ao domicílio: a agendada ou, sem agendamento, o
    // pagamento mais o prazo de preparação. Sem nenhuma das duas fica NULL e
    // conta o prazo limite.
    const expectedDeliveryAt = !needsDelivery
      ? null
      : scheduledAt
        ? scheduledAt.toISOString()
        : preparationDays > 0
          ? new Date(now.getTime() + preparationDays * DAY_MS).toISOString()
          : null;

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
        scheduled_pickup_at: scheduledAt ? scheduledAt.toISOString() : null,
        delivery_address: deliveryAddress,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        delivery_tracking: deliveryTracking,
        delivery_fee: deliveryFee,
        expected_delivery_at: expectedDeliveryAt,
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

    // Stock decrement goes through consume_product_stock so the product history
    // trigger records it as a sale tied to this order and buyer.
    for (const r of resolved) {
      const { error: stockErr } = await admin.rpc("consume_product_stock", {
        p_product_id: r.product.id,
        p_quantity: r.quantity,
        p_order_id: order.id,
        p_actor_id: clientId,
      });
      if (stockErr) console.error("consume_product_stock failed", r.product.id, stockErr);
    }

    // Notify the buyer that the payment went through and the order exists.
    await admin.from("notifications").insert({
      user_id: clientId,
      order_id: order.id,
      type: "order_paid",
      title: "Encomenda criada",
      message: `Pagamento confirmado (${total.toFixed(2)}€). ${
        resolved.length === 1
          ? `${resolved[0].quantity} × ${resolved[0].product.name}`
          : `${resolved.length} produtos`
      } — código de ${needsDelivery ? "entrega" : "levantamento"} ${pickupCode}.`,
      link: "/encomendas",
    });

    if (farmerRow.user_id) {
      await admin.from("notifications").insert({
        user_id: farmerRow.user_id,
        order_id: order.id,
        type: "new_order",
        title: "Nova encomenda",
        message: needsDelivery
          ? scheduledAt
            ? `Recebeste uma nova encomenda no valor de ${total.toFixed(2)}€, com entrega ao domicílio marcada para ${scheduledAt.toLocaleString("pt-PT", { timeZone: LISBON })}.`
            : `Recebeste uma nova encomenda no valor de ${total.toFixed(2)}€, com entrega ao domicílio${expectedDeliveryAt ? ` prevista para ${new Date(expectedDeliveryAt).toLocaleDateString("pt-PT", { timeZone: LISBON })}` : ""}.`
          : scheduledAt
          ? `Recebeste uma nova encomenda no valor de ${total.toFixed(2)}€. O cliente agendou o levantamento para ${scheduledAt.toLocaleString("pt-PT", { timeZone: LISBON })}.`
          : `Recebeste uma nova encomenda no valor de ${total.toFixed(2)}€. Aguarda o levantamento até ${deadline.toLocaleDateString("pt-PT")}.`,

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

/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock checkout — creates orders with simulated payment success.
//
// Um carrinho pode ter produtos de vários agricultores: o browser envia um
// grupo por agricultor ({ groups: [...] }), cada um com a sua forma de entrega,
// horário e morada, e é criada uma encomenda por grupo (cada encomenda tem um
// só farmer_id). Todos os grupos são validados antes de gravar qualquer coisa.
// O formato antigo (um só grupo no corpo do pedido) continua a ser aceite.
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

/** Um agricultor do carrinho: produtos e forma de entrega escolhida. */
interface GroupInput {
  items: ItemInput[];
  fulfillment?: Fulfillment;
  scheduled_pickup_at?: string | null;
  delivery_address?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_tracking?: boolean;
}

const COMMISSION_RATE = 0.1;
const MAX_QUANTITY = 1000;
const MAX_ITEMS = 50;
const MAX_GROUPS = 10;
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

function jsonError(status: number, message: string, farmerId?: string) {
  return new Response(JSON.stringify({ error: message, ...(farmerId ? { farmer_id: farmerId } : {}) }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Erro de validação de um grupo; leva o agricultor para o browser indicar qual é. */
class GroupError extends Error {
  constructor(public status: number, message: string, public farmerId?: string) {
    super(message);
  }
}

type Resolved = {
  product: { id: string; name: string; price: number; unit: string; farmerId: string };
  quantity: number;
  subtotal: number;
};

/** Encomenda validada, pronta a gravar. */
interface PreparedOrder {
  farmerId: string;
  farmerUserId: string | null;
  resolved: Resolved[];
  needsDelivery: boolean;
  scheduledAt: Date | null;
  deadline: Date;
  expectedDeliveryAt: string | null;
  deliveryAddress: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryTracking: boolean;
  deliveryFee: number;
  total: number;
  commission: number;
  farmerAmount: number;
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
    const multi = Array.isArray(body?.groups);
    const groups: GroupInput[] = multi ? body.groups : [body ?? {}];
    if (groups.length === 0) return jsonError(400, "Carrinho vazio");
    if (groups.length > MAX_GROUPS) return jsonError(400, "Pedido inválido");
    const allItems: ItemInput[] = [];
    for (const g of groups) {
      if (!g || !Array.isArray(g.items) || g.items.length === 0) return jsonError(400, "Carrinho vazio");
      allItems.push(...g.items);
    }
    if (allItems.length > MAX_ITEMS) return jsonError(400, "Demasiados itens");

    const admin = createClient(supabaseUrl, serviceKey);

    // Validate items: only product_id + quantity are accepted from the client.
    // Prices and stock are read exclusively from the products table, never
    // trusted from the request body.
    const productIds = [...new Set(allItems.map((it) => it?.product_id).filter((id): id is string => typeof id === "string"))];
    // O mesmo produto em dois grupos contaria o stock duas vezes.
    const lineCount = allItems.filter((it) => typeof it?.product_id === "string").length;
    if (multi && productIds.length !== lineCount) return jsonError(400, "Item inválido");
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

    const { data: profile } = await admin
      .from("profiles")
      .select("profile_type, is_test_account")
      .eq("id", clientId)
      .maybeSingle();
    if (!profile) return jsonError(400, "Perfil não encontrado");
    // Contas de teste (docs/contas-de-teste.md) compram mesmo registadas como agricultor.
    if (profile.profile_type === "vendedor" && !profile.is_test_account) {
      return jsonError(403, "Apenas clientes podem comprar");
    }

    const todayLisbon = new Intl.DateTimeFormat("en-CA", { timeZone: LISBON }).format(new Date());

    /** Valida um grupo e calcula a encomenda; lança GroupError se algo falhar. */
    const prepare = async (group: GroupInput): Promise<PreparedOrder> => {
      const resolved: Resolved[] = [];
      for (const it of group.items) {
        if (!it || typeof it.product_id !== "string") throw new GroupError(400, "Item inválido");
        if (typeof it.quantity !== "number" || !Number.isInteger(it.quantity) || it.quantity <= 0 || it.quantity > MAX_QUANTITY) {
          throw new GroupError(400, "Quantidade inválida");
        }
        const product = productById.get(it.product_id);
        if (!product || !product.active) throw new GroupError(400, "Produto desconhecido");
        if (typeof product.stock_quantity === "number" && product.stock_quantity < it.quantity) {
          throw new GroupError(400, `Stock insuficiente para ${product.name}`, product.farmer_id);
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

      // The order belongs to whoever actually sells the products — never to a
      // farmer_id supplied by the client, and never to an arbitrary farmer. An
      // order row holds a single farmer_id, so a group mixing producers cannot
      // be one order; reject it instead of silently paying the wrong farmer.
      const farmerIds = [...new Set(resolved.map((r) => r.product.farmerId))];
      if (farmerIds.length > 1) {
        throw new GroupError(400, "Só é possível finalizar produtos de um agricultor de cada vez.");
      }
      const farmerId = farmerIds[0];

      const { data: farmerRow } = await admin
        .from("farmer_details")
        .select("id, pickup_days, user_id, pickup_hours, paused_until, free_delivery_threshold, delivery_hours, delivery_radius_km, pickup_lat, pickup_lng, verification_status, registration_step")
        .eq("id", farmerId)
        .maybeSingle();
      if (!farmerRow) throw new GroupError(400, "Agricultor indisponível para receber a encomenda.", farmerId);
      if (farmerRow.user_id === clientId) {
        throw new GroupError(400, "Não pode comprar à sua própria quinta.", farmerId);
      }
      // Só vende quem tem o registo completo e foi verificado pela equipa (a RLS
      // já oculta os produtos, mas este cliente usa o service_role).
      if (farmerRow.verification_status !== "verified" || (farmerRow.registration_step ?? 0) < 2) {
        throw new GroupError(400, "Este agricultor ainda não foi verificado e não pode vender de momento.", farmerId);
      }
      // Pausa voluntária: a RLS já oculta os produtos, mas este cliente usa o
      // service_role. paused_until é a data de regresso (Europe/Lisbon).
      if (farmerRow.paused_until && farmerRow.paused_until > todayLisbon) {
        throw new GroupError(400, "Este agricultor está em pausa e não aceita encomendas de momento.", farmerId);
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
      const legacyRequest = group.fulfillment == null;
      const fulfillment: Fulfillment = legacyRequest
        ? typeof group.delivery_address === "string" && group.delivery_address.trim() !== ""
          ? "delivery"
          : "pickup"
        : group.fulfillment!;
      if (fulfillment !== "pickup" && fulfillment !== "delivery") {
        throw new GroupError(400, "Forma de entrega inválida", farmerId);
      }
      if (options.length === 0) {
        throw new GroupError(400, "Estes produtos não têm uma forma de entrega em comum. Finalize-os em encomendas separadas.", farmerId);
      }
      if (!options.includes(fulfillment)) {
        throw new GroupError(
          400,
          fulfillment === "delivery"
            ? "Esta encomenda não pode ser entregue ao domicílio. Escolha o levantamento na quinta."
            : "Esta encomenda só pode ser entregue ao domicílio.",
          farmerId,
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
      const rawScheduled = group.scheduled_pickup_at;
      if (rawScheduled != null && rawScheduled !== "") {
        if (typeof rawScheduled !== "string") throw new GroupError(400, "Agendamento inválido", farmerId);
        scheduledAt = new Date(rawScheduled);
        if (Number.isNaN(scheduledAt.getTime())) throw new GroupError(400, "Agendamento inválido", farmerId);
        if (scheduledAt.getTime() < Date.now() - 60_000) {
          throw new GroupError(400, `A data de ${what} já passou.`, farmerId);
        }
        if (!isWithinWindows(windows, scheduledAt)) {
          throw new GroupError(400, "O horário escolhido está fora da disponibilidade do agricultor.", farmerId);
        }
        if (needsDelivery && !legacyRequest && scheduledAt.getTime() < earliestDelivery.getTime() - 60_000) {
          throw new GroupError(400, `A entrega só pode ser agendada a partir de ${preparationDays} dia(s) depois da compra.`, farmerId);
        }
      } else if (windows.length > 0) {
        throw new GroupError(400, `Escolha um horário de ${what} dentro da disponibilidade do agricultor.`, farmerId);
      }

      // Entrega ao domicílio: morada, ponto exato no mapa e dentro do raio.
      let deliveryAddress: string | null = null;
      let deliveryLat: number | null = null;
      let deliveryLng: number | null = null;
      if (needsDelivery) {
        const rawAddress = group.delivery_address;
        const lat = Number(group.delivery_lat);
        const lng = Number(group.delivery_lng);
        if (typeof rawAddress !== "string" || rawAddress.trim().length < 5) {
          throw new GroupError(400, "Indique a morada de entrega ao domicílio.", farmerId);
        }
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          throw new GroupError(400, "Marque no mapa o ponto exato da entrega.", farmerId);
        }
        if (farmPoint && distanceKm(farmPoint, { lat, lng }) > radiusKm) {
          throw new GroupError(400, `A morada está fora da zona de entrega do agricultor (até ${radiusKm} km da quinta).`, farmerId);
        }
        deliveryAddress = rawAddress.trim().slice(0, 300);
        deliveryLat = lat;
        deliveryLng = lng;
      }

      // Acompanhamento da entrega: só se o cliente o pedir e algum produto o
      // oferecer (incluído no preço, sem custo extra).
      const deliveryTracking = needsDelivery && group.delivery_tracking === true;
      if (deliveryTracking && !orderProducts.some((p) => p.delivery_tracking === true)) {
        throw new GroupError(400, "Esta encomenda não tem acompanhamento da entrega disponível.", farmerId);
      }

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
      if (productsTotal <= 0 || total > MAX_TOTAL) throw new GroupError(400, "Total inválido", farmerId);

      // A comissão incide só sobre os produtos: a entrega vai inteira para o agricultor.
      const commission = Math.round(productsTotal * COMMISSION_RATE * 100) / 100;
      const farmerAmount = Math.round((total - commission) * 100) / 100;

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

      return {
        farmerId,
        farmerUserId: farmerRow.user_id ?? null,
        resolved,
        needsDelivery,
        scheduledAt,
        deadline,
        expectedDeliveryAt,
        deliveryAddress,
        deliveryLat,
        deliveryLng,
        deliveryTracking,
        deliveryFee,
        total,
        commission,
        farmerAmount,
      };
    };

    // 1) Validar todos os grupos antes de gravar qualquer encomenda.
    const prepared: PreparedOrder[] = [];
    try {
      for (const g of groups) prepared.push(await prepare(g));
    } catch (e) {
      if (e instanceof GroupError) return jsonError(e.status, e.message, e.farmerId);
      throw e;
    }
    if (new Set(prepared.map((p) => p.farmerId)).size !== prepared.length) {
      return jsonError(400, "Pedido inválido");
    }

    // 2) Gravar. Sem transação no cliente: se uma gravação falhar, apagam-se as
    // encomendas já criadas neste pedido (order_items e o resto vão em cascata).
    const created: { prep: PreparedOrder; order: any; pickupCode: string }[] = [];
    try {
      for (const prep of prepared) {
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

        const { data: order, error: orderErr } = await admin
          .from("orders")
          .insert({
            client_id: clientId,
            farmer_id: prep.farmerId,
            total: prep.total,
            commission_amount: prep.commission,
            farmer_amount: prep.farmerAmount,
            status: "awaiting_pickup",
            pickup_code: pickupCode,
            pickup_deadline: prep.deadline.toISOString(),
            paid_at: new Date().toISOString(),
            scheduled_pickup_at: prep.scheduledAt ? prep.scheduledAt.toISOString() : null,
            delivery_address: prep.deliveryAddress,
            delivery_lat: prep.deliveryLat,
            delivery_lng: prep.deliveryLng,
            delivery_tracking: prep.deliveryTracking,
            delivery_fee: prep.deliveryFee,
            expected_delivery_at: prep.expectedDeliveryAt,
          })
          .select()
          .single();
        if (orderErr) throw orderErr;
        created.push({ prep, order, pickupCode });

        const itemRows = prep.resolved.map((r) => ({
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
      }
    } catch (e) {
      if (created.length > 0) {
        const { error: rollbackErr } = await admin
          .from("orders")
          .delete()
          .in("id", created.map((c) => c.order.id));
        if (rollbackErr) console.error("create-order rollback failed", rollbackErr);
      }
      throw e;
    }

    // 3) Stock, notificações e resposta (só depois de todas as encomendas gravadas).
    for (const { prep, order, pickupCode } of created) {
      // Stock decrement goes through consume_product_stock so the product history
      // trigger records it as a sale tied to this order and buyer.
      for (const r of prep.resolved) {
        const { error: stockErr } = await admin.rpc("consume_product_stock", {
          p_product_id: r.product.id,
          p_quantity: r.quantity,
          p_order_id: order.id,
          p_actor_id: clientId,
        });
        if (stockErr) console.error("consume_product_stock failed", r.product.id, stockErr);
      }

      const { resolved, total, needsDelivery, scheduledAt, expectedDeliveryAt, deadline } = prep;
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

      if (prep.farmerUserId) {
        await admin.from("notifications").insert({
          user_id: prep.farmerUserId,
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
    }

    const orders = created.map(({ prep, order, pickupCode }) => ({
      order_id: order.id,
      farmer_id: prep.farmerId,
      pickup_code: pickupCode,
      pickup_deadline: prep.deadline.toISOString(),
      total: prep.total,
      commission: prep.commission,
      farmer_amount: prep.farmerAmount,
    }));
    // Formato antigo: os campos da única encomenda no topo da resposta.
    const { farmer_id: _farmerId, ...first } = orders[0];
    return new Response(JSON.stringify(multi ? { orders } : first), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-order error", e);
    return jsonError(500, "Erro interno. Tenta novamente.");
  }
});

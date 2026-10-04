// Cálculo diário da atividade dos agricultores + lembretes (só incentivos).
//
// 1. Recalcula a pontuação de todos os agricultores (compute_farmer_activity).
// 2. Mensagens positivas: subida de nível, entrada nos destaques da página inicial.
// 3. Pausa a terminar amanhã.
// 4. No máximo um lembrete por agricultor a cada 7 dias, o mais relevante:
//    encomendas por aceitar > mensagens sem resposta > catálogo parado.
//    Agricultores em pausa ou fora de época não recebem lembretes.
//
// Protegida por CRON_SECRET, como expire-orders. Chamar uma vez por dia
// (ex.: 07:00 Europe/Lisbon) com:
//   Authorization: Bearer <CRON_SECRET>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { emailEnabled, sendEmail } from "../_shared/email.ts";

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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

const LEVELS = ["semente", "rebento", "colheita", "pomar"];
const LEVEL_LABELS: Record<string, string> = {
  semente: "Semente",
  rebento: "Rebento",
  colheita: "Colheita",
  pomar: "Pomar",
};

const NUDGE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const PENDING_ORDER_MS = 12 * 60 * 60 * 1000;
const CHAT_REPLY_MS = 24 * 60 * 60 * 1000;
const STALE_CATALOG_DAYS = 14;

/** Tipos de notificação deste job, para evitar duplicados se correr 2× no dia. */
const TYPES = {
  nudge: "activity_nudge",
  levelUp: "activity_level_up",
  featured: "activity_featured",
  pauseEnding: "activity_pause_ending",
} as const;

interface Notification {
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  order_id?: string;
}

const todayLisbon = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(d);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const expected = Deno.env.get("CRON_SECRET");
    if (!expected) {
      console.error("farmer-activity: CRON_SECRET not configured");
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

    const runStartedAt = new Date();
    const { data: computed, error: computeErr } = await admin.rpc("compute_farmer_activity");
    if (computeErr) throw computeErr;

    const { data: activity, error: actErr } = await admin
      .from("farmer_activity")
      .select("farmer_id, score, level, previous_level, components, exempt_reason, featured_rank, featured_since, last_nudge_at");
    if (actErr) throw actErr;
    if (!activity || activity.length === 0) {
      return new Response(JSON.stringify({ computed, notified: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const farmerIds = activity.map((a) => a.farmer_id);
    const { data: farmers, error: farmersErr } = await admin
      .from("farmer_details")
      .select("id, user_id, paused_until")
      .in("id", farmerIds);
    if (farmersErr) throw farmersErr;
    const farmerById = new Map((farmers ?? []).map((f) => [f.id, f]));

    // Encomendas pagas por aceitar há mais de 12 h.
    const { data: pendingOrders } = await admin
      .from("orders")
      .select("id, farmer_id")
      .eq("status", "awaiting_pickup")
      .is("accepted_at", null)
      .lt("created_at", new Date(Date.now() - PENDING_ORDER_MS).toISOString());
    const pendingByFarmer = new Map<string, string[]>();
    for (const o of pendingOrders ?? []) {
      pendingByFarmer.set(o.farmer_id, [...(pendingByFarmer.get(o.farmer_id) ?? []), o.id]);
    }

    // Mensagens de clientes (últimos 7 dias) sem resposta do agricultor em 24 h.
    const chatWindowStart = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: chatRows } = await admin
      .from("order_chat_messages")
      .select("order_id, sender_role, created_at, orders!inner(farmer_id, status)")
      .gte("created_at", chatWindowStart)
      .in("sender_role", ["cliente", "agricultor"])
      .order("created_at", { ascending: true });
    const unansweredByFarmer = new Map<string, string>(); // farmer_id -> order_id
    const byOrder = new Map<string, { role: string; at: number }[]>();
    const orderFarmer = new Map<string, string>();
    for (const m of chatRows ?? []) {
      // deno-lint-ignore no-explicit-any
      const order = (m as any).orders as { farmer_id: string; status: string } | null;
      if (!order) continue;
      orderFarmer.set(m.order_id, order.farmer_id);
      byOrder.set(m.order_id, [
        ...(byOrder.get(m.order_id) ?? []),
        { role: m.sender_role, at: new Date(m.created_at).getTime() },
      ]);
    }
    for (const [orderId, msgs] of byOrder) {
      const lastFarmerReply = Math.max(0, ...msgs.filter((m) => m.role === "agricultor").map((m) => m.at));
      const waiting = msgs.find(
        (m) => m.role === "cliente" && m.at > lastFarmerReply && Date.now() - m.at > CHAT_REPLY_MS,
      );
      if (waiting) unansweredByFarmer.set(orderFarmer.get(orderId)!, orderId);
    }

    const notifications: Notification[] = [];
    const nudgedFarmerIds: string[] = [];
    const tomorrow = todayLisbon(1);

    for (const a of activity) {
      const farmer = farmerById.get(a.farmer_id);
      if (!farmer) continue;
      const userId = farmer.user_id;

      // Mensagens positivas (não contam para o limite semanal).
      if (
        !a.exempt_reason &&
        a.previous_level &&
        LEVELS.indexOf(a.level) > LEVELS.indexOf(a.previous_level)
      ) {
        notifications.push({
          user_id: userId,
          type: TYPES.levelUp,
          title: `Subiste para o nível ${LEVEL_LABELS[a.level]}! 🌱`,
          message: "A tua atividade está a dar frutos: os teus produtos aparecem mais acima no catálogo.",
          link: "/agricultor/vendas",
        });
      }
      if (a.featured_rank && a.featured_since && new Date(a.featured_since) >= runStartedAt) {
        notifications.push({
          user_id: userId,
          type: TYPES.featured,
          title: "Estás em destaque na página inicial ⭐",
          message: "És um dos agricultores mais ativos da plataforma. Mantém o stock atualizado para continuares em destaque.",
          link: "/",
        });
      }
      if (farmer.paused_until === tomorrow) {
        notifications.push({
          user_id: userId,
          type: TYPES.pauseEnding,
          title: "A tua pausa termina amanhã",
          message: "Os teus produtos voltam a aparecer no catálogo. Confirma o stock e os horários antes de regressares.",
          link: "/agricultor/produtos",
        });
      }

      // Lembrete semanal.
      if (a.exempt_reason) continue;
      if (a.last_nudge_at && Date.now() - new Date(a.last_nudge_at).getTime() < NUDGE_INTERVAL_MS) continue;

      // deno-lint-ignore no-explicit-any
      const catalog = ((a.components ?? {}) as any).catalog ?? {};
      const pending = pendingByFarmer.get(a.farmer_id);
      const unansweredOrder = unansweredByFarmer.get(a.farmer_id);
      let nudge: Notification | null = null;

      if (pending && pending.length > 0) {
        nudge = {
          user_id: userId,
          type: TYPES.nudge,
          title: pending.length === 1 ? "Tens uma encomenda por aceitar" : `Tens ${pending.length} encomendas por aceitar`,
          message: "Aceitar depressa deixa os clientes descansados e faz-te subir no catálogo.",
          link: "/agricultor/encomendas",
        };
      } else if (unansweredOrder) {
        nudge = {
          user_id: userId,
          type: TYPES.nudge,
          title: "Um cliente está à espera da tua resposta",
          message: "Responder no chat em menos de 24 horas conta para a tua pontuação de atividade.",
          link: `/agricultor/encomendas?id=${unansweredOrder}`,
          order_id: unansweredOrder,
        };
      } else if (!catalog.active_products) {
        nudge = {
          user_id: userId,
          type: TYPES.nudge,
          title: "Adiciona o teu primeiro produto",
          message: "Os clientes ainda não conseguem comprar-te nada. Demora poucos minutos a criar um produto.",
          link: "/agricultor/produtos/novo",
        };
      } else if ((catalog.days_since_update ?? 0) >= STALE_CATALOG_DAYS) {
        nudge = {
          user_id: userId,
          type: TYPES.nudge,
          title: "Os teus produtos estão atualizados?",
          message: `Não mexes no catálogo há ${catalog.days_since_update} dias. Confirma o stock para subires no catálogo.`,
          link: "/agricultor/produtos",
        };
      }

      if (nudge) {
        notifications.push(nudge);
        nudgedFarmerIds.push(a.farmer_id);
      }
    }

    // Evitar duplicados se o job correr mais do que uma vez no mesmo dia.
    const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
    const userIds = [...new Set(notifications.map((n) => n.user_id))];
    const sentRecently = new Set<string>();
    if (userIds.length) {
      const { data: recent } = await admin
        .from("notifications")
        .select("user_id, type")
        .in("user_id", userIds)
        .in("type", Object.values(TYPES))
        .gte("created_at", since);
      for (const r of recent ?? []) sentRecently.add(`${r.user_id}:${r.type}`);
    }
    const toInsert = notifications.filter((n) => !sentRecently.has(`${n.user_id}:${n.type}`));

    if (toInsert.length) {
      const { error: insErr } = await admin.from("notifications").insert(toInsert);
      if (insErr) throw insErr;
    }
    if (nudgedFarmerIds.length) {
      await admin
        .from("farmer_activity")
        .update({ last_nudge_at: new Date().toISOString() })
        .in("farmer_id", nudgedFarmerIds);
    }

    // Email: só quando houver fornecedor configurado (ver _shared/email.ts).
    let emailed = 0;
    if (emailEnabled()) {
      const appUrl = Deno.env.get("APP_URL") ?? "";
      for (const n of toInsert.filter((x) => x.type === TYPES.nudge)) {
        const { data: u } = await admin.auth.admin.getUserById(n.user_id);
        const email = u?.user?.email;
        if (!email) continue;
        const ok = await sendEmail({
          to: email,
          subject: n.title,
          html: `<p>${n.message}</p><p><a href="${appUrl}${n.link}">Abrir o FarmConnect</a></p>`,
        });
        if (ok) emailed++;
      }
    }

    return new Response(
      JSON.stringify({ computed, notified: toInsert.length, nudged: nudgedFarmerIds.length, emailed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("farmer-activity error", e);
    return jsonError(500, "Erro interno");
  }
});

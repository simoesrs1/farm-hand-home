// Traduz o conteúdo escrito por pessoas para o idioma escolhido no site, com a API da
// Claude, e guarda o resultado (tabela content_translations) para não traduzir duas vezes.
//
// O site nunca envia o texto: envia referências { type, id, field } e o servidor vai
// buscar o texto à base de dados, só se quem pede o pode ver. Assim a função não
// serve para traduzir textos arbitrários (e gastar créditos). Ver docs/traducoes.md.
//
// Sem ANTHROPIC_API_KEY devolve só o que já está traduzido; o site mostra o original.
import Anthropic from "npm:@anthropic-ai/sdk@1.6.0";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.110.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "claude-haiku-5-5";
const MAX_ITEMS = 50;
const MAX_TEXT_CHARS = 5000;

const LANG_NAMES: Record<string, string> = {
  pt: "português de Portugal",
  en: "inglês (britânico)",
  de: "alemão",
  es: "espanhol de Espanha",
  fr: "francês",
};

type SourceType = "product" | "experience" | "stay" | "subscription" | "farm" | "review" | "notification" | "chat" | "order_item";
type Item = { type: SourceType; id: string; field: string };

// Campos que se podem traduzir em cada tipo de conteúdo.
const FIELDS: Record<SourceType, string[]> = {
  product: ["name", "description"],
  experience: ["title", "description"],
  stay: ["title", "description"],
  subscription: ["title", "description", "includes"],
  farm: ["description", "pickup_hours_note", "delivery_note", "pause_note"],
  review: ["comment"],
  notification: ["title", "message"],
  chat: ["content"],
  order_item: ["product_name"],
};

const UUID = /^[0-9a-f-]{36}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const keyOf = (i: Item) => `${i.type}:${i.id}:${i.field}`;

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Textos originais das referências pedidas, só os que quem pede pode ver:
 * conteúdo público ativo para todos; notificações e chat só para os envolvidos.
 */
async function loadSources(admin: SupabaseClient, items: Item[], userId: string | null) {
  const out = new Map<string, string>();
  const ids = (type: SourceType) => [...new Set(items.filter((i) => i.type === type).map((i) => i.id))];
  const put = (type: SourceType, id: string, row: Record<string, unknown>) => {
    for (const field of FIELDS[type]) {
      const value = row[field];
      if (typeof value === "string" && value.trim()) out.set(`${type}:${id}:${field}`, value.slice(0, MAX_TEXT_CHARS));
    }
  };

  const productIds = ids("product");
  if (productIds.length) {
    const { data } = await admin.from("products").select("id, name, description").in("id", productIds).eq("active", true);
    for (const r of data ?? []) put("product", r.id, r);
  }
  const expIds = ids("experience");
  if (expIds.length) {
    const { data } = await admin.from("farm_experiences").select("id, title, description").in("id", expIds).eq("active", true);
    for (const r of data ?? []) put("experience", r.id, r);
  }
  const stayIds = ids("stay");
  if (stayIds.length) {
    const { data } = await admin.from("farm_stays").select("id, title, description").in("id", stayIds).eq("active", true);
    for (const r of data ?? []) put("stay", r.id, r);
  }
  const subscriptionIds = ids("subscription");
  if (subscriptionIds.length) {
    const { data } = await admin
      .from("subscription_plans")
      .select("id, title, description, includes")
      .in("id", subscriptionIds)
      .eq("active", true);
    for (const r of data ?? []) put("subscription", r.id, r);
  }
  const farmIds = ids("farm");
  if (farmIds.length) {
    const { data } = await admin
      .from("public_farmer_profiles")
      .select("id, description, pickup_hours_note, delivery_note, pause_note")
      .in("id", farmIds);
    for (const r of data ?? []) put("farm", r.id as string, r);
  }
  const reviewIds = ids("review");
  if (reviewIds.length) {
    const { data } = await admin.from("farmer_reviews").select("id, comment").in("id", reviewIds).is("removed_at", null);
    for (const r of data ?? []) put("review", r.id, r);
  }
  if (!userId) return out;

  const notifIds = ids("notification");
  if (notifIds.length) {
    const { data } = await admin
      .from("notifications")
      .select("id, title, message")
      .in("id", notifIds)
      .eq("user_id", userId);
    for (const r of data ?? []) put("notification", r.id, r);
  }
  // Mensagens do chat e linhas das encomendas: só o cliente ou o agricultor da encomenda.
  const chatIds = ids("chat");
  const itemIds = ids("order_item");
  const [{ data: msgs }, { data: lines }] = await Promise.all([
    chatIds.length
      ? admin.from("order_chat_messages").select("id, order_id, content").in("id", chatIds)
      : Promise.resolve({ data: [] as { id: string; order_id: string; content: string }[] }),
    itemIds.length
      ? admin.from("order_items").select("id, order_id, product_name").in("id", itemIds)
      : Promise.resolve({ data: [] as { id: string; order_id: string; product_name: string }[] }),
  ]);
  const orderIds = [...new Set([...(msgs ?? []), ...(lines ?? [])].map((m) => m.order_id))];
  if (orderIds.length) {
    const { data: orders } = await admin
      .from("orders")
      .select("id, client_id, farmer:farmer_id(user_id)")
      .in("id", orderIds);
    const allowed = new Set(
      (orders ?? [])
        .filter((o) => o.client_id === userId || (o.farmer as { user_id?: string } | null)?.user_id === userId)
        .map((o) => o.id),
    );
    for (const m of msgs ?? []) if (allowed.has(m.order_id)) put("chat", m.id, m);
    for (const l of lines ?? []) if (allowed.has(l.order_id)) put("order_item", l.id, l);
  }
  return out;
}

/** Traduz vários textos numa só chamada; devolve null nos que falharem. */
async function translateBatch(client: Anthropic, texts: string[], lang: string): Promise<(string | null)[]> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low" },
    system:
      `És tradutor de um marketplace de quintas agrícolas em Portugal. Traduz cada texto para ${LANG_NAMES[lang]}, ` +
      "com naturalidade e mantendo o tom, as quebras de linha, os números, os preços e os nomes próprios " +
      "(nomes de quintas e de pessoas não se traduzem). Se um texto já estiver nesse idioma, devolve-o igual. " +
      "Não acrescentes nem retires informação. Responde apenas com um array JSON de strings, com a mesma " +
      "ordem e o mesmo número de elementos do array recebido, sem mais nada.",
    messages: [{ role: "user", content: JSON.stringify(texts) }],
  });
  if (response.stop_reason === "refusal") return texts.map(() => null);
  const raw = response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim()
    .replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === texts.length) {
      return parsed.map((v) => (typeof v === "string" && v.trim() ? v : null));
    }
  } catch {
    // resposta inválida: fica sem tradução (o site mostra o original)
  }
  return texts.map(() => null);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    const lang = body?.lang;
    if (typeof lang !== "string" || !(lang in LANG_NAMES)) return json({ error: "Idioma inválido" }, 400);
    const items: Item[] = (Array.isArray(body?.items) ? body.items : [])
      .filter(
        (i: Item) =>
          i && i.type in FIELDS && typeof i.id === "string" && UUID.test(i.id) && FIELDS[i.type].includes(i.field),
      )
      .slice(0, MAX_ITEMS);
    if (items.length === 0) return json({ translations: {} });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Sessão opcional: só serve para notificações e chat (a chave pública não é um utilizador).
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const sources = await loadSources(admin, items, userId);
    const wanted = items.filter((i) => sources.has(keyOf(i)));
    const hashes = new Map<string, string>();
    for (const i of wanted) hashes.set(keyOf(i), await sha256(sources.get(keyOf(i))!));

    // Traduções já guardadas e ainda válidas (o texto original não mudou).
    const translations: Record<string, string> = {};
    const types = [...new Set(wanted.map((i) => i.type))];
    for (const type of types) {
      const { data } = await admin
        .from("content_translations")
        .select("source_id, field, source_hash, translated")
        .eq("source_type", type)
        .eq("lang", lang)
        .in("source_id", [...new Set(wanted.filter((i) => i.type === type).map((i) => i.id))]);
      for (const r of data ?? []) {
        const key = `${type}:${r.source_id}:${r.field}`;
        if (hashes.get(key) === r.source_hash) translations[key] = r.translated;
      }
    }

    const missing = wanted.filter((i) => !(keyOf(i) in translations));
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (missing.length && apiKey) {
      const client = new Anthropic({ apiKey });
      const results = await translateBatch(client, missing.map((i) => sources.get(keyOf(i))!), lang);
      const rows = [];
      for (const [n, i] of missing.entries()) {
        const text = results[n];
        if (!text) continue;
        translations[keyOf(i)] = text;
        rows.push({
          source_type: i.type,
          source_id: i.id,
          field: i.field,
          lang,
          source_hash: hashes.get(keyOf(i))!,
          translated: text,
        });
      }
      if (rows.length) await admin.from("content_translations").upsert(rows);
    }

    return json({ translations });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`translate-content: API ${err.status}`, err.message);
      return json({ translations: {} });
    }
    console.error("translate-content error", err);
    return json({ error: "Erro interno" }, 500);
  }
});

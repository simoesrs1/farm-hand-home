// Escreve uma proposta de descrição de venda (copywriting) para um produto, uma
// experiência ou um alojamento, a partir do texto curto do agricultor, dos dados do
// formulário e de até 3 fotografias, com a API da Claude.
//
// Só agricultores com sessão iniciada; limite diário por agricultor
// (tabela ai_copy_usage). Ver docs/ia-descricoes.md.
//
// Segredo necessário: ANTHROPIC_API_KEY (console.anthropic.com → API keys), definido com
// `supabase secrets set ANTHROPIC_API_KEY=...`. Sem ele, a função responde 503 com uma
// mensagem clara e o formulário continua a funcionar.
import Anthropic from "npm:@anthropic-ai/sdk@1.6.0";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Haiku: o modelo mais barato, suficiente para um texto curto. Para mais qualidade,
// trocar por "claude-sonnet-5-5" ou "claude-opus-5-5" (mais caros).
const MODEL = "claude-haiku-5-5";

// Gerações por agricultor nas últimas 24 horas.
const DAILY_LIMIT = 30;
const MAX_IMAGES = 3;
// Fotografias guardadas: acima disto não se enviam (a API aceita até 10 MB em base64).
const MAX_STORED_IMAGE_BYTES = 5_000_000;
const MAX_DRAFT_CHARS = 2000;
const MAX_FACTS = 25;

type Kind = "product" | "experience" | "stay";
type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const DATA_URL = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/;
const EXT_MEDIA_TYPE: Record<string, ImageMediaType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

const BASE_PROMPT =
  "És um copywriter de um marketplace de quintas agrícolas em Portugal. Escreves em português de " +
  "Portugal (nunca português do Brasil), num tom apelativo, sensorial e elegante, que faz apetecer " +
  "comprar ou reservar: cores, aromas, texturas, paisagem, o ritmo da quinta. " +
  "Regras obrigatórias: usa apenas factos dados pelo agricultor ou visíveis nas fotografias; nunca " +
  "inventes certificações, prémios, origem, ingredientes, comodidades, horários ou preços; não faças " +
  "alegações de saúde nem nutricionais; não uses superlativos absolutos ('o melhor de Portugal'). " +
  "Escreve de forma impessoal, sem tratar o leitor por 'tu' nem por 'você'. " +
  "Devolve apenas o texto da descrição, sem título, sem aspas, sem markdown e sem emojis.";

const KIND_PROMPT: Record<Kind, string> = {
  product: "Escreve a descrição de um produto agrícola, com 60 a 100 palavras, em 1 ou 2 parágrafos.",
  experience:
    "Escreve a descrição de uma experiência numa quinta: o que se vai viver e fazer, o ambiente e o " +
    "brinde, com 120 a 200 palavras, em 2 ou 3 parágrafos.",
  stay:
    "Escreve a descrição de um alojamento numa quinta agrícola: o espaço, o conforto e a envolvente, " +
    "com 120 a 200 palavras, em 2 ou 3 parágrafos. Não inventes comodidades.",
};

const KIND_LABEL: Record<Kind, string> = {
  product: "produto agrícola",
  experience: "experiência na quinta",
  stay: "alojamento na quinta",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Factos do formulário: só valores simples e curtos. */
function cleanFacts(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const lines: string[] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_FACTS)) {
    if (value === null || value === undefined || value === "" || value === false) continue;
    if (!["string", "number", "boolean"].includes(typeof value)) continue;
    const text = value === true ? "sim" : String(value).slice(0, 300);
    lines.push(`${key.slice(0, 40)}: ${text}`);
  }
  return lines.join("\n");
}

/** Pedido antigo do formulário de produto (antes de existir `kind`). */
function legacyProductFacts(body: Record<string, unknown>) {
  return {
    Nome: body.name,
    Categoria: body.category,
    "Unidade de venda": body.unit,
    "Quinta/produtor": body.farmName,
    "É biológico": body.isOrganic,
    "É sem lactose": body.isLactoseFree,
    Processamento: body.modifications,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json({ error: "A geração de descrições ainda não está ativa. Escreva a descrição à mão." }, 503);
  }

  try {
    // Só agricultores com sessão (a chave pública, sozinha, não chega).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Sessão inválida" }, 401);
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: farmer } = await admin
      .from("farmer_details")
      .select("id, company_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (!farmer) return json({ error: "Só os agricultores podem usar esta funcionalidade." }, 403);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("ai_copy_usage")
      .select("id", { count: "exact", head: true })
      .eq("farmer_id", farmer.id)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return json({ error: `Atingiu o limite de ${DAILY_LIMIT} descrições por dia. Tente novamente amanhã.` }, 429);
    }

    const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    const kind: Kind = body.kind === "experience" || body.kind === "stay" ? body.kind : "product";
    const draft = typeof body.draft === "string" ? body.draft.trim().slice(0, MAX_DRAFT_CHARS) : "";
    const facts = cleanFacts(body.kind ? body.facts : legacyProductFacts(body));

    // Fotografias: novas (data URLs do browser) primeiro, depois as já guardadas.
    const content: Anthropic.ContentBlockParam[] = [];
    for (const url of (Array.isArray(body.images) ? body.images : []).slice(0, MAX_IMAGES)) {
      const match = typeof url === "string" ? DATA_URL.exec(url) : null;
      if (!match) continue;
      content.push({
        type: "image",
        source: { type: "base64", media_type: match[1] as ImageMediaType, data: match[2] },
      });
    }
    for (const path of Array.isArray(body.imagePaths) ? body.imagePaths : []) {
      if (content.length >= MAX_IMAGES) break;
      // Só ficheiros da pasta do próprio agricultor, e só imagens.
      if (typeof path !== "string" || !path.startsWith(`${userId}/`) || path.includes("..")) continue;
      const mediaType = EXT_MEDIA_TYPE[path.split(".").pop()?.toLowerCase() ?? ""];
      if (!mediaType) continue;
      const { data: file } = await admin.storage.from("product-media").download(path);
      if (!file || file.size > MAX_STORED_IMAGE_BYTES) continue;
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: toBase64(new Uint8Array(await file.arrayBuffer())) },
      });
    }

    if (!draft && !facts && content.length === 0) {
      return json({ error: "Escreva um pequeno texto ou adicione uma fotografia primeiro." }, 400);
    }

    content.push({
      type: "text",
      text:
        `Tipo: ${KIND_LABEL[kind]}\nQuinta: ${farmer.company_name ?? "—"}\n\n` +
        `Dados do formulário:\n${facts || "Sem dados adicionais."}\n\n` +
        `Texto do agricultor:\n${draft || "(sem texto)"}\n\n` +
        "Reescreve como descrição de venda, seguindo as regras.",
    });

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "low" },
      system: `${BASE_PROMPT}\n\n${KIND_PROMPT[kind]}`,
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "Não foi possível gerar uma descrição. Escreva-a à mão." }, 422);
    }

    const description = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("")
      .trim()
      .replace(/^["“«]+|["”»]+$/g, "");
    if (!description) return json({ error: "Não foi possível gerar uma descrição. Tente de novo." }, 502);

    // Consumo, para o limite diário e para acompanhar custos.
    await admin.from("ai_copy_usage").insert({
      farmer_id: farmer.id,
      kind,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });

    return json({ description });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: "Demasiados pedidos. Tente novamente daqui a pouco." }, 429);
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("generate-product-description: ANTHROPIC_API_KEY inválida");
      return json({ error: "A geração de descrições está indisponível de momento." }, 503);
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`generate-product-description: API ${err.status}`, err.message);
      return json({ error: "A geração de descrições está indisponível de momento." }, 502);
    }
    console.error("generate-product-description error", err);
    return json({ error: "Erro interno" }, 500);
  }
});

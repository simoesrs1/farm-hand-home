// Gera a descrição de venda de um produto (texto e fotografias) com a API da Claude.
//
// Segredo necessário: ANTHROPIC_API_KEY (console.anthropic.com → API keys).
// Sem ele, a função responde 503 com uma mensagem clara e o formulário continua a funcionar.
import Anthropic from "npm:@anthropic-ai/sdk@1.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT =
  "És um copywriter de um marketplace agrícola de proximidade em Portugal. " +
  "Escreves em português de Portugal, num tom simples, honesto e elegante. " +
  "Devolve apenas a descrição (2 a 4 frases, máximo ~60 palavras), sem títulos, sem markdown, " +
  "sem emojis, sem inventar certificações ou factos que não te foram dados. " +
  "Se houver fotografias, usa detalhes visuais reais (cor, frescura, apresentação).";

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const DATA_URL = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    const body = await req.json();
    const {
      name = "",
      category = "",
      unit = "",
      isOrganic = false,
      isLactoseFree = false,
      modifications = "",
      farmName = "",
      images = [],
    } = body ?? {};

    const facts = [
      name && `Nome: ${name}`,
      category && `Categoria: ${category}`,
      unit && `Unidade de venda: ${unit}`,
      farmName && `Quinta/produtor: ${farmName}`,
      isOrganic && "É biológico",
      isLactoseFree && "É sem lactose",
      modifications && `Processamento: ${modifications}`,
    ]
      .filter(Boolean)
      .join("\n");

    // As fotografias chegam do browser como data URLs (base64); no máximo 3.
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    for (const url of (Array.isArray(images) ? images : []).slice(0, 3)) {
      const match = typeof url === "string" ? DATA_URL.exec(url) : null;
      if (!match) continue;
      content.push({
        type: "image",
        source: { type: "base64", media_type: match[1] as ImageMediaType, data: match[2] },
      });
    }
    content.push({
      type: "text",
      text: `Escreve uma descrição de venda para este produto agrícola português.\n\n${facts || "Sem dados adicionais."}`,
    });

    const client = new Anthropic({ apiKey });
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "low" },
      // Se o modelo recusar o pedido, a API tenta outro modelo na mesma chamada.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "Não foi possível gerar uma descrição para este produto. Escreva-a à mão." }, 422);
    }

    const description = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("")
      .trim();

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

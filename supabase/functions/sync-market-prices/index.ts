import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SUPERMARKETS = [
  "continente.pt",
  "pingodoce.pt",
  "auchan.pt",
  "intermarche.pt",
  "elcorteingles.pt",
];

type Extracted = {
  avg_price: number;
  unit: string;
  sources: { store: string; price: number; url?: string }[];
};

const normalize = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function firecrawlSearch(query: string, lovableKey: string, fcKey: string) {
  const res = await fetch(`${GATEWAY}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": fcKey,
    },
    body: JSON.stringify({
      query,
      limit: 5,
      lang: "pt",
      country: "pt",
      scrapeOptions: { formats: ["markdown"] },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[${res.status}] Firecrawl search failed: ${body}`);
  }
  return await res.json();
}

async function extractPrice(
  productName: string,
  unit: string,
  searchResults: unknown,
  lovableKey: string,
): Promise<Extracted | null> {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "És um analista de preços de retalho alimentar em Portugal. A partir de excertos de páginas de supermercados, determina o preço médio de venda ao público (EUR) do produto pedido, convertido para a unidade indicada. Ignora resultados que não sejam do produto. Responde apenas com a ferramenta.",
        },
        {
          role: "user",
          content: `Produto: ${productName}\nUnidade alvo: ${unit}\n\nResultados de pesquisa:\n${JSON.stringify(
            searchResults,
          ).slice(0, 45000)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "registar_preco",
            description: "Regista o preço médio de supermercado encontrado.",
            parameters: {
              type: "object",
              properties: {
                found: { type: "boolean" },
                avg_price: { type: "number" },
                unit: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      store: { type: "string" },
                      price: { type: "number" },
                      url: { type: "string" },
                    },
                    required: ["store", "price"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["found", "avg_price", "unit", "sources"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "registar_preco" } },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[${res.status}] AI extraction failed: ${body}`);
  }
  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return null;
  const parsed = JSON.parse(call.function.arguments);
  if (!parsed.found || !(parsed.avg_price > 0)) return null;
  return parsed as Extracted;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
    if (!fcKey) throw new Error("FIRECRAWL_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Products currently on sale define which market references matter.
    const { data: products, error } = await supabase
      .from("products")
      .select("name, category, unit")
      .eq("active", true);
    if (error) throw error;

    const targets = new Map<string, { name: string; category: string | null; unit: string }>();
    for (const p of products ?? []) {
      const key = normalize(p.name);
      if (key && !targets.has(key)) {
        targets.set(key, { name: p.name, category: p.category, unit: p.unit ?? "kg" });
      }
    }

    // Cap per run so a daily job stays within time/credit budget.
    const list = [...targets.entries()].slice(0, 25);
    const results: { product: string; status: string }[] = [];

    for (const [key, target] of list) {
      try {
        const query = `preço ${target.name} ${SUPERMARKETS.map((s) => `site:${s}`).join(" OR ")}`;
        const search = await firecrawlSearch(query, lovableKey, fcKey);
        const extracted = await extractPrice(target.name, target.unit, search?.data ?? search, lovableKey);
        if (!extracted) {
          results.push({ product: target.name, status: "sem preço fiável" });
          continue;
        }
        const { error: upsertError } = await supabase.from("market_prices").upsert(
          {
            product_key: key,
            display_name: target.name,
            category: target.category,
            unit: extracted.unit || target.unit,
            avg_price: Math.round(extracted.avg_price * 100) / 100,
            sample_size: extracted.sources?.length ?? 0,
            sources: extracted.sources ?? [],
            collected_at: new Date().toISOString(),
          },
          { onConflict: "product_key" },
        );
        if (upsertError) throw upsertError;
        results.push({ product: target.name, status: "atualizado" });
      } catch (e) {
        console.error(`market price sync failed for ${target.name}:`, e);
        results.push({ product: target.name, status: `erro: ${(e as Error).message}` });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-market-prices error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

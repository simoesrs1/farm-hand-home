const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

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

    const content: unknown[] = [
      {
        type: "text",
        text:
          `Escreve uma descrição de venda para este produto agrícola português.\n\n${facts || "Sem dados adicionais."}`,
      },
    ];
    for (const url of (images as string[]).slice(0, 3)) {
      content.push({ type: "image_url", image_url: { url } });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "És um copywriter de um marketplace agrícola de proximidade em Portugal. Escreves em português de Portugal, num tom simples, honesto e elegante. Devolve apenas a descrição (2 a 4 frases, máximo ~60 palavras), sem títulos, sem markdown, sem emojis, sem inventar certificações ou factos que não te foram dados. Se houver fotografias, usa detalhes visuais reais (cor, frescura, apresentação).",
          },
          { role: "user", content },
        ],
      }),
    });

    if (res.status === 429) {
      return new Response(
        JSON.stringify({ error: "Demasiados pedidos. Tente novamente daqui a pouco." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (res.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI gateway: ${res.status} ${t}`);
    }

    const data = await res.json();
    const description: string = data?.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

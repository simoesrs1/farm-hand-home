import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "search_farmers",
  title: "Search farmers",
  description: "Search FarmConnect farmers (producers) by farm name or address text. Returns public farm profiles.",
  inputSchema: {
    query: z.string().trim().optional().describe("Text to match against company name or address. Omit to list recent farmers."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    let q = supabase
      .from("farmer_public")
      .select("id, company_name, address, description, website, pickup_days")
      .eq("registration_step", 2)
      .limit(limit ?? 10);
    if (query && query.length > 0) {
      const like = `%${query}%`;
      q = q.or(`company_name.ilike.${like},address.ilike.${like}`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { farmers: data ?? [] },
    };
  },
});

import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_products",
  title: "List products",
  description: "Browse active FarmConnect products. Optionally filter by category name or farmer id.",
  inputSchema: {
    category: z.string().trim().optional().describe("Category name, e.g. 'Fruta', 'Hortícolas'."),
    farmer_id: z.string().uuid().optional().describe("Restrict to one farmer."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, farmer_id, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    let q = supabase
      .from("products")
      .select("id, name, category, client_price, unit, stock_quantity, is_organic, delivery_mode, farmer_id")
      .eq("active", true)
      .limit(limit ?? 20);
    if (category) q = q.eq("category", category);
    if (farmer_id) q = q.eq("farmer_id", farmer_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { products: data ?? [] },
    };
  },
});

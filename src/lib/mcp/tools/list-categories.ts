import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { categoryList } from "../../../data/category-list";

export default defineTool({
  name: "list_categories",
  title: "List product categories",
  description: "List all product categories available on FarmConnect (Bebidas, Carne, Fruta, Hortícolas, etc.).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const rows = categoryList.map((c) => ({ name: c.name, slug: c.slug }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { categories: rows },
    };
  },
});

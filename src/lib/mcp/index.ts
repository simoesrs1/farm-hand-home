import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCategoriesTool from "./tools/list-categories";
import searchFarmersTool from "./tools/search-farmers";
import listProductsTool from "./tools/list-products";
import listMyOrdersTool from "./tools/list-my-orders";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "farmconnect-mcp",
  title: "FarmConnect MCP",
  version: "0.1.0",
  instructions:
    "Tools for FarmConnect, a Portuguese proximity marketplace connecting clients to local farmers. Use `list_categories` to see product categories, `search_farmers` to find producers, `list_products` to browse the catalog, and `list_my_orders` to inspect the signed-in user's orders.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCategoriesTool, searchFarmersTool, listProductsTool, listMyOrdersTool],
});

import "i18next";
import type { ptResources } from "@/i18n";

// Chaves de tradução verificadas pelo TypeScript (a partir dos textos em português).
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: typeof ptResources;
  }
}

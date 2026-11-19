/**
 * Traduções do site (i18next). Os textos estão em src/locales/<idioma>/<área>.json;
 * o português é a origem e o recurso quando falta uma tradução.
 *
 * Idioma: a escolha do utilizador (armazenamento local) ou, na primeira visita, o
 * idioma do navegador, se for um dos suportados. Com sessão iniciada, a escolha
 * também fica no perfil (LanguageSwitcher).
 *
 * Área nova: criar src/locales/<idioma>/<área>.json nos cinco idiomas e acrescentar
 * o import português a `ptResources` (é daí que vêm os tipos das chaves).
 */
import i18n, { type Resource } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import ptCommon from "@/locales/pt/common.json";
import ptHome from "@/locales/pt/home.json";
import ptCatalog from "@/locales/pt/catalog.json";
import ptCart from "@/locales/pt/cart.json";
import ptOrders from "@/locales/pt/orders.json";
import ptAccount from "@/locales/pt/account.json";
import ptFarmer from "@/locales/pt/farmer.json";
import ptOfferings from "@/locales/pt/offerings.json";
import ptLegal from "@/locales/pt/legal.json";
import ptServer from "@/locales/pt/server.json";
import { DEFAULT_LANGUAGE, LANGUAGES, LANGUAGE_STORAGE_KEY } from "@/i18n/languages";

/** Textos em português: origem dos tipos das chaves (i18next.d.ts). */
export const ptResources = {
  common: ptCommon,
  home: ptHome,
  catalog: ptCatalog,
  cart: ptCart,
  orders: ptOrders,
  account: ptAccount,
  farmer: ptFarmer,
  offerings: ptOfferings,
  legal: ptLegal,
  server: ptServer,
};

export const NAMESPACES = Object.keys(ptResources) as (keyof typeof ptResources)[];

// Todos os idiomas, carregados a partir dos ficheiros.
const files = import.meta.glob<{ default: Record<string, unknown> }>("../locales/*/*.json", { eager: true });
export const resources: Resource = {};
for (const [path, mod] of Object.entries(files)) {
  const match = path.match(/locales\/([a-z]{2})\/([A-Za-z]+)\.json$/);
  if (!match) continue;
  const [, lang, ns] = match;
  resources[lang] = { ...resources[lang], [ns]: mod.default };
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: LANGUAGES.map((l) => l.code),
    // "pt-PT" no navegador conta como "pt".
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    defaultNS: "common",
    ns: NAMESPACES,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

// Leitores de ecrã e tradução do navegador: o <html lang> acompanha a escolha.
const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = LANGUAGES.find((l) => l.code === lng.slice(0, 2))?.locale ?? "pt-PT";
};
syncHtmlLang(i18n.resolvedLanguage ?? DEFAULT_LANGUAGE);
i18n.on("languageChanged", syncHtmlLang);

export default i18n;

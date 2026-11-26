/**
 * Traduções do site (i18next). Os textos estão em src/locales/<idioma>.json, um
 * ficheiro por idioma com uma secção por área; o português é a origem e o recurso
 * quando falta uma tradução.
 *
 * Idioma: a escolha do utilizador (armazenamento local) ou, na primeira visita, o
 * idioma do navegador, se for um dos suportados. Com sessão iniciada, a escolha
 * também fica no perfil (LanguageSwitcher).
 *
 * Área nova: acrescentar a secção a src/locales/<idioma>.json nos cinco idiomas
 * (os tipos das chaves vêm do ficheiro português).
 */
import i18n, { type Resource, type ResourceLanguage } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import pt from "@/locales/pt.json";
import { DEFAULT_LANGUAGE, LANGUAGES, LANGUAGE_STORAGE_KEY } from "@/i18n/languages";

/** Textos em português: origem dos tipos das chaves (i18next.d.ts). */
export const ptResources = pt;

export const NAMESPACES = Object.keys(ptResources) as (keyof typeof ptResources)[];

// Todos os idiomas, carregados a partir dos ficheiros.
const files = import.meta.glob<{ default: ResourceLanguage }>("../locales/*.json", { eager: true });
export const resources: Resource = {};
for (const [path, mod] of Object.entries(files)) {
  const match = path.match(/locales\/([a-z]{2})\.json$/);
  if (match) resources[match[1]] = mod.default;
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

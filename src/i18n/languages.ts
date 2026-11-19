/** Idiomas do site. O português é o idioma de origem e o de recurso. */
export const LANGUAGES = [
  { code: "pt", label: "Português", locale: "pt-PT" },
  { code: "en", label: "English", locale: "en-GB" },
  { code: "de", label: "Deutsch", locale: "de-DE" },
  { code: "es", label: "Español", locale: "es-ES" },
  { code: "fr", label: "Français", locale: "fr-FR" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "pt";

/** Chave no armazenamento local: escolha feita pelo próprio utilizador (necessária). */
export const LANGUAGE_STORAGE_KEY = "valorrural_lang";

export const isLanguageCode = (value: unknown): value is LanguageCode =>
  LANGUAGES.some((l) => l.code === value);

/** Código para datas, horas e preços (Intl / toLocaleString). */
export const localeFor = (code: string) =>
  LANGUAGES.find((l) => l.code === code.slice(0, 2))?.locale ?? "pt-PT";

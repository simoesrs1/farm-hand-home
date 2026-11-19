import { useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";
import {
  getCachedTranslation,
  needsTranslation,
  requestTranslation,
  subscribeTranslations,
  type ContentType,
} from "@/lib/content-translation";

/**
 * Texto escrito por pessoas no idioma escolhido. Enquanto a tradução não chega (ou
 * se não houver), devolve o original.
 */
export const useTranslatedContent = (type: ContentType, id: string | null | undefined, field: string, original: string) => {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? "pt";
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const active = !!id && !!original?.trim() && needsTranslation({ type, id }, lang);

  useEffect(() => {
    if (!active || !id) return;
    const unsubscribe = subscribeTranslations(rerender);
    requestTranslation({ type, id, field }, lang);
    return unsubscribe;
  }, [active, type, id, field, lang]);

  const translated = active && id ? getCachedTranslation({ type, id, field }, lang) : null;
  // Se o texto já estava no idioma escolhido, a "tradução" é igual e não há nada a alternar.
  const isTranslated = !!translated && translated.trim() !== original.trim();
  return { text: isTranslated ? translated : original, isTranslated };
};

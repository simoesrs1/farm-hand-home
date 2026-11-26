import { useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { useContentTranslation } from "@/contexts/ContentTranslationContext";
import {
  getCachedTranslation,
  needsTranslation,
  requestTranslation,
  subscribeTranslations,
  type ContentType,
} from "@/lib/content-translation";

/**
 * Texto escrito por pessoas, no original até se pedir a tradução. Enquanto ela não
 * chega (ou se não houver), devolve o original.
 *
 * - Notificações: automáticas, porque é o site que as gera em português.
 * - Chat: só com o botão da conversa (`translate`), em qualquer idioma.
 * - Resto: com o botão do topo da página, nos idiomas que não o português.
 */
export const useTranslatedContent = (
  type: ContentType,
  id: string | null | undefined,
  field: string,
  original: string,
  translate = false,
) => {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? "pt";
  const { enabled, register } = useContentTranslation();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const valid = !!id && !!original?.trim() && needsTranslation({ type, id }, lang);
  // Textos que dependem do botão do topo da página.
  const onPageButton = valid && type !== "notification" && type !== "chat" && lang !== "pt";
  const active = valid && (type === "notification" || (type === "chat" ? translate : onPageButton && enabled));

  useEffect(() => {
    if (!onPageButton) return;
    return register();
  }, [onPageButton, register]);

  useEffect(() => {
    if (!active || !id) return;
    const unsubscribe = subscribeTranslations(rerender);
    requestTranslation({ type, id, field }, lang);
    return unsubscribe;
  }, [active, type, id, field, lang]);

  const translated = active && id ? getCachedTranslation({ type, id, field }, lang) : null;
  // Se o texto já estava no idioma escolhido, a "tradução" é igual ao original.
  const isTranslated = !!translated && translated.trim() !== original.trim();
  return { text: isTranslated ? translated : original, isTranslated };
};

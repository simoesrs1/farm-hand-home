/**
 * Tradução automática do conteúdo escrito por pessoas (Edge Function translate-content).
 *
 * Os pedidos de uma página juntam-se num só (por idioma, até 50 textos) e as
 * respostas ficam em memória durante a visita. O site só envia referências
 * { type, id, field }; o servidor vai buscar o texto e guarda as traduções.
 * Ver docs/traducoes.md.
 */
import { supabase } from "@/integrations/supabase/client";

export type ContentType = "product" | "experience" | "stay" | "farm" | "review" | "notification" | "chat" | "order_item";

export interface ContentRef {
  type: ContentType;
  id: string;
  field: string;
}

/**
 * Gerados pela plataforma em português: em português não há nada a traduzir. O
 * resto (escrito por agricultores e clientes) pode estar noutra língua; se já
 * estiver em português, a tradução devolve o mesmo texto e fica em cache.
 */
const PORTUGUESE_SOURCES = new Set<ContentType>(["notification"]);

const UUID = /^[0-9a-f-]{36}$/i;
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 40;

export const needsTranslation = (ref: Pick<ContentRef, "type" | "id">, lang: string) =>
  UUID.test(ref.id) && !(lang === "pt" && PORTUGUESE_SOURCES.has(ref.type));

const refKey = (ref: ContentRef) => `${ref.type}:${ref.id}:${ref.field}`;
const cacheKey = (ref: ContentRef, lang: string) => `${lang}|${refKey(ref)}`;

// Tradução, ou null quando não há (sem chave de IA, recusa, texto não visível).
const cache = new Map<string, string | null>();
const queued = new Map<string, Map<string, ContentRef>>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

export const getCachedTranslation = (ref: ContentRef, lang: string) => cache.get(cacheKey(ref, lang));

export const subscribeTranslations = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const flush = async () => {
  timer = null;
  const batches = [...queued.entries()];
  queued.clear();
  for (const [lang, refs] of batches) {
    const list = [...refs.values()];
    for (let start = 0; start < list.length; start += BATCH_SIZE) {
      const chunk = list.slice(start, start + BATCH_SIZE);
      const { data } = await supabase.functions.invoke<{ translations?: Record<string, string> }>(
        "translate-content",
        { body: { lang, items: chunk } },
      );
      for (const ref of chunk) cache.set(cacheKey(ref, lang), data?.translations?.[refKey(ref)] ?? null);
      listeners.forEach((l) => l());
    }
  }
};

/** Pede a tradução (uma vez por texto e idioma durante a visita). */
export const requestTranslation = (ref: ContentRef, lang: string) => {
  if (!needsTranslation(ref, lang)) return;
  const key = cacheKey(ref, lang);
  if (cache.has(key)) return;
  const forLang = queued.get(lang) ?? new Map<string, ContentRef>();
  if (forLang.has(refKey(ref))) return;
  forLang.set(refKey(ref), ref);
  queued.set(lang, forLang);
  if (!timer) timer = setTimeout(flush, BATCH_DELAY_MS);
};

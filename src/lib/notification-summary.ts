/**
 * Texto do balão que aparece quando chegam notificações em tempo real.
 * Uma notificação: o seu título e mensagem. Várias: o número e os títulos
 * (já são resumos curtos) como palavras-chave.
 */
import i18n from "@/i18n";
export interface NotificationLike {
  title: string;
  message: string;
}

export const MAX_KEYWORDS = 3;

export const summarizeNotifications = (
  list: NotificationLike[],
): { title: string; description: string } | null => {
  if (list.length === 0) return null;
  if (list.length === 1) return { title: list[0].title, description: list[0].message };

  const keywords = [...new Set(list.map((n) => n.title.trim()).filter(Boolean))];
  const shown = keywords.slice(0, MAX_KEYWORDS).join(" · ");
  const extra = keywords.length - MAX_KEYWORDS;
  return {
    title: i18n.t("common:notifications.many", { count: list.length }),
    description: extra > 0 ? i18n.t("common:notifications.andMore", { shown, count: extra }) : shown,
  };
};

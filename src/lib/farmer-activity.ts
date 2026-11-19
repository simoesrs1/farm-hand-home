/**
 * Atividade dos agricultores — partilhado entre catálogo, destaques e painel.
 * A pontuação é calculada diariamente na base de dados
 * (compute_farmer_activity, migração 20261003150000); aqui só se interpreta.
 */
import i18n from "@/i18n";
import { formatDate } from "@/lib/format";

export type ActivityLevel = "semente" | "rebento" | "colheita" | "pomar";

const level = (id: ActivityLevel, min: number) => ({
  id,
  min,
  /** Nome do nível no idioma atual. */
  get label() {
    return i18n.t(`common:activity.levels.${id}`);
  },
});

export const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; min: number }[] = [
  level("semente", 0),
  level("rebento", 40),
  level("colheita", 70),
  level("pomar", 90),
];

export const levelFor = (score: number): ActivityLevel => {
  let level: ActivityLevel = "semente";
  for (const l of ACTIVITY_LEVELS) if (score >= l.min) level = l.id;
  return level;
};

export const levelLabel = (level: string) =>
  (ACTIVITY_LEVELS.find((l) => l.id === level) ?? ACTIVITY_LEVELS[0]).label;

/** Próximo nível e pontos que faltam; null no nível máximo. */
export const nextLevel = (score: number) => {
  const next = ACTIVITY_LEVELS.find((l) => l.min > score);
  return next ? { ...next, missing: next.min - score } : null;
};

/**
 * Critério de "Relevância": atividade (0–100) + certificados (initial_score,
 * 0–50). Divulgado nos Termos (secção "Ordenação e destaque").
 */
export const farmerRank = (activityScore?: number | null, initialScore?: number | null) =>
  (activityScore ?? 0) + (initialScore ?? 0);

/** Data de hoje (AAAA-MM-DD) em Portugal, como `today_lisbon()` na BD. */
export const todayLisbon = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());

/** `paused_until` é a data de regresso: em pausa enquanto hoje < essa data. */
export const isPaused = (pausedUntil?: string | null) =>
  !!pausedUntil && pausedUntil > todayLisbon();

export const formatReturnDate = (date: string) =>
  formatDate(`${date}T12:00:00`, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export interface ActivityComponents {
  catalog?: {
    score?: number | null;
    days_since_update?: number | null;
    active_products?: number;
    in_stock_products?: number;
    sellable_products?: number;
    edits_30d?: number;
  };
  orders?: {
    score?: number | null;
    total?: number;
    refunded?: number;
    pending?: number;
    median_hours?: number | null;
  };
  chat?: {
    score?: number | null;
    client_messages?: number;
    answered?: number;
  };
}

export interface SuggestedAction {
  text: string;
  to: string;
}

/** Até 3 ações concretas, por ordem de impacto na pontuação. */
export const suggestedActions = (c: ActivityComponents): SuggestedAction[] => {
  const out: SuggestedAction[] = [];
  const catalog = c.catalog ?? {};
  const orders = c.orders ?? {};
  const chat = c.chat ?? {};

  if (orders.pending && orders.pending > 0) {
    out.push({
      text: i18n.t("common:activity.actions.pending", { count: orders.pending }),
      to: "/agricultor/encomendas",
    });
  }
  if (!catalog.active_products) {
    out.push({ text: i18n.t("common:activity.actions.firstProduct"), to: "/agricultor/produtos/novo" });
  } else {
    if ((catalog.days_since_update ?? 0) >= 7) {
      out.push({
        text: i18n.t("common:activity.actions.stale", { count: catalog.days_since_update ?? 0 }),
        to: "/agricultor/produtos",
      });
    }
    const outOfStock = (catalog.active_products ?? 0) - (catalog.in_stock_products ?? 0);
    if (outOfStock > 0) {
      out.push({
        text: i18n.t("common:activity.actions.outOfStock", { count: outOfStock }),
        to: "/agricultor/produtos",
      });
    }
  }
  const unanswered = (chat.client_messages ?? 0) - (chat.answered ?? 0);
  if (unanswered > 0) {
    out.push({
      text: i18n.t("common:activity.actions.unanswered", { count: unanswered }),
      to: "/agricultor/encomendas",
    });
  }
  return out.slice(0, 3);
};

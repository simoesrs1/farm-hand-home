/**
 * Atividade dos agricultores — partilhado entre catálogo, destaques e painel.
 * A pontuação é calculada diariamente na base de dados
 * (compute_farmer_activity, migração 20261003150000); aqui só se interpreta.
 */

export type ActivityLevel = "semente" | "rebento" | "colheita" | "pomar";

export const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; min: number }[] = [
  { id: "semente", label: "Semente", min: 0 },
  { id: "rebento", label: "Rebento", min: 40 },
  { id: "colheita", label: "Colheita", min: 70 },
  { id: "pomar", label: "Pomar", min: 90 },
];

export const levelFor = (score: number): ActivityLevel => {
  let level: ActivityLevel = "semente";
  for (const l of ACTIVITY_LEVELS) if (score >= l.min) level = l.id;
  return level;
};

export const levelLabel = (level: string) =>
  ACTIVITY_LEVELS.find((l) => l.id === level)?.label ?? "Semente";

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
  new Date(`${date}T12:00:00`).toLocaleDateString("pt-PT", {
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
      text: `Aceite ${orders.pending === 1 ? "a encomenda pendente" : `as ${orders.pending} encomendas pendentes`} — a rapidez de resposta pesa na pontuação.`,
      to: "/agricultor/encomendas",
    });
  }
  if (!catalog.active_products) {
    out.push({ text: "Adicione o seu primeiro produto para aparecer no catálogo.", to: "/agricultor/produtos/novo" });
  } else {
    if ((catalog.days_since_update ?? 0) >= 7) {
      out.push({
        text: `O catálogo não é atualizado há ${catalog.days_since_update} dias. Confirme o stock para subir no catálogo.`,
        to: "/agricultor/produtos",
      });
    }
    const outOfStock = (catalog.active_products ?? 0) - (catalog.in_stock_products ?? 0);
    if (outOfStock > 0) {
      out.push({
        text: `${outOfStock} ${outOfStock === 1 ? "produto está" : "produtos estão"} sem stock. Reponha ou desative-os.`,
        to: "/agricultor/produtos",
      });
    }
  }
  const unanswered = (chat.client_messages ?? 0) - (chat.answered ?? 0);
  if (unanswered > 0) {
    out.push({
      text: `${unanswered} ${unanswered === 1 ? "mensagem de cliente ficou" : "mensagens de clientes ficaram"} sem resposta em 24 h.`,
      to: "/agricultor/encomendas",
    });
  }
  return out.slice(0, 3);
};

/**
 * Coins dos clientes: 1 coin por cada euro gasto, mais bónus. As coins não têm
 * valor em dinheiro e só se trocam por brindes dos agricultores.
 *
 * As regras vivem na tabela coin_rules
 * (supabase/migrations/20261125120000_coins_clientes.sql). Estes valores são
 * uma cópia para os textos da interface; src/test/coins.test.ts falha se as
 * duas fontes deixarem de coincidir. Ver docs/coins-clientes.md.
 */
export const COIN_RULES = {
  /** Coins por cada euro gasto (sem a taxa de entrega). */
  per_euro: 1,
  /** Bónus por cada entrega de subscrição. */
  subscription_bonus: 5,
  /** Bónus por experiência ou estadia concluída. */
  booking_bonus: 25,
  /** Coins por avaliação de uma encomenda entregue, seja qual for a nota. */
  review: 20,
  /** Dias até as coins ficarem disponíveis. */
  pending_days: 14,
  /** Meses de validade depois de ficarem disponíveis. */
  validity_months: 6,
  /** Dias de antecedência do aviso de expiração. */
  expiry_warning_days: 14,
} as const;

/** Valor indicativo em brindes: 100 coins ≈ 1 €. Só para comparar brindes. */
export const COINS_PER_EURO_HINT = 100;

export type CoinOrderKind = "product" | "experience" | "stay" | "subscription";

/** Coins de uma encomenda entregue (igual a award_order_coins no SQL). */
export function coinsForOrder(total: number, deliveryFee: number, kind: CoinOrderKind): number {
  const spent = Math.floor(Math.max(0, total - deliveryFee));
  const bonus =
    kind === "subscription"
      ? COIN_RULES.subscription_bonus
      : kind === "experience" || kind === "stay"
        ? COIN_RULES.booking_bonus
        : 0;
  return spent * COIN_RULES.per_euro + bonus;
}

/** Valor indicativo em euros (em brindes) de um número de coins. */
export function coinsToEuroHint(coins: number): number {
  return Math.max(0, coins) / COINS_PER_EURO_HINT;
}

export type CoinMovementKind = "earn" | "expire" | "reverse" | "redeem" | "return";

export interface CoinsSummary {
  available: number;
  pending: number;
  pending_lots: { coins: number; available_at: string }[];
  expiring_lots: { coins: number; expires_at: string }[];
  movements: { kind: CoinMovementKind; coins: number; source_type: string | null; created_at: string }[];
}

/** Lê a resposta de my_coins_summary, tolerando campos em falta. */
export function parseCoinsSummary(data: unknown): CoinsSummary {
  const d = (data ?? {}) as Partial<CoinsSummary>;
  return {
    available: Number(d.available ?? 0),
    pending: Number(d.pending ?? 0),
    pending_lots: Array.isArray(d.pending_lots) ? d.pending_lots : [],
    expiring_lots: Array.isArray(d.expiring_lots) ? d.expiring_lots : [],
    movements: Array.isArray(d.movements) ? d.movements : [],
  };
}

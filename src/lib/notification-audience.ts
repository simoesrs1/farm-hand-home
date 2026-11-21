/**
 * Notificações por perfil: cada notificação é para o perfil de cliente ou de
 * agricultor (notifications.audience, preenchida na base de dados — ver
 * supabase/migrations/20261121160000_notificacoes_por_perfil.sql). O sino
 * mostra só as do perfil ativo e assinala as do outro.
 */
export type Audience = "client" | "farmer";

export type ProfileMode = "cliente" | "vendedor";

export const modeAudience = (mode: ProfileMode): Audience => (mode === "vendedor" ? "farmer" : "client");

export const audienceMode = (audience: Audience): ProfileMode => (audience === "farmer" ? "vendedor" : "cliente");

export const otherAudience = (audience: Audience): Audience => (audience === "farmer" ? "client" : "farmer");

export const isAudience = (v: unknown): v is Audience => v === "client" || v === "farmer";

const STOCK_TYPES = new Set(["low_stock", "out_of_stock", "stock_expired"]);

/** Página a abrir ao carregar numa notificação (pelo perfil da notificação, não pelo ativo). */
export const notificationRoute = (n: {
  type: string;
  link: string | null;
  order_id: string | null;
  audience: Audience;
}): string | null => {
  if (STOCK_TYPES.has(n.type)) return "/agricultor/produtos";
  if (n.link) return n.link;
  if (n.order_id) {
    const base = n.audience === "farmer" ? "/agricultor/encomendas" : "/encomendas";
    return `${base}?id=${n.order_id}`;
  }
  return null;
};

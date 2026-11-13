/**
 * Quem pode avaliar um agricultor, e quando uma entrega conta como atrasada.
 *
 * A mesma regra está na função SQL order_review_context, que é a que conta;
 * esta versão serve para a interface mostrar os botões certos.
 */
export type ReviewContext = "delivered" | "cancelled" | "late";

export interface ReviewableOrder {
  status: string;
  delivery_address: string | null;
  expected_delivery_at: string | null;
  pickup_deadline: string;
  /** Reservas: quem cancelou ('client' não pode avaliar como "cancelada"). */
  cancelled_by?: string | null;
}

const LATE_GRACE_MS = 24 * 60 * 60 * 1000;

/** Etiqueta pública da avaliação; quem recebeu a encomenda não tem etiqueta. */
export const REVIEW_CONTEXT_LABELS: Record<ReviewContext, string | null> = {
  delivered: null,
  cancelled: "Encomenda cancelada",
  late: "Entrega atrasada",
};

/** Entrega ao domicílio por entregar, 24 h depois da data prevista. */
export const isDeliveryLate = (o: ReviewableOrder, now = Date.now()) =>
  (o.status === "awaiting_pickup" || o.status === "expired") &&
  o.delivery_address != null &&
  now > new Date(o.expected_delivery_at ?? o.pickup_deadline).getTime() + LATE_GRACE_MS;

export const reviewContext = (o: ReviewableOrder, now = Date.now()): ReviewContext | null => {
  if (o.status === "delivered") return "delivered";
  if (o.status === "refunded") return o.cancelled_by === "client" ? null : "cancelled";
  return isDeliveryLate(o, now) ? "late" : null;
};

/** Só as encomendas ainda por entregar aceitam uma queixa. */
export const canFileDeliveryComplaint = (o: ReviewableOrder, now = Date.now()) =>
  o.status === "awaiting_pickup" && isDeliveryLate(o, now);

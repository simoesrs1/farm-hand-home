/**
 * Preço da entrega ao domicílio de uma encomenda.
 *
 * Cada encomenda é de um só agricultor e paga uma só entrega: o preço mais
 * alto entre os produtos com entrega ao domicílio. Fica grátis quando o valor
 * dos produtos atinge o limite definido pelo agricultor.
 *
 * A mesma regra está repetida em supabase/functions/create-order (Deno), que é
 * quem calcula o valor cobrado; esta versão serve para o carrinho mostrar.
 */
export interface DeliveryFeeProduct {
  local_delivery: boolean;
  delivery_fee: number | null;
}

export interface DeliveryFeeResult {
  /** Valor a cobrar (0 se grátis ou sem entrega ao domicílio). */
  fee: number;
  /** Preço da entrega antes de aplicar o limite de entrega grátis. */
  baseFee: number;
  /** A entrega ficou grátis por o carrinho atingir o limite. */
  freeByThreshold: boolean;
  /** Quanto falta para a entrega ficar grátis (null se não se aplica). */
  remainingForFree: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const computeDeliveryFee = (
  products: DeliveryFeeProduct[],
  productsTotal: number,
  freeThreshold: number | null,
): DeliveryFeeResult => {
  const fees = products
    .filter((p) => p.local_delivery)
    .map((p) => Math.max(0, Number(p.delivery_fee ?? 0)));
  const baseFee = fees.length > 0 ? round2(Math.max(...fees)) : 0;
  if (baseFee === 0) {
    return { fee: 0, baseFee: 0, freeByThreshold: false, remainingForFree: null };
  }
  const threshold = freeThreshold != null && freeThreshold > 0 ? freeThreshold : null;
  if (threshold != null && productsTotal >= threshold) {
    return { fee: 0, baseFee, freeByThreshold: true, remainingForFree: null };
  }
  return {
    fee: baseFee,
    baseFee,
    freeByThreshold: false,
    remainingForFree: threshold != null ? round2(threshold - productsTotal) : null,
  };
};

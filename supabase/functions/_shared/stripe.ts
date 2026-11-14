// Cliente Stripe partilhado pelas edge functions de pagamentos.
// A chave secreta vem de `npx supabase secrets set STRIPE_SECRET_KEY=...`,
// nunca do front-end. Ver docs/pagamentos-stripe-connect.md.
import Stripe from "npm:stripe@17.7.0";

export function getStripe(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY não está configurada");
  return new Stripe(key, {
    // O Deno não tem o módulo http do Node: usa fetch.
    httpClient: Stripe.createFetchHttpClient(),
  });
}

// As contas ligadas novas têm de ser criadas pela API Accounts v2: o Stripe
// recusa POST /v1/accounts em integrações Connect novas. Esta versão da
// biblioteca só fala v1, por isso os pedidos v2 vão por fetch. As restantes
// chamadas v1 (consultar a conta, link do painel, transferências) continuam a
// funcionar com contas v2.
const STRIPE_V2_VERSION = "2026-10-28.endive";

/** Pedido POST à API v2 do Stripe (JSON). Lança um erro com a mensagem do Stripe. */
export async function stripeV2Post<T>(
  path: string,
  body: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY não está configurada");
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": STRIPE_V2_VERSION,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Stripe ${path} ${res.status}: ${data?.error?.message ?? "sem detalhe"}`);
  }
  return data as T;
}

/** Estado de uma conta ligada, tal como é guardado em farmer_payment_accounts. */
export function accountStatus(account: Stripe.Account) {
  return {
    charges_enabled: account.charges_enabled ?? false,
    payouts_enabled: account.payouts_enabled ?? false,
    details_submitted: account.details_submitted ?? false,
  };
}

export type { Stripe };

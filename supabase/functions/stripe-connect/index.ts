// Conta Stripe Connect (Express) do agricultor autenticado.
//   onboard   → cria a conta (Accounts v2), se ainda não existir, e devolve o link do formulário do Stripe;
//   dashboard → devolve o link para o painel Express do agricultor;
//   refresh   → lê o estado da conta no Stripe e atualiza farmer_payment_accounts.
// Na fase 2 o webhook (account.updated) passa a manter o estado atualizado.
// Ver docs/pagamentos-stripe-connect.md.
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import { accountStatus, getStripe, stripeV2Post } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Endereço para onde o Stripe devolve o agricultor. Só aceita a origem do site
 * (APP_URL) ou um servidor local de desenvolvimento, para o link não poder
 * reencaminhar para outro domínio.
 */
function returnOrigin(req: Request): string | null {
  const appUrl = Deno.env.get("APP_URL");
  const allowed = new Set<string>();
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).origin);
    } catch {
      // APP_URL mal configurada: só ficam as origens locais.
    }
  }
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      if (allowed.has(url.origin) || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
        return url.origin;
      }
    } catch {
      // Origem inválida: cai no APP_URL.
    }
  }
  return allowed.values().next().value ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Não autenticado" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Sessão inválida" });
    const user = userData.user;

    const body = await req.json().catch(() => null);
    const action = body?.action;
    if (action !== "onboard" && action !== "dashboard" && action !== "refresh") {
      return json(400, { error: "Ação inválida" });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: farmer } = await admin
      .from("farmer_details")
      .select("id, company_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!farmer) return json(403, { error: "Esta área é exclusiva para agricultores." });

    const { data: existing, error: existingErr } = await admin
      .from("farmer_payment_accounts")
      .select("stripe_account_id, charges_enabled, payouts_enabled, details_submitted")
      .eq("farmer_id", farmer.id)
      .maybeSingle();
    if (existingErr) throw existingErr;

    const stripe = getStripe();

    if (action === "refresh") {
      if (!existing) return json(200, { account: null });
      const account = await stripe.accounts.retrieve(existing.stripe_account_id);
      const status = accountStatus(account);
      const { error } = await admin
        .from("farmer_payment_accounts")
        .update(status)
        .eq("farmer_id", farmer.id);
      if (error) throw error;
      return json(200, { account: status });
    }

    if (action === "dashboard") {
      if (!existing?.details_submitted) {
        return json(400, { error: "Termine primeiro a configuração dos pagamentos." });
      }
      const link = await stripe.accounts.createLoginLink(existing.stripe_account_id);
      return json(200, { url: link.url });
    }

    // onboard
    const origin = returnOrigin(req);
    if (!origin) return json(500, { error: "Endereço do site não configurado (APP_URL)." });

    let accountId = existing?.stripe_account_id;
    if (!accountId) {
      // Accounts v2 (ver _shared/stripe.ts). A plataforma cobra e transfere
      // depois (separate charges and transfers): a conta precisa de
      // "stripe_transfers". "card_payments" deixa em aberto cobrar em nome do
      // agricultor (on_behalf_of), a decidir na fase 2. Com o painel Express,
      // comissões e perdas ficam obrigatoriamente com a plataforma.
      const account = await stripeV2Post<{ id: string }>(
        "/v2/core/accounts",
        {
          display_name: farmer.company_name || user.email || "Agricultor ValorRural",
          contact_email: user.email ?? undefined,
          identity: { country: "PT" },
          dashboard: "express",
          defaults: {
            responsibilities: { fees_collector: "application", losses_collector: "application" },
          },
          configuration: {
            merchant: { capabilities: { card_payments: { requested: true } } },
            recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
          },
          metadata: { farmer_id: farmer.id },
        },
        // Dois cliques seguidos não criam duas contas.
        `farmer-account-v2-${farmer.id}`,
      );
      accountId = account.id;
      const { error } = await admin.from("farmer_payment_accounts").insert({
        farmer_id: farmer.id,
        stripe_account_id: accountId,
      });
      // Pedido em paralelo que já gravou a mesma conta: não é erro.
      if (error && error.code !== "23505") throw error;
    }

    // O link é de uso único e expira em poucos minutos: refresh_url volta ao
    // site, que pede um novo.
    const link = await stripeV2Post<{ url: string }>("/v2/core/account_links", {
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          refresh_url: `${origin}/agricultor/vendas?stripe=refresh`,
          return_url: `${origin}/agricultor/vendas?stripe=return`,
        },
      },
    });
    return json(200, { url: link.url });
  } catch (e) {
    console.error("stripe-connect error", e);
    return json(500, { error: "Não foi possível falar com o serviço de pagamentos. Tente novamente." });
  }
});

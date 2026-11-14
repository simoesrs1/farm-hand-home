-- Pagamentos: conta Stripe Connect (Express) de cada agricultor.
--
-- Tabela própria, e não colunas em farmer_details, porque o agricultor pode
-- alterar a sua linha de farmer_details e não pode marcar-se a si próprio como
-- "pagamentos ativos". Aqui só a edge function stripe-connect (service_role)
-- escreve; o agricultor apenas lê a sua linha.
-- Ver docs/pagamentos-stripe-connect.md.

CREATE TABLE IF NOT EXISTS public.farmer_payment_accounts (
  farmer_id uuid PRIMARY KEY REFERENCES public.farmer_details(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  -- Espelho do estado da conta no Stripe, atualizado pela edge function.
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.farmer_payment_accounts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.farmer_payment_accounts FROM anon, authenticated;
GRANT SELECT ON public.farmer_payment_accounts TO authenticated;
GRANT ALL ON public.farmer_payment_accounts TO service_role;

DROP POLICY IF EXISTS "Farmer can view own payment account" ON public.farmer_payment_accounts;
CREATE POLICY "Farmer can view own payment account"
  ON public.farmer_payment_accounts FOR SELECT TO authenticated
  USING (public.user_owns_farmer(farmer_id));
-- Sem políticas de escrita: só o service_role escreve.

DROP TRIGGER IF EXISTS update_farmer_payment_accounts_updated_at ON public.farmer_payment_accounts;
CREATE TRIGGER update_farmer_payment_accounts_updated_at
BEFORE UPDATE ON public.farmer_payment_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

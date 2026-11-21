-- Eliminar conta (cliente e agricultor).
--
-- As encomendas, reservas e faturação têm de ser conservadas 10 anos (lei
-- fiscal) e estão ligadas ao utilizador (orders.client_id … ON DELETE RESTRICT).
-- Por isso a conta não é apagada: é anonimizada e bloqueada. A Edge Function
-- delete-account troca o email da conta antiga por um endereço interno e
-- bloqueia-a, para o mesmo email poder criar uma conta nova do zero.
-- Ver docs/eliminar-conta.md.

-- 1) Arquivo interno (conservação legal): só a equipa (service_role).
CREATE TABLE IF NOT EXISTS public.deleted_accounts (
  user_id uuid PRIMARY KEY,
  email text,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  company_name text,
  company_nif text,
  exploration_number text,
  cae_code text
);

ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deleted_accounts FROM anon, authenticated;
GRANT ALL ON public.deleted_accounts TO service_role;

-- 2) O que impede eliminar a conta: encomendas e reservas por concluir (como
--    cliente ou agricultor) e clientes com subscrição ativa na quinta. As
--    subscrições do próprio como cliente são canceladas ao eliminar; as
--    entregas delas a mais de 48 horas são devolvidas e não contam.
CREATE OR REPLACE FUNCTION public.account_deletion_blockers(p_user uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'client_orders', (
      SELECT count(*) FROM public.orders o
       WHERE o.client_id = p_user
         AND o.status IN ('pending_payment', 'awaiting_pickup')
         AND NOT (o.kind = 'subscription' AND o.expected_delivery_at > now() + interval '48 hours')
    ),
    'farmer_orders', (
      SELECT count(*) FROM public.orders o
        JOIN public.farmer_details fd ON fd.id = o.farmer_id
       WHERE fd.user_id = p_user AND o.status IN ('pending_payment', 'awaiting_pickup')
    ),
    'farmer_subscriptions', (
      SELECT count(*) FROM public.subscriptions s
        JOIN public.farmer_details fd ON fd.id = s.farmer_id
       WHERE fd.user_id = p_user AND s.status = 'active'
    )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.account_deletion_blockers(uuid) FROM PUBLIC, anon, authenticated;

-- Para o ecrã de Definições: só as do próprio.
CREATE OR REPLACE FUNCTION public.my_account_deletion_blockers()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.account_deletion_blockers(auth.uid())
$$;

REVOKE EXECUTE ON FUNCTION public.my_account_deletion_blockers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_account_deletion_blockers() TO authenticated;

-- 3) Anonimizar (só a Edge Function delete-account, com a service_role).
--    Idempotente: pode voltar a correr se um passo seguinte falhar.
CREATE OR REPLACE FUNCTION public.anonymize_account(p_user uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_blockers jsonb := public.account_deletion_blockers(p_user);
  v_farmer public.farmer_details%ROWTYPE;
  v_sub record;
  v_farmer_user uuid;
BEGIN
  IF (v_blockers->>'client_orders')::int > 0
     OR (v_blockers->>'farmer_orders')::int > 0
     OR (v_blockers->>'farmer_subscriptions')::int > 0 THEN
    RAISE EXCEPTION 'Ainda tem encomendas, reservas ou subscrições por concluir.';
  END IF;

  -- Subscrições do próprio como cliente: canceladas, entregas futuras devolvidas.
  FOR v_sub IN SELECT * FROM public.subscriptions WHERE client_id = p_user AND status = 'active' LOOP
    UPDATE public.subscriptions SET status = 'cancelled', cancelled_by = 'client', cancelled_at = now()
     WHERE id = v_sub.id;
    UPDATE public.orders
       SET status = 'refunded', expired_at = now(), cancelled_by = 'client',
           refund_amount = total, farmer_amount = 0, commission_amount = 0
     WHERE subscription_id = v_sub.id AND status = 'awaiting_pickup';
    SELECT user_id INTO v_farmer_user FROM public.farmer_details WHERE id = v_sub.farmer_id;
    IF v_farmer_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (v_farmer_user, 'subscription_cancelled', 'Subscrição cancelada',
              'Um cliente eliminou a conta e a subscrição "' || v_sub.title || '" foi cancelada.',
              '/agricultor/subscricoes');
    END IF;
  END LOOP;

  -- Agricultor: arquivo dos dados oficiais, quinta oculta e ofertas inativas.
  SELECT * INTO v_farmer FROM public.farmer_details WHERE user_id = p_user;
  INSERT INTO public.deleted_accounts (user_id, email, company_name, company_nif, exploration_number, cae_code)
  VALUES (p_user, p_email, v_farmer.company_name, v_farmer.company_nif, v_farmer.exploration_number, v_farmer.cae_code)
  ON CONFLICT (user_id) DO NOTHING;

  IF v_farmer.id IS NOT NULL THEN
    UPDATE public.products SET active = false WHERE farmer_id = v_farmer.id;
    UPDATE public.farm_experiences SET active = false WHERE farmer_id = v_farmer.id;
    UPDATE public.farm_stays SET active = false WHERE farmer_id = v_farmer.id;
    UPDATE public.subscription_plans SET active = false WHERE farmer_id = v_farmer.id;
    -- O nome da empresa fica (aparece no histórico das encomendas); o resto sai
    -- para o NIF e o nº de exploração poderem ser registados de novo.
    UPDATE public.farmer_details SET
      company_nif = NULL, exploration_number = NULL, exploration_id = NULL, cae_code = NULL,
      phone = NULL, address = NULL, website = NULL, description = NULL,
      verification_status = 'pending_review'
     WHERE id = v_farmer.id;
  END IF;

  -- Dados pessoais.
  UPDATE public.profiles SET full_name = '', avatar_url = NULL WHERE id = p_user;
  DELETE FROM public.favorites WHERE user_id = p_user;
  DELETE FROM public.notifications WHERE user_id = p_user;
  -- Avaliações escritas: ficam, anónimas.
  UPDATE public.farmer_reviews
     SET reviewer_name = 'Cliente', show_photo = false, reviewer_photo_path = NULL
   WHERE client_id = p_user;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anonymize_account(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_account(uuid, text) TO service_role;

-- 4) Ligações de início de sessão (email, Google) da conta antiga: sem elas,
--    o mesmo email ou a mesma conta Google criam uma conta nova.
CREATE OR REPLACE FUNCTION public.delete_auth_identities(p_user uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM auth.identities WHERE user_id = p_user
$$;

REVOKE EXECUTE ON FUNCTION public.delete_auth_identities(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_auth_identities(uuid) TO service_role;

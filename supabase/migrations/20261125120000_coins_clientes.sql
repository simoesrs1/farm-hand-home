-- Coins dos clientes (fidelização sem parte financeira).
--
-- O cliente ganha 1 coin por cada euro gasto (encomendas entregues, sem a taxa
-- de entrega), mais bónus em subscrições, experiências, estadias e avaliações.
-- As coins não têm valor em dinheiro, não se trocam por euros e não reduzem
-- preços: só se trocam por brindes que cada agricultor decide oferecer (fase 4,
-- noutra migração). Ver docs/coins-clientes.md e
-- docs/planos/2026-11-25-coins-clientes.md.
--
-- Registo:
--   coin_lots       um lote por cada atribuição, com o que sobra (remaining),
--                   o estado e as datas (disponível 14 dias depois, expira 6
--                   meses depois de ficar disponível);
--   coin_movements  só se acrescentam linhas: o histórico que o cliente vê.
-- Saldo = soma de remaining dos lotes 'available'.
-- O browser só lê os próprios; toda a escrita passa por funções desta migração.

-- 1) Regras (uma só fonte; espelhadas em src/lib/coins.ts, com teste).
CREATE TABLE IF NOT EXISTS public.coin_rules (
  key text PRIMARY KEY,
  value integer NOT NULL CHECK (value >= 0)
);

INSERT INTO public.coin_rules (key, value) VALUES
  ('per_euro', 1),
  ('subscription_bonus', 5),
  ('booking_bonus', 25),
  ('review', 20),
  ('pending_days', 14),
  ('validity_months', 6),
  ('expiry_warning_days', 14)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

ALTER TABLE public.coin_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coin_rules FROM anon, authenticated;
GRANT SELECT ON public.coin_rules TO anon, authenticated;
DROP POLICY IF EXISTS "Regras das coins são públicas" ON public.coin_rules;
CREATE POLICY "Regras das coins são públicas" ON public.coin_rules FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.coin_rule(p_key text)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT coalesce((SELECT value FROM public.coin_rules WHERE key = p_key), 0)
$$;

-- 2) Lotes e movimentos.
CREATE TABLE IF NOT EXISTS public.coin_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('order', 'review', 'referral', 'referral_welcome', 'adjustment')),
  source_id uuid NOT NULL,
  coins integer NOT NULL CHECK (coins > 0),
  remaining integer NOT NULL CHECK (remaining >= 0 AND remaining <= coins),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'expired', 'reversed')),
  available_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  expiry_warned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_coin_lots_user_status ON public.coin_lots (user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_coin_lots_status_dates ON public.coin_lots (status, available_at, expires_at);

CREATE TABLE IF NOT EXISTS public.coin_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lot_id uuid REFERENCES public.coin_lots(id) ON DELETE SET NULL,
  -- earn: ganhas (pendentes); expire: expiraram; reverse: retiradas
  -- (ex.: avaliação removida); redeem / return: brindes (fase 4).
  kind text NOT NULL CHECK (kind IN ('earn', 'expire', 'reverse', 'redeem', 'return')),
  coins integer NOT NULL,
  source_type text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coin_movements_user_created ON public.coin_movements (user_id, created_at DESC);

ALTER TABLE public.coin_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coin_lots FROM anon, authenticated;
REVOKE ALL ON public.coin_movements FROM anon, authenticated;
GRANT SELECT ON public.coin_lots TO authenticated;
GRANT SELECT ON public.coin_movements TO authenticated;
GRANT ALL ON public.coin_lots, public.coin_movements TO service_role;

DROP POLICY IF EXISTS "Cliente vê os próprios lotes de coins" ON public.coin_lots;
CREATE POLICY "Cliente vê os próprios lotes de coins" ON public.coin_lots
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Cliente vê os próprios movimentos de coins" ON public.coin_movements;
CREATE POLICY "Cliente vê os próprios movimentos de coins" ON public.coin_movements
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 3) Atribuir e retirar (só dentro desta migração e dos gatilhos).
--    Idempotente: a mesma origem só dá coins uma vez (UNIQUE).
CREATE OR REPLACE FUNCTION public.grant_coins(
  p_user uuid,
  p_source_type text,
  p_source_id uuid,
  p_coins integer,
  p_from timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available timestamptz := p_from + make_interval(days => public.coin_rule('pending_days'));
  v_lot uuid;
BEGIN
  IF p_user IS NULL OR coalesce(p_coins, 0) <= 0 THEN RETURN; END IF;
  -- Conta eliminada: não ganha coins.
  IF EXISTS (SELECT 1 FROM public.deleted_accounts WHERE user_id = p_user) THEN RETURN; END IF;

  INSERT INTO public.coin_lots (user_id, source_type, source_id, coins, remaining, status, available_at, expires_at)
  VALUES (p_user, p_source_type, p_source_id, p_coins, p_coins, 'pending', v_available,
          v_available + make_interval(months => public.coin_rule('validity_months')))
  ON CONFLICT (user_id, source_type, source_id) DO NOTHING
  RETURNING id INTO v_lot;

  IF v_lot IS NOT NULL THEN
    INSERT INTO public.coin_movements (user_id, lot_id, kind, coins, source_type, source_id)
    VALUES (p_user, v_lot, 'earn', p_coins, p_source_type, p_source_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_coins(p_user uuid, p_source_type text, p_source_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lot public.coin_lots%ROWTYPE;
BEGIN
  SELECT * INTO v_lot FROM public.coin_lots
   WHERE user_id = p_user AND source_type = p_source_type AND source_id = p_source_id
     AND status IN ('pending', 'available')
   FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_lot.remaining > 0 THEN
    INSERT INTO public.coin_movements (user_id, lot_id, kind, coins, source_type, source_id)
    VALUES (p_user, v_lot.id, 'reverse', -v_lot.remaining, p_source_type, p_source_id);
  END IF;
  UPDATE public.coin_lots SET status = 'reversed', remaining = 0 WHERE id = v_lot.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_coins(uuid, text, uuid, integer, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reverse_coins(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

-- 4) Encomenda entregue: 1 coin por euro gasto (sem a taxa de entrega), mais
--    o bónus de subscrição ou de experiência/estadia. O único caminho para
--    'delivered' é a Edge Function validate-pickup.
CREATE OR REPLACE FUNCTION public.award_order_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_coins integer;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    v_coins := floor(greatest(coalesce(NEW.total, 0) - coalesce(NEW.delivery_fee, 0), 0))::int
               * public.coin_rule('per_euro')
             + CASE NEW.kind
                 WHEN 'subscription' THEN public.coin_rule('subscription_bonus')
                 WHEN 'experience' THEN public.coin_rule('booking_bonus')
                 WHEN 'stay' THEN public.coin_rule('booking_bonus')
                 ELSE 0
               END;
    PERFORM public.grant_coins(NEW.client_id, 'order', NEW.id, v_coins, coalesce(NEW.delivered_at, now()));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_order_coins() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_award_order_coins ON public.orders;
CREATE TRIGGER trg_award_order_coins
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.award_order_coins();

-- 5) Avaliações: as mesmas coins seja qual for a nota, só em encomendas
--    entregues. Avaliação removida pela equipa: as coins são retiradas.
CREATE OR REPLACE FUNCTION public.award_review_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.context = 'delivered' AND NEW.removed_at IS NULL THEN
      PERFORM public.grant_coins(NEW.client_id, 'review', NEW.id, public.coin_rule('review'), NEW.created_at);
    END IF;
  ELSIF NEW.removed_at IS NOT NULL AND OLD.removed_at IS NULL THEN
    PERFORM public.reverse_coins(NEW.client_id, 'review', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_review_coins() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_award_review_coins ON public.farmer_reviews;
CREATE TRIGGER trg_award_review_coins
AFTER INSERT OR UPDATE OF removed_at ON public.farmer_reviews
FOR EACH ROW EXECUTE FUNCTION public.award_review_coins();

-- 6) Tarefa diária: pendentes passam a disponíveis, as vencidas expiram, e
--    aviso 14 dias antes de expirarem (uma vez por lote).
CREATE OR REPLACE FUNCTION public.coins_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row record;
BEGIN
  -- Disponíveis.
  FOR v_row IN
    WITH ready AS (
      UPDATE public.coin_lots SET status = 'available'
       WHERE status = 'pending' AND available_at <= now()
      RETURNING user_id, coins
    )
    SELECT user_id, sum(coins)::int AS total FROM ready GROUP BY user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (v_row.user_id, 'coins_available', 'Coins disponíveis',
            v_row.total || ' coins já estão disponíveis para trocar por brindes.', '/encomendas?coins=1');
  END LOOP;

  -- Expiradas.
  INSERT INTO public.coin_movements (user_id, lot_id, kind, coins, source_type, source_id)
  SELECT user_id, id, 'expire', -remaining, source_type, source_id
    FROM public.coin_lots
   WHERE status = 'available' AND expires_at <= now() AND remaining > 0;
  UPDATE public.coin_lots SET status = 'expired', remaining = 0
   WHERE status = 'available' AND expires_at <= now();

  -- A expirar em breve.
  FOR v_row IN
    WITH warn AS (
      UPDATE public.coin_lots SET expiry_warned_at = now()
       WHERE status = 'available' AND remaining > 0 AND expiry_warned_at IS NULL
         AND expires_at <= now() + make_interval(days => public.coin_rule('expiry_warning_days'))
      RETURNING user_id, remaining, expires_at
    )
    SELECT user_id, sum(remaining)::int AS total, min(expires_at) AS first_expiry FROM warn GROUP BY user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (v_row.user_id, 'coins_expiring', 'Coins a expirar',
            v_row.total || ' coins expiram a ' || to_char(v_row.first_expiry AT TIME ZONE 'Europe/Lisbon', 'DD/MM/YYYY')
              || '. Troque-as por um brinde antes dessa data.',
            '/encomendas?coins=1');
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.coins_daily() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('coins-daily', '30 5 * * *', $$SELECT public.coins_daily()$$);

-- 7) "As minhas coins": saldo, pendentes, a expirar e histórico.
CREATE OR REPLACE FUNCTION public.my_coins_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'available', coalesce((SELECT sum(remaining) FROM public.coin_lots
                            WHERE user_id = auth.uid() AND status = 'available'), 0),
    'pending', coalesce((SELECT sum(coins) FROM public.coin_lots
                          WHERE user_id = auth.uid() AND status = 'pending'), 0),
    'pending_lots', coalesce((
      SELECT jsonb_agg(jsonb_build_object('coins', coins, 'available_at', available_at) ORDER BY available_at)
        FROM public.coin_lots WHERE user_id = auth.uid() AND status = 'pending'), '[]'::jsonb),
    'expiring_lots', coalesce((
      SELECT jsonb_agg(jsonb_build_object('coins', remaining, 'expires_at', expires_at) ORDER BY expires_at)
        FROM public.coin_lots
       WHERE user_id = auth.uid() AND status = 'available' AND remaining > 0
         AND expires_at <= now() + interval '30 days'), '[]'::jsonb),
    'movements', coalesce((
      SELECT jsonb_agg(jsonb_build_object('kind', m.kind, 'coins', m.coins, 'source_type', m.source_type,
                                          'created_at', m.created_at) ORDER BY m.created_at DESC)
        FROM (SELECT kind, coins, source_type, created_at FROM public.coin_movements
               WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 50) m), '[]'::jsonb)
  )
$$;

REVOKE EXECUTE ON FUNCTION public.my_coins_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_coins_summary() TO authenticated;

-- 8) Eliminar conta: as coins (disponíveis e pendentes) perdem-se.
--    Igual a 20261121180000_eliminar_conta.sql, mais o passo das coins.
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

  -- Coins: as disponíveis e as pendentes perdem-se.
  INSERT INTO public.coin_movements (user_id, lot_id, kind, coins, source_type, source_id)
  SELECT user_id, id, 'expire', -remaining, source_type, source_id
    FROM public.coin_lots
   WHERE user_id = p_user AND status IN ('pending', 'available') AND remaining > 0;
  UPDATE public.coin_lots SET status = 'expired', remaining = 0
   WHERE user_id = p_user AND status IN ('pending', 'available');

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

-- Subscrições dos agricultores (cabazes com entrega em casa do cliente).
--
-- O agricultor cria planos (preço, de quanto em quanto tempo cobra, de quanto
-- em quanto tempo entrega, o que inclui, raio de entrega). O cliente subscreve
-- um plano na página da quinta, com a morada e o ponto de entrega.
--
-- Cobrança (simulada, como as encomendas): em cada período de faturação são
-- criadas as entregas desse período como encomendas (orders.kind =
-- 'subscription'), já pagas. Assim, cada entrega tem chat, código QR,
-- acompanhamento no mapa de entregas e queixa de entrega não recebida, como as
-- outras encomendas. A cobrança real (Stripe Billing) fica para a fase 2 dos
-- pagamentos (docs/pagamentos-stripe-connect.md).
--
-- Cancelamento: a qualquer momento. As entregas que faltam a mais de 48 horas
-- são devolvidas; as mais próximas já estão em preparação e mantêm-se.
--
-- Entrega falhada: o cliente faz queixa (file_delivery_complaint) e a equipa
-- decide. Se a equipa der razão ao cliente numa entrega de subscrição, o
-- cliente recebe o valor de volta mais uma indemnização de 20% e a plataforma
-- aplica ao agricultor uma multa de 10%, ambas descontadas ao agricultor.
-- (Taxas também em src/lib/legal.ts, para os Termos.)

-- ---------------------------------------------------------------------------
-- 1. Oferta "subscrições" no perfil do agricultor
-- ---------------------------------------------------------------------------
ALTER TABLE public.farmer_details
  ADD COLUMN IF NOT EXISTS offers_subscriptions boolean NOT NULL DEFAULT false;

ALTER TABLE public.farmer_details DROP CONSTRAINT IF EXISTS farmer_details_offers_at_least_one;
ALTER TABLE public.farmer_details
  ADD CONSTRAINT farmer_details_offers_at_least_one
  CHECK (offers_products OR offers_experiences OR offers_stays OR offers_subscriptions);

GRANT SELECT (offers_subscriptions) ON public.farmer_details TO anon, authenticated;
GRANT UPDATE (offers_subscriptions) ON public.farmer_details TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Planos de subscrição
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmer_details(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  description text NOT NULL CHECK (char_length(description) BETWEEN 20 AND 2000),
  -- O que o cabaz inclui (uma linha por artigo).
  includes text NOT NULL CHECK (char_length(includes) BETWEEN 3 AND 2000),
  -- Preço por período de faturação (IVA e comissão incluídos), em euros.
  price numeric(10,2) NOT NULL CHECK (price >= 1 AND price <= 2000),
  billing_interval text NOT NULL CHECK (billing_interval IN ('week', 'fortnight', 'month')),
  delivery_interval text NOT NULL CHECK (delivery_interval IN ('week', 'fortnight', 'month')),
  -- Dias entre a subscrição e a primeira entrega (preparação).
  preparation_days integer NOT NULL DEFAULT 2 CHECK (preparation_days BETWEEN 1 AND 14),
  delivery_radius_km numeric(6,1) NOT NULL CHECK (delivery_radius_km > 0 AND delivery_radius_km <= 200),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Entrega mais frequente (ou igual) que a cobrança: cada cobrança paga 1 ou mais entregas.
  CONSTRAINT subscription_plans_delivery_le_billing CHECK (
    (CASE delivery_interval WHEN 'week' THEN 1 WHEN 'fortnight' THEN 2 ELSE 4 END)
    <= (CASE billing_interval WHEN 'week' THEN 1 WHEN 'fortnight' THEN 2 ELSE 4 END)
  )
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_farmer ON public.subscription_plans (farmer_id);

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans FOR SELECT TO anon, authenticated
  USING ((active AND public.farmer_is_listed(farmer_id)) OR public.user_owns_farmer(farmer_id));

CREATE POLICY "Farmer manages own subscription plans"
  ON public.subscription_plans FOR ALL TO authenticated
  USING (public.user_owns_farmer(farmer_id))
  WITH CHECK (public.user_owns_farmer(farmer_id));

GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Subscrições dos clientes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  farmer_id uuid NOT NULL REFERENCES public.farmer_details(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  -- Condições no momento da subscrição (o agricultor pode mudar o plano depois).
  title text NOT NULL,
  price numeric(10,2) NOT NULL,
  billing_interval text NOT NULL,
  delivery_interval text NOT NULL,
  delivery_address text NOT NULL,
  delivery_lat double precision NOT NULL,
  delivery_lng double precision NOT NULL,
  next_billing_at timestamptz NOT NULL,
  next_delivery_at timestamptz NOT NULL,
  cancelled_by text CHECK (cancelled_by IN ('client', 'farmer')),
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON public.subscriptions (client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_farmer ON public.subscriptions (farmer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing ON public.subscriptions (next_billing_at) WHERE status = 'active';
-- Uma subscrição ativa por cliente e plano.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_per_plan
  ON public.subscriptions (plan_id, client_id) WHERE status = 'active';

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client and farmer can view subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.user_owns_farmer(farmer_id));

-- Sem escrita direta: tudo passa por subscribe_to_plan / cancel_subscription.
GRANT SELECT ON public.subscriptions TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Entregas da subscrição como encomendas
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_kind_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_kind_check CHECK (kind IN ('product', 'experience', 'stay', 'subscription'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  -- Entrega de subscrição não feita (queixa aceite pela equipa).
  ADD COLUMN IF NOT EXISTS client_compensation numeric(10,2),
  ADD COLUMN IF NOT EXISTS farmer_fine numeric(10,2);

CREATE INDEX IF NOT EXISTS idx_orders_subscription ON public.orders (subscription_id);

GRANT SELECT (subscription_id, client_compensation, farmer_fine) ON public.orders TO authenticated;

-- Duração de um intervalo.
CREATE OR REPLACE FUNCTION public.subscription_interval(p_interval text)
RETURNS interval
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE p_interval WHEN 'week' THEN interval '7 days'
                         WHEN 'fortnight' THEN interval '14 days'
                         ELSE interval '1 month' END
$$;

-- Entregas por período de faturação (ex.: cobrança mensal, entrega semanal = 4).
CREATE OR REPLACE FUNCTION public.subscription_deliveries_per_period(p_billing text, p_delivery text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT GREATEST(1,
    (CASE p_billing WHEN 'week' THEN 1 WHEN 'fortnight' THEN 2 ELSE 4 END)
    / (CASE p_delivery WHEN 'week' THEN 1 WHEN 'fortnight' THEN 2 ELSE 4 END))
$$;

-- Cobra um período (simulado) e cria as suas entregas.
CREATE OR REPLACE FUNCTION public.bill_subscription_period(p_subscription_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
  v_farmer_user uuid;
  v_n integer;
  v_each numeric(10,2);
  v_amount numeric(10,2);
  v_commission numeric(10,2);
  v_when timestamptz;
  v_code text;
  v_order uuid;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND OR v_sub.status <> 'active' THEN RETURN; END IF;

  v_n := public.subscription_deliveries_per_period(v_sub.billing_interval, v_sub.delivery_interval);
  v_each := round(v_sub.price / v_n, 2);

  FOR k IN 0..(v_n - 1) LOOP
    v_when := v_sub.next_delivery_at + public.subscription_interval(v_sub.delivery_interval) * k;
    -- A última entrega leva os cêntimos do arredondamento.
    v_amount := CASE WHEN k = v_n - 1 THEN v_sub.price - v_each * (v_n - 1) ELSE v_each END;
    v_commission := round(v_amount * 0.10, 2);

    LOOP
      v_code := '';
      FOR i IN 1..8 LOOP
        v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE pickup_code = v_code);
    END LOOP;

    INSERT INTO public.orders (
      client_id, farmer_id, total, commission_amount, farmer_amount, status, pickup_code,
      pickup_deadline, paid_at, accepted_at, kind, subscription_id,
      delivery_address, delivery_lat, delivery_lng, expected_delivery_at, delivery_fee
    )
    VALUES (
      v_sub.client_id, v_sub.farmer_id, v_amount, v_commission, v_amount - v_commission, 'awaiting_pickup', v_code,
      v_when + interval '2 days', now(), now(), 'subscription', v_sub.id,
      v_sub.delivery_address, v_sub.delivery_lat, v_sub.delivery_lng, v_when, 0
    )
    RETURNING id INTO v_order;

    INSERT INTO public.order_items (order_id, product_name, quantity, unit, unit_price, subtotal)
    VALUES (v_order, v_sub.title, 1, 'entrega', v_amount, v_amount);
  END LOOP;

  UPDATE public.subscriptions
     SET next_billing_at = next_billing_at + public.subscription_interval(billing_interval),
         next_delivery_at = next_delivery_at + public.subscription_interval(delivery_interval) * v_n
   WHERE id = v_sub.id;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (v_sub.client_id, 'subscription_billed', 'Subscrição renovada',
          'A subscrição "' || v_sub.title || '" foi cobrada (' || to_char(v_sub.price, 'FM999990.00')
            || '€). ' || CASE WHEN v_n = 1 THEN 'A próxima entrega está' ELSE 'As próximas ' || v_n || ' entregas estão' END
            || ' nas suas encomendas.',
          '/encomendas');

  SELECT user_id INTO v_farmer_user FROM public.farmer_details WHERE id = v_sub.farmer_id;
  IF v_farmer_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (v_farmer_user, 'subscription_deliveries', 'Novas entregas de subscrição',
            CASE WHEN v_n = 1 THEN 'Tem 1 nova entrega' ELSE 'Tem ' || v_n || ' novas entregas' END
              || ' da subscrição "' || v_sub.title || '". Veja as datas nas encomendas.',
            '/agricultor/encomendas');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bill_subscription_period(uuid) FROM PUBLIC, anon, authenticated;

-- Renovações em atraso (de hora a hora, pelo pg_cron).
CREATE OR REPLACE FUNCTION public.run_subscription_billing()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_id IN
    SELECT s.id FROM public.subscriptions s
     WHERE s.status = 'active' AND s.next_billing_at <= now()
     ORDER BY s.next_billing_at
     LIMIT 500
  LOOP
    BEGIN
      PERFORM public.bill_subscription_period(v_id);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'bill_subscription_period % falhou: %', v_id, SQLERRM;
    END;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_subscription_billing() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('subscription-billing', '20 * * * *', $$SELECT public.run_subscription_billing()$$);

-- ---------------------------------------------------------------------------
-- 5. Subscrever e cancelar
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.subscribe_to_plan(
  p_plan_id uuid,
  p_address text,
  p_lat double precision,
  p_lng double precision
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan public.subscription_plans%ROWTYPE;
  v_farmer public.farmer_details%ROWTYPE;
  v_profile_type text;
  v_km double precision;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT profile_type INTO v_profile_type FROM public.profiles WHERE id = v_uid;
  IF v_profile_type IS DISTINCT FROM 'cliente' THEN
    RAISE EXCEPTION 'Apenas clientes podem comprar';
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = p_plan_id;
  IF NOT FOUND OR NOT v_plan.active OR NOT public.farmer_is_listed(v_plan.farmer_id) THEN
    RAISE EXCEPTION 'Esta subscrição não está disponível.';
  END IF;
  SELECT * INTO v_farmer FROM public.farmer_details WHERE id = v_plan.farmer_id;

  IF p_address IS NULL OR char_length(btrim(p_address)) < 5 THEN
    RAISE EXCEPTION 'Indique a morada de entrega ao domicílio.';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR abs(p_lat) > 90 OR abs(p_lng) > 180 THEN
    RAISE EXCEPTION 'Marque no mapa o ponto exato da entrega.';
  END IF;
  IF v_farmer.pickup_lat IS NULL OR v_farmer.pickup_lng IS NULL THEN
    RAISE EXCEPTION 'Esta subscrição não está disponível.';
  END IF;
  -- Distância em linha reta (Haversine), como src/lib/geo.ts.
  v_km := 2 * 6371 * asin(sqrt(
    power(sin(radians(p_lat - v_farmer.pickup_lat) / 2), 2)
    + cos(radians(v_farmer.pickup_lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - v_farmer.pickup_lng) / 2), 2)
  ));
  IF v_km > v_plan.delivery_radius_km THEN
    RAISE EXCEPTION 'A morada está fora da zona de entrega do agricultor (até % km da quinta).', v_plan.delivery_radius_km;
  END IF;

  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE plan_id = p_plan_id AND client_id = v_uid AND status = 'active') THEN
    RAISE EXCEPTION 'Já tem esta subscrição ativa.';
  END IF;

  INSERT INTO public.subscriptions (
    plan_id, farmer_id, client_id, title, price, billing_interval, delivery_interval,
    delivery_address, delivery_lat, delivery_lng, next_billing_at, next_delivery_at
  )
  VALUES (
    v_plan.id, v_plan.farmer_id, v_uid, v_plan.title, v_plan.price, v_plan.billing_interval, v_plan.delivery_interval,
    left(btrim(p_address), 300), p_lat, p_lng, now(), date_trunc('day', now()) + make_interval(days => v_plan.preparation_days) + interval '12 hours'
  )
  RETURNING id INTO v_id;

  -- Primeiro período: cobrado já.
  PERFORM public.bill_subscription_period(v_id);
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.subscribe_to_plan(uuid, text, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_plan(uuid, text, double precision, double precision) TO authenticated;

-- Cancelar (cliente ou agricultor). Devolve o valor das entregas que faltam a
-- mais de 48 horas; as outras já estão em preparação e mantêm-se.
CREATE OR REPLACE FUNCTION public.cancel_subscription(p_subscription_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sub public.subscriptions%ROWTYPE;
  v_by text;
  v_farmer_user uuid;
  v_refunded integer;
  v_amount numeric(10,2);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscrição não encontrada.'; END IF;
  SELECT user_id INTO v_farmer_user FROM public.farmer_details WHERE id = v_sub.farmer_id;
  IF v_sub.client_id = v_uid THEN v_by := 'client';
  ELSIF v_farmer_user = v_uid THEN v_by := 'farmer';
  ELSE RAISE EXCEPTION 'Subscrição não encontrada.';
  END IF;
  IF v_sub.status <> 'active' THEN RAISE EXCEPTION 'Esta subscrição já foi cancelada.'; END IF;

  UPDATE public.subscriptions
     SET status = 'cancelled', cancelled_by = v_by, cancelled_at = now()
   WHERE id = v_sub.id;

  -- Se for o agricultor a cancelar, devolve todas as entregas por fazer.
  WITH refunded AS (
    UPDATE public.orders
       SET status = 'refunded', expired_at = now(), cancelled_by = v_by,
           refund_amount = total, farmer_amount = 0, commission_amount = 0
     WHERE subscription_id = v_sub.id
       AND status = 'awaiting_pickup'
       AND (v_by = 'farmer' OR expected_delivery_at > now() + interval '48 hours')
    RETURNING total
  )
  SELECT count(*), coalesce(sum(total), 0) INTO v_refunded, v_amount FROM refunded;

  IF v_by = 'client' THEN
    IF v_farmer_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (v_farmer_user, 'subscription_cancelled', 'Subscrição cancelada',
              'Um cliente cancelou a subscrição "' || v_sub.title || '". '
                || CASE WHEN v_refunded > 0 THEN v_refunded || ' entrega(s) futura(s) foram anuladas.' ELSE 'Não há entregas futuras anuladas.' END,
              '/agricultor/subscricoes');
    END IF;
  ELSE
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (v_sub.client_id, 'subscription_cancelled', 'Subscrição cancelada pelo agricultor',
            'O agricultor cancelou a subscrição "' || v_sub.title || '". O valor de '
              || to_char(v_amount, 'FM999990.00') || '€ das entregas por fazer foi devolvido.',
            '/encomendas');
  END IF;
  RETURN v_refunded;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_subscription(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Oferta só se desliga sem planos ativos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_farmer_offerings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.offers_products AND NOT NEW.offers_products AND EXISTS (
    SELECT 1 FROM public.products WHERE farmer_id = NEW.id AND active AND COALESCE(stock_quantity, 0) > 0
  ) THEN
    RAISE EXCEPTION 'Para deixar de vender produtos, termine primeiro o stock dos produtos à venda.';
  END IF;
  IF OLD.offers_experiences AND NOT NEW.offers_experiences AND EXISTS (
    SELECT 1 FROM public.farm_experiences WHERE farmer_id = NEW.id AND active
  ) THEN
    RAISE EXCEPTION 'Para deixar de oferecer experiências, suspenda primeiro todas as experiências.';
  END IF;
  IF OLD.offers_stays AND NOT NEW.offers_stays AND EXISTS (
    SELECT 1 FROM public.farm_stays WHERE farmer_id = NEW.id AND active
  ) THEN
    RAISE EXCEPTION 'Para deixar de oferecer alojamento, suspenda primeiro todos os alojamentos.';
  END IF;
  IF OLD.offers_subscriptions AND NOT NEW.offers_subscriptions AND EXISTS (
    SELECT 1 FROM public.subscription_plans WHERE farmer_id = NEW.id AND active
  ) THEN
    RAISE EXCEPTION 'Para deixar de oferecer subscrições, suspenda primeiro todos os planos.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_farmer_offerings_change ON public.farmer_details;
CREATE TRIGGER trg_check_farmer_offerings_change
BEFORE UPDATE OF offers_products, offers_experiences, offers_stays, offers_subscriptions ON public.farmer_details
FOR EACH ROW EXECUTE FUNCTION public.check_farmer_offerings_change();

-- ---------------------------------------------------------------------------
-- 7. Queixa aceite numa entrega de subscrição: indemnização e multa
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_delivery_complaint_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_farmer_user uuid;
  v_compensation numeric(10,2) := 0;
  v_fine numeric(10,2) := 0;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF OLD.status <> 'open' THEN
    RAISE EXCEPTION 'Esta queixa já foi decidida.';
  END IF;
  NEW.decided_at := now();

  IF NEW.status = 'refund_approved' THEN
    IF now() < OLD.deadline_at THEN
      RAISE EXCEPTION 'As 48 horas do agricultor ainda não terminaram.';
    END IF;
    SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id FOR UPDATE;
    IF v_order.status <> 'awaiting_pickup' THEN
      RAISE EXCEPTION 'A encomenda já não está por entregar.';
    END IF;

    IF v_order.kind = 'subscription' THEN
      -- Promessa não cumprida: o cliente recebe o valor mais 20% de indemnização
      -- e a plataforma aplica ao agricultor uma multa de 10%.
      v_compensation := round(v_order.total * 0.20, 2);
      v_fine := round(v_order.total * 0.10, 2);
      UPDATE public.orders
         SET status = 'refunded', expired_at = now(),
             refund_amount = total + v_compensation,
             client_compensation = v_compensation,
             farmer_fine = v_fine,
             commission_amount = v_fine,
             -- Nada a receber desta entrega; a indemnização e a multa ficam em
             -- dívida do agricultor (descontadas nas transferências seguintes
             -- quando os pagamentos forem reais).
             farmer_amount = 0
       WHERE id = NEW.order_id;
    ELSE
      UPDATE public.orders SET status = 'refunded', expired_at = now() WHERE id = NEW.order_id;
    END IF;

    SELECT user_id INTO v_farmer_user FROM public.farmer_details WHERE id = v_order.farmer_id;
    INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
    VALUES (NEW.client_id, NEW.order_id, 'order_refunded', 'Encomenda devolvida',
            'Confirmámos que não recebeste a encomenda. O valor de '
              || to_char(v_order.total, 'FM999990.00') || '€ foi devolvido na totalidade'
              || CASE WHEN v_compensation > 0
                   THEN ', mais ' || to_char(v_compensation, 'FM999990.00') || '€ de indemnização.'
                   ELSE '.' END,
            '/encomendas?id=' || NEW.order_id::text);
    IF v_farmer_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
      VALUES (v_farmer_user, NEW.order_id, 'order_refunded', 'Encomenda devolvida ao cliente',
              'A encomenda não foi entregue no prazo da queixa e o valor foi devolvido ao cliente.'
                || CASE WHEN v_compensation > 0
                     THEN ' Por ser uma entrega de subscrição, são-lhe descontados '
                          || to_char(v_compensation, 'FM999990.00') || '€ de indemnização ao cliente e '
                          || to_char(v_fine, 'FM999990.00') || '€ de multa.'
                     ELSE '' END,
              '/agricultor/encomendas?id=' || NEW.order_id::text);
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
    VALUES (NEW.client_id, NEW.order_id, 'delivery_complaint_rejected', 'Queixa recusada',
            'Analisámos a tua queixa e não foi possível confirmar que a encomenda não foi entregue.',
            '/encomendas?id=' || NEW.order_id::text);
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Registo inicial: também pode escolher subscrições
-- ---------------------------------------------------------------------------
-- Substitui a versão de 20261121140000 (mais um parâmetro).
DROP FUNCTION IF EXISTS public.complete_farmer_onboarding(
  text, text, text, text, text, text, text, text, text, text,
  double precision, double precision, boolean, boolean, boolean
);

CREATE OR REPLACE FUNCTION public.complete_farmer_onboarding(
  p_exploration_id text,
  p_exploration_number text,
  p_company_name text,
  p_company_nif text,
  p_cae_code text,
  p_address text,
  p_phone text,
  p_website text,
  p_description text,
  p_pickup_address text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_offers_products boolean,
  p_offers_experiences boolean,
  p_offers_stays boolean,
  p_offers_subscriptions boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _farmer public.farmer_details%ROWTYPE;
  _nif text := btrim(coalesce(p_company_nif, ''));
  _number text := upper(btrim(coalesce(p_exploration_number, '')));
  _total int := 0;
  _check int;
  _certs int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO _farmer FROM public.farmer_details WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de agricultor não encontrado.';
  END IF;
  IF _farmer.registration_step >= 2 THEN
    RAISE EXCEPTION 'O registo já foi concluído. Para alterar os dados, faça um pedido de alteração.';
  END IF;

  -- As mesmas regras de src/lib/farmer-validation.ts (o browser já as mostra).
  IF length(btrim(coalesce(p_exploration_id, ''))) < 3
     OR _number !~ '^[A-Z0-9]{7,20}$'
     OR length(btrim(coalesce(p_company_name, ''))) < 3
     OR btrim(coalesce(p_cae_code, '')) !~ '^\d{5}$'
     OR length(btrim(coalesce(p_address, ''))) < 5
     OR length(btrim(coalesce(p_phone, ''))) < 9
     OR length(btrim(coalesce(p_pickup_address, ''))) < 5
     OR p_pickup_lat IS NULL OR p_pickup_lng IS NULL
     OR abs(p_pickup_lat) > 90 OR abs(p_pickup_lng) > 180 THEN
    RAISE EXCEPTION 'Preencha corretamente todos os campos obrigatórios do registo.';
  END IF;

  -- NIF português: 9 dígitos e dígito de controlo.
  IF _nif !~ '^\d{9}$' THEN
    RAISE EXCEPTION 'O NIF da empresa não é válido.';
  END IF;
  FOR i IN 1..8 LOOP
    _total := _total + substr(_nif, i, 1)::int * (10 - i);
  END LOOP;
  _check := CASE WHEN _total % 11 < 2 THEN 0 ELSE 11 - _total % 11 END;
  IF _check <> substr(_nif, 9, 1)::int THEN
    RAISE EXCEPTION 'O NIF da empresa não é válido.';
  END IF;

  IF NOT (coalesce(p_offers_products, false) OR coalesce(p_offers_experiences, false)
          OR coalesce(p_offers_stays, false) OR coalesce(p_offers_subscriptions, false)) THEN
    RAISE EXCEPTION 'Indique o que a quinta oferece: produtos, experiências ou alojamento.';
  END IF;

  -- Pontuação inicial: 10 por certificado já carregado, até 50.
  SELECT count(*) INTO _certs FROM public.farmer_certificates WHERE farmer_id = _farmer.id;

  -- O nº de exploração e o NIF repetidos falham nos índices únicos
  -- (farmer_details_exploration_number_unique / _company_nif_unique), que o
  -- browser já traduz.
  UPDATE public.farmer_details SET
    exploration_id = btrim(p_exploration_id),
    exploration_number = _number,
    company_name = btrim(p_company_name),
    company_nif = _nif,
    cae_code = btrim(p_cae_code),
    address = btrim(p_address),
    phone = btrim(p_phone),
    website = nullif(btrim(coalesce(p_website, '')), ''),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    pickup_address = btrim(p_pickup_address),
    pickup_lat = p_pickup_lat,
    pickup_lng = p_pickup_lng,
    offers_products = coalesce(p_offers_products, false),
    offers_experiences = coalesce(p_offers_experiences, false),
    offers_stays = coalesce(p_offers_stays, false),
    offers_subscriptions = coalesce(p_offers_subscriptions, false),
    initial_score = least(_certs * 10, 50),
    registration_step = 2
  WHERE id = _farmer.id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_farmer_onboarding(
  text, text, text, text, text, text, text, text, text, text,
  double precision, double precision, boolean, boolean, boolean, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_farmer_onboarding(
  text, text, text, text, text, text, text, text, text, text,
  double precision, double precision, boolean, boolean, boolean, boolean
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. Tradução automática dos planos (título, descrição e o que inclui)
-- ---------------------------------------------------------------------------
ALTER TABLE public.content_translations DROP CONSTRAINT IF EXISTS content_translations_source_type_check;
ALTER TABLE public.content_translations
  ADD CONSTRAINT content_translations_source_type_check
  CHECK (source_type IN ('product', 'experience', 'stay', 'subscription', 'farm', 'review', 'notification', 'chat', 'order_item'));

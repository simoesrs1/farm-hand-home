-- Experiências e alojamento na quinta, e reservas.
--
-- Experiência: atividade com título, descrição, fotos/vídeos, duração, preço por
-- pessoa ou por grupo (com preço opcional por dia da semana), mínimo e máximo de
-- pessoas e sessões com hora de início por dia da semana.
--
-- Brindes: produtos da própria quinta, por ordem. Os grátis (extra_price = 0)
-- seguem a ordem da lista: o cliente recebe o primeiro com stock. Os pagos são
-- extras opcionais. Sem brindes grátis com stock, a experiência só se reserva se
-- o agricultor escolheu keep_without_gift (e aí o brinde não é mencionado).
--
-- Alojamento (secção 7): tipos de quarto/unidade com quantidade e lotação,
-- preço por noite (por quarto ou por pessoa), mínimo de noites, datas fechadas e
-- registo obrigatório (Alojamento Local/RNAL ou Turismo no Espaço Rural/RNET).
-- Mesmas regras de brindes, cancelamento, faltas e comissão.
--
-- Reserva = encomenda com kind = 'experience' ou 'stay', criada já aceite. O QR code é
-- validado à chegada (validate-pickup). Cancelamento pelo cliente: grátis até 5
-- dias antes; depois retém 25% do valor da experiência (20% agricultor, 5%
-- plataforma), com brindes pagos devolvidos. Cancelamento pelo agricultor:
-- devolução total. Em ambos os casos os brindes voltam ao lote de onde saíram. Falta: sem
-- devolução (expire-orders). Comissão normal de 10% sobre o total.

-- 1. Experiências.
CREATE TABLE public.farm_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmer_details(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 20 AND 5000),
  media_urls text[] NOT NULL DEFAULT '{}',
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 15 AND 1440),
  pricing_mode text NOT NULL CHECK (pricing_mode IN ('per_person', 'per_group')),
  base_price numeric(10,2) NOT NULL CHECK (base_price > 0),
  -- Preço por dia da semana, opcional: {"6": 30, "0": 30} (0 = domingo).
  day_prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  min_people integer NOT NULL CHECK (min_people >= 1),
  max_people integer NOT NULL CHECK (max_people <= 200),
  -- Sessões: [{"day": 6, "times": ["10:00", "15:00"]}] (hora de Lisboa).
  sessions jsonb NOT NULL DEFAULT '[]'::jsonb,
  keep_without_gift boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_people >= min_people)
);

CREATE INDEX idx_farm_experiences_farmer ON public.farm_experiences (farmer_id);

CREATE TRIGGER update_farm_experiences_updated_at
BEFORE UPDATE ON public.farm_experiences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.farm_experiences ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.farm_experiences TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.farm_experiences TO authenticated;
GRANT ALL ON public.farm_experiences TO service_role;

CREATE POLICY "Anyone can view active experiences"
  ON public.farm_experiences FOR SELECT TO anon, authenticated
  USING ((active AND public.farmer_is_listed(farmer_id)) OR public.user_owns_farmer(farmer_id));

CREATE POLICY "Farmer manages own experiences"
  ON public.farm_experiences FOR ALL TO authenticated
  USING (public.user_owns_farmer(farmer_id))
  WITH CHECK (public.user_owns_farmer(farmer_id));


-- 2. Brindes.
CREATE TABLE public.experience_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.farm_experiences(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  -- 0 = brinde grátis; > 0 = extra pago.
  extra_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (extra_price >= 0),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experience_id, product_id)
);

ALTER TABLE public.experience_gifts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.experience_gifts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.experience_gifts TO authenticated;
GRANT ALL ON public.experience_gifts TO service_role;

-- A experiência tem de ser visível (policy acima, avaliada como quem consulta).
CREATE POLICY "Anyone can view gifts of visible experiences"
  ON public.experience_gifts FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.farm_experiences e WHERE e.id = experience_id));

-- O brinde tem de ser um produto da mesma quinta.
CREATE POLICY "Farmer manages own experience gifts"
  ON public.experience_gifts FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.farm_experiences e
     WHERE e.id = experience_id AND public.user_owns_farmer(e.farmer_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.farm_experiences e
      JOIN public.products p ON p.id = product_id AND p.farmer_id = e.farmer_id
     WHERE e.id = experience_id AND public.user_owns_farmer(e.farmer_id)
  ));


-- 3. Reservas nas encomendas.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'product' CHECK (kind IN ('product', 'experience', 'stay')),
  ADD COLUMN IF NOT EXISTS experience_id uuid REFERENCES public.farm_experiences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_start timestamptz,
  ADD COLUMN IF NOT EXISTS booking_people integer,
  -- Alojamento: saída e número de quartos.
  ADD COLUMN IF NOT EXISTS booking_end timestamptz,
  ADD COLUMN IF NOT EXISTS booking_units integer,
  -- Parte do total que é a experiência ou o alojamento (sem brindes pagos): base dos 25%.
  ADD COLUMN IF NOT EXISTS booking_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS cancelled_by text CHECK (cancelled_by IN ('client', 'farmer')),
  ADD COLUMN IF NOT EXISTS cancellation_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS refund_amount numeric(10,2);

CREATE INDEX IF NOT EXISTS idx_orders_experience_start ON public.orders (experience_id, booking_start);

GRANT SELECT (kind, experience_id, booking_start, booking_end, booking_people, booking_units, booking_amount,
              cancelled_by, cancellation_fee, refund_amount)
  ON public.orders TO authenticated;

-- Brindes entregues em cada reserva (para devolver ao stock num cancelamento).
CREATE TABLE public.booking_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  extra_price numeric(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE public.booking_gifts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.booking_gifts TO authenticated;
GRANT ALL ON public.booking_gifts TO service_role;

CREATE POLICY "Order members can read booking gifts"
  ON public.booking_gifts FOR SELECT TO authenticated
  USING (public.user_in_order(order_id));


-- 4. Vagas ocupadas por sessão (só contagens, por isso é pública).
CREATE OR REPLACE FUNCTION public.experience_session_bookings(
  p_experience_id uuid, p_from timestamptz, p_to timestamptz
)
RETURNS TABLE (booking_start timestamptz, people bigint, bookings bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.booking_start, COALESCE(sum(o.booking_people), 0), count(*)
    FROM public.orders o
   WHERE o.experience_id = p_experience_id
     AND o.kind = 'experience'
     AND o.status IN ('awaiting_pickup', 'delivered')
     AND o.booking_start >= p_from AND o.booking_start < p_to
   GROUP BY o.booking_start
$$;

REVOKE EXECUTE ON FUNCTION public.experience_session_bookings(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.experience_session_bookings(uuid, timestamptz, timestamptz) TO anon, authenticated, service_role;


-- 5. Stock com validade obrigatória e brindes rastreados por lote.
--
-- Todo o stock à venda tem validade. Um lote sem validade (expires_at NULL) fica
-- "à espera de validade": não conta em products.stock_quantity, não é vendido e
-- volta ao stock quando o agricultor indicar a data (set_batch_expiry).
-- Os brindes das reservas guardam o lote de onde saíram (booking_gift_lots);
-- num cancelamento voltam a esse lote, com a validade original, ou não voltam
-- se a validade já tiver passado. O agricultor é notificado em ambos os casos.

CREATE TABLE public.booking_gift_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.product_stock_batches(id) ON DELETE SET NULL,
  quantity numeric NOT NULL CHECK (quantity > 0)
);

ALTER TABLE public.booking_gift_lots ENABLE ROW LEVEL SECURITY;
-- Só uso interno (funções abaixo).
GRANT ALL ON public.booking_gift_lots TO service_role;

-- Vendas só tiram de lotes com validade (igual a 20261010120000, sem os lotes à espera).
CREATE OR REPLACE FUNCTION public.deduct_stock_batches(p_product_id uuid, p_qty numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE r record; v_left numeric := p_qty; v_take numeric;
BEGIN
  FOR r IN SELECT id, quantity_remaining FROM public.product_stock_batches
    WHERE product_id = p_product_id AND quantity_remaining > 0
      AND expires_at IS NOT NULL AND expires_at >= public.lisbon_today()
    ORDER BY added_at, id FOR UPDATE
  LOOP
    EXIT WHEN v_left <= 0;
    v_take := LEAST(r.quantity_remaining, v_left);
    UPDATE public.product_stock_batches SET quantity_remaining = quantity_remaining - v_take WHERE id = r.id;
    v_left := v_left - v_take;
  END LOOP;
END; $fn$;

-- Brinde de uma reserva: tira dos lotes (mais antigo primeiro) e guarda de onde.
CREATE OR REPLACE FUNCTION public.consume_gift_stock(p_product_id uuid, p_quantity numeric, p_order_id uuid, p_actor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE r record; v_left numeric := p_quantity; v_take numeric;
BEGIN
  PERFORM public.expire_stock_batches(p_product_id);
  FOR r IN SELECT id, quantity_remaining FROM public.product_stock_batches
    WHERE product_id = p_product_id AND quantity_remaining > 0
      AND expires_at IS NOT NULL AND expires_at >= public.lisbon_today()
    ORDER BY added_at, id FOR UPDATE
  LOOP
    EXIT WHEN v_left <= 0;
    v_take := LEAST(r.quantity_remaining, v_left);
    UPDATE public.product_stock_batches SET quantity_remaining = quantity_remaining - v_take WHERE id = r.id;
    INSERT INTO public.booking_gift_lots (order_id, product_id, batch_id, quantity)
    VALUES (p_order_id, p_product_id, r.id, v_take);
    v_left := v_left - v_take;
  END LOOP;
  IF v_left > 0 THEN RAISE EXCEPTION 'Um dos brindes escolhidos já não está disponível.'; END IF;

  PERFORM set_config('app.product_reason', 'sale', true);
  PERFORM set_config('app.product_order_id', COALESCE(p_order_id::text, ''), true);
  PERFORM set_config('app.product_actor_id', COALESCE(p_actor_id::text, ''), true);
  UPDATE public.products SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - p_quantity)
   WHERE id = p_product_id;
  PERFORM set_config('app.product_reason', '', true);
END; $fn$;

-- Cancelamento: devolve cada brinde ao seu lote e avisa o agricultor.
CREATE OR REPLACE FUNCTION public.return_booking_gifts(p_order_id uuid, p_farmer_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE r record; v_lines text[] := '{}';
BEGIN
  FOR r IN
    SELECT l.quantity, l.batch_id, l.product_id, b.expires_at, b.expired_at, p.name
      FROM public.booking_gift_lots l
      LEFT JOIN public.product_stock_batches b ON b.id = l.batch_id
      LEFT JOIN public.products p ON p.id = l.product_id
     WHERE l.order_id = p_order_id
  LOOP
    IF r.batch_id IS NOT NULL AND r.product_id IS NOT NULL AND r.expired_at IS NULL
       AND r.expires_at IS NOT NULL AND r.expires_at >= public.lisbon_today() THEN
      UPDATE public.product_stock_batches SET quantity_remaining = quantity_remaining + r.quantity WHERE id = r.batch_id;
      PERFORM set_config('app.product_reason', 'restock', true);
      UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) + r.quantity WHERE id = r.product_id;
      v_lines := v_lines || (r.quantity::text || ' un. de "' || r.name || '" voltaram ao stock (validade '
                             || to_char(r.expires_at, 'DD/MM/YYYY') || ').');
    ELSE
      v_lines := v_lines || (r.quantity::text || ' un. de "' || COALESCE(r.name, 'produto') || '" não voltaram ao stock: a validade terminou'
                             || COALESCE(' a ' || to_char(r.expires_at, 'DD/MM/YYYY'), '') || '.');
    END IF;
  END LOOP;
  PERFORM set_config('app.product_reason', '', true);

  IF array_length(v_lines, 1) > 0 AND p_farmer_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
    VALUES (p_farmer_user, p_order_id, 'gift_stock_returned', 'Brindes de uma reserva cancelada',
            array_to_string(v_lines, ' '), '/agricultor/produtos');
  END IF;
END; $fn$;

-- Adicionar stock passa a exigir validade (igual a 20261010120000, com essa verificação).
CREATE OR REPLACE FUNCTION public.add_stock_batch(p_product_id uuid, p_quantity numeric, p_expires_at date DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_farmer uuid; v_new numeric;
BEGIN
  SELECT farmer_id INTO v_farmer FROM public.products WHERE id = p_product_id;
  IF v_farmer IS NULL OR NOT public.user_owns_farmer(v_farmer) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  IF p_expires_at IS NULL THEN RAISE EXCEPTION 'Indique a validade do stock.'; END IF;
  IF p_expires_at < public.lisbon_today() THEN RAISE EXCEPTION 'A validade não pode estar no passado'; END IF;
  PERFORM public.expire_stock_batches(p_product_id);
  INSERT INTO public.product_stock_batches (product_id, farmer_id, quantity_initial, quantity_remaining, expires_at)
  VALUES (p_product_id, v_farmer, p_quantity, p_quantity, p_expires_at);
  PERFORM set_config('app.product_reason', 'restock', true);
  UPDATE public.products SET stock_quantity = COALESCE(stock_quantity,0) + p_quantity
   WHERE id = p_product_id RETURNING stock_quantity INTO v_new;
  PERFORM set_config('app.product_reason', '', true);
  RETURN v_new;
END; $fn$;

-- Indicar a validade de um lote à espera: as unidades voltam ao stock à venda.
CREATE OR REPLACE FUNCTION public.set_batch_expiry(p_batch_id uuid, p_expires_at date)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_batch public.product_stock_batches%ROWTYPE; v_new numeric;
BEGIN
  SELECT * INTO v_batch FROM public.product_stock_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND OR NOT public.user_owns_farmer(v_batch.farmer_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF v_batch.expires_at IS NOT NULL OR v_batch.quantity_remaining <= 0 THEN
    RAISE EXCEPTION 'Este lote já tem validade.';
  END IF;
  IF p_expires_at IS NULL OR p_expires_at < public.lisbon_today() THEN
    RAISE EXCEPTION 'A validade não pode estar no passado';
  END IF;
  UPDATE public.product_stock_batches SET expires_at = p_expires_at WHERE id = p_batch_id;
  PERFORM set_config('app.product_reason', 'restock', true);
  UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) + v_batch.quantity_remaining
   WHERE id = v_batch.product_id RETURNING stock_quantity INTO v_new;
  PERFORM set_config('app.product_reason', '', true);
  RETURN v_new;
END; $fn$;

-- Produto criado com stock: sem validade válida, o lote fica à espera e o stock
-- à venda fica a 0 (a página Adicionar produto já cria o stock com validade).
CREATE OR REPLACE FUNCTION public.create_initial_stock_batch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_valid boolean := NEW.availability_end IS NOT NULL AND NEW.availability_end >= public.lisbon_today();
BEGIN
  IF COALESCE(NEW.stock_quantity,0) > 0 THEN
    INSERT INTO public.product_stock_batches (product_id, farmer_id, quantity_initial, quantity_remaining, expires_at)
    VALUES (NEW.id, NEW.farmer_id, NEW.stock_quantity, NEW.stock_quantity,
            CASE WHEN v_valid THEN NEW.availability_end END);
    IF NOT v_valid THEN
      PERFORM set_config('app.product_reason', 'awaiting_expiry', true);
      UPDATE public.products SET stock_quantity = 0 WHERE id = NEW.id;
      PERFORM set_config('app.product_reason', '', true);
    END IF;
  END IF;
  RETURN NEW;
END; $fn$;

-- Sem aviso de "stock esgotado" quando o stock sai à espera de validade.
CREATE OR REPLACE FUNCTION public.notify_farmer_on_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_old numeric := COALESCE(OLD.stock_quantity, 0);
  v_new numeric := COALESCE(NEW.stock_quantity, 0);
  v_threshold numeric := GREATEST(COALESCE(NEW.low_stock_threshold, 5), 0);
  v_reason text := NULLIF(current_setting('app.product_reason', true), '');
BEGIN
  IF NEW.active IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF v_new = v_old THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_user_id FROM public.farmer_details WHERE id = NEW.farmer_id;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_new <= 0 AND v_old > 0 THEN
    IF COALESCE(v_reason, '') NOT IN ('expired', 'awaiting_expiry') THEN
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        v_user_id,
        'out_of_stock',
        'Stock esgotado',
        'O produto "' || NEW.name || '" ficou sem stock. Repõe o stock para voltar a estar visível no catálogo.'
      );
    END IF;
  ELSIF v_new > 0 AND v_new <= v_threshold AND v_old > v_threshold THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      v_user_id,
      'low_stock',
      'Stock quase a acabar',
      'O produto "' || NEW.name || '" tem apenas ' || v_new::text || ' unidade(s) em stock (limite definido: ' || v_threshold::text || ').'
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deduct_stock_batches(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_gift_stock(uuid, numeric, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.return_booking_gifts(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_batch_expiry(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_batch_expiry(uuid, date) TO authenticated;

-- Stock que já existe sem validade (opção A): com uma data de fim de
-- disponibilidade futura, essa passa a ser a validade; senão sai do stock à
-- venda e fica à espera de validade, e o agricultor é avisado.
DO $do$
DECLARE
  p record;
  v_dated numeric;
  v_null numeric;
  v_untracked numeric;
  v_pending numeric;
  v_user uuid;
BEGIN
  PERFORM public.expire_stock_batches();
  FOR p IN SELECT id, farmer_id, name, stock_quantity, availability_end FROM public.products
            WHERE COALESCE(stock_quantity, 0) > 0
  LOOP
    SELECT COALESCE(sum(quantity_remaining) FILTER (WHERE expires_at IS NOT NULL), 0),
           COALESCE(sum(quantity_remaining) FILTER (WHERE expires_at IS NULL), 0)
      INTO v_dated, v_null
      FROM public.product_stock_batches WHERE product_id = p.id AND quantity_remaining > 0;
    -- Stock que nunca entrou em lotes (por exemplo, alterado diretamente).
    v_untracked := p.stock_quantity - v_dated - v_null;
    IF v_untracked > 0 THEN
      INSERT INTO public.product_stock_batches (product_id, farmer_id, quantity_initial, quantity_remaining, expires_at)
      VALUES (p.id, p.farmer_id, v_untracked, v_untracked, NULL);
    END IF;
    v_pending := v_null + GREATEST(v_untracked, 0);
    CONTINUE WHEN v_pending <= 0;

    IF p.availability_end IS NOT NULL AND p.availability_end >= public.lisbon_today() THEN
      UPDATE public.product_stock_batches SET expires_at = p.availability_end
       WHERE product_id = p.id AND expires_at IS NULL AND quantity_remaining > 0;
    ELSE
      PERFORM set_config('app.product_reason', 'awaiting_expiry', true);
      UPDATE public.products SET stock_quantity = GREATEST(0, stock_quantity - v_pending) WHERE id = p.id;
      SELECT user_id INTO v_user FROM public.farmer_details WHERE id = p.farmer_id;
      IF v_user IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (v_user, 'stock_awaiting_expiry', 'Stock sem validade',
                v_pending::text || ' un. de "' || p.name || '" saíram do stock à venda porque não têm validade. '
                  || 'Indique a validade em Os meus produtos para voltarem à venda.',
                '/agricultor/produtos');
      END IF;
    END IF;
  END LOOP;
  PERFORM set_config('app.product_reason', '', true);
END
$do$;


-- 6. Criar reserva (chamada pela Edge Function create-booking, com service_role).
CREATE OR REPLACE FUNCTION public.create_experience_booking(
  p_client uuid,
  p_experience_id uuid,
  p_date date,
  p_time text,
  p_people integer,
  p_paid_gift_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_exp public.farm_experiences%ROWTYPE;
  v_farmer_user uuid;
  v_start timestamptz;
  v_dow integer := extract(dow FROM p_date)::integer;
  v_booked_people bigint;
  v_booked_count bigint;
  v_unit numeric;
  v_exp_amount numeric;
  v_total numeric;
  v_commission numeric;
  v_free record;
  v_paid record;
  v_paid_count integer := 0;
  v_paid_ids uuid[] := ARRAY(SELECT DISTINCT unnest(COALESCE(p_paid_gift_ids, '{}')));
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_order uuid;
  v_when text;
  g record;
BEGIN
  IF p_client IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;

  SELECT * INTO v_exp FROM public.farm_experiences WHERE id = p_experience_id FOR UPDATE;
  IF NOT FOUND OR NOT v_exp.active OR NOT public.farmer_is_listed(v_exp.farmer_id) THEN
    RAISE EXCEPTION 'Esta experiência não está disponível.';
  END IF;
  SELECT user_id INTO v_farmer_user FROM public.farmer_details WHERE id = v_exp.farmer_id;
  IF v_farmer_user = p_client THEN
    RAISE EXCEPTION 'Não podes reservar uma experiência da tua própria quinta.';
  END IF;

  -- Sessão: hora definida pelo agricultor para esse dia da semana.
  IF p_time IS NULL OR p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_exp.sessions) s
     WHERE (s->>'day')::integer = v_dow AND (s->'times') ? p_time
  ) THEN
    RAISE EXCEPTION 'Esta sessão não existe.';
  END IF;
  v_start := (p_date + p_time::time) AT TIME ZONE 'Europe/Lisbon';
  IF v_start <= now() THEN RAISE EXCEPTION 'Esta sessão já começou.'; END IF;
  IF v_start > now() + interval '180 days' THEN
    RAISE EXCEPTION 'Só é possível reservar até 6 meses de antecedência.';
  END IF;

  IF p_people IS NULL OR p_people < v_exp.min_people OR p_people > v_exp.max_people THEN
    RAISE EXCEPTION 'O número de pessoas tem de estar entre % e %.', v_exp.min_people, v_exp.max_people;
  END IF;

  -- Vagas (a experiência está bloqueada com FOR UPDATE, por isso não há corridas).
  SELECT COALESCE(sum(booking_people), 0), count(*) INTO v_booked_people, v_booked_count
    FROM public.orders
   WHERE experience_id = v_exp.id AND kind = 'experience' AND booking_start = v_start
     AND status IN ('awaiting_pickup', 'delivered');
  IF v_exp.pricing_mode = 'per_group' AND v_booked_count > 0 THEN
    RAISE EXCEPTION 'Esta sessão já está reservada.';
  END IF;
  IF v_booked_people + p_people > v_exp.max_people THEN
    RAISE EXCEPTION 'Só restam % lugares nesta sessão.', greatest(v_exp.max_people - v_booked_people, 0);
  END IF;

  -- Retira lotes fora de validade antes de olhar para o stock dos brindes.
  FOR g IN SELECT product_id FROM public.experience_gifts WHERE experience_id = v_exp.id LOOP
    PERFORM public.expire_stock_batches(g.product_id);
  END LOOP;

  -- Brinde grátis: o primeiro da lista com stock.
  SELECT g2.product_id, p.name INTO v_free
    FROM public.experience_gifts g2
    JOIN public.products p ON p.id = g2.product_id
   WHERE g2.experience_id = v_exp.id AND g2.extra_price = 0
     AND p.active AND COALESCE(p.stock_quantity, 0) >= 1
   ORDER BY g2.position, g2.created_at
   LIMIT 1
   FOR UPDATE OF p;
  IF v_free.product_id IS NULL AND NOT v_exp.keep_without_gift THEN
    RAISE EXCEPTION 'Esta experiência não está disponível de momento.';
  END IF;

  v_unit := COALESCE((v_exp.day_prices->>v_dow::text)::numeric, v_exp.base_price);
  v_exp_amount := round(CASE WHEN v_exp.pricing_mode = 'per_person' THEN v_unit * p_people ELSE v_unit END, 2);
  v_total := v_exp_amount;

  -- Brindes pagos escolhidos: têm de ser desta experiência e ter stock.
  FOR v_paid IN
    SELECT g3.product_id, g3.extra_price, p.name
      FROM public.experience_gifts g3
      JOIN public.products p ON p.id = g3.product_id
     WHERE g3.experience_id = v_exp.id AND g3.extra_price > 0 AND g3.id = ANY (v_paid_ids)
       AND p.active AND COALESCE(p.stock_quantity, 0) >= 1
       FOR UPDATE OF p
  LOOP
    v_paid_count := v_paid_count + 1;
    v_total := v_total + v_paid.extra_price;
  END LOOP;
  IF v_paid_count <> coalesce(array_length(v_paid_ids, 1), 0) THEN
    RAISE EXCEPTION 'Um dos brindes escolhidos já não está disponível.';
  END IF;

  v_total := round(v_total, 2);
  v_commission := round(v_total * 0.10, 2);

  LOOP
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE pickup_code = v_code);
  END LOOP;

  INSERT INTO public.orders (
    client_id, farmer_id, total, commission_amount, farmer_amount, status, pickup_code,
    pickup_deadline, paid_at, accepted_at, scheduled_pickup_at,
    kind, experience_id, booking_start, booking_people, booking_amount
  )
  VALUES (
    p_client, v_exp.farmer_id, v_total, v_commission, v_total - v_commission, 'awaiting_pickup', v_code,
    v_start + make_interval(mins => v_exp.duration_minutes), now(), now(), v_start,
    'experience', v_exp.id, v_start, p_people, v_exp_amount
  )
  RETURNING id INTO v_order;

  INSERT INTO public.order_items (order_id, product_name, quantity, unit, unit_price, subtotal)
  VALUES (
    v_order, v_exp.title,
    CASE WHEN v_exp.pricing_mode = 'per_person' THEN p_people ELSE 1 END,
    CASE WHEN v_exp.pricing_mode = 'per_person' THEN 'pessoa' ELSE 'grupo' END,
    v_unit, v_exp_amount
  );

  IF v_free.product_id IS NOT NULL THEN
    INSERT INTO public.booking_gifts (order_id, product_id, product_name, extra_price)
    VALUES (v_order, v_free.product_id, v_free.name, 0);
    INSERT INTO public.order_items (order_id, product_name, quantity, unit, unit_price, subtotal)
    VALUES (v_order, 'Brinde: ' || v_free.name, 1, 'un', 0, 0);
    PERFORM public.consume_gift_stock(v_free.product_id, 1, v_order, p_client);
  END IF;

  FOR v_paid IN
    SELECT g4.product_id, g4.extra_price, p.name
      FROM public.experience_gifts g4 JOIN public.products p ON p.id = g4.product_id
     WHERE g4.experience_id = v_exp.id AND g4.id = ANY (v_paid_ids)
  LOOP
    INSERT INTO public.booking_gifts (order_id, product_id, product_name, extra_price)
    VALUES (v_order, v_paid.product_id, v_paid.name, v_paid.extra_price);
    INSERT INTO public.order_items (order_id, product_name, quantity, unit, unit_price, subtotal)
    VALUES (v_order, 'Brinde extra: ' || v_paid.name, 1, 'un', v_paid.extra_price, v_paid.extra_price);
    PERFORM public.consume_gift_stock(v_paid.product_id, 1, v_order, p_client);
  END LOOP;

  v_when := to_char(v_start AT TIME ZONE 'Europe/Lisbon', 'DD/MM/YYYY "às" HH24:MI');
  INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
  VALUES (p_client, v_order, 'booking_confirmed', 'Reserva confirmada',
          'A tua reserva de "' || v_exp.title || '" para ' || v_when || ' está confirmada. Mostra o QR code à chegada.',
          '/encomendas?id=' || v_order::text);
  IF v_farmer_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
    VALUES (v_farmer_user, v_order, 'new_booking', 'Nova reserva',
            'Nova reserva de "' || v_exp.title || '" para ' || v_when || ' (' || p_people || ' pessoa(s)).',
            '/agricultor/encomendas?id=' || v_order::text);
  END IF;

  RETURN jsonb_build_object('order_id', v_order, 'pickup_code', v_code, 'total', v_total);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_experience_booking(uuid, uuid, date, text, integer, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_experience_booking(uuid, uuid, date, text, integer, uuid[]) TO service_role;


-- 6b. Cancelar reserva de experiência ou alojamento (cancel-booking para o
-- cliente, order-action para o agricultor).
CREATE OR REPLACE FUNCTION public.cancel_farm_booking(p_order_id uuid, p_actor uuid, p_by text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_farmer_user uuid;
  v_title text;
  v_fee numeric := 0;
  v_farmer_share numeric := 0;
  v_refund numeric;
BEGIN
  IF p_by NOT IN ('client', 'farmer') THEN RAISE EXCEPTION 'Pedido inválido'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.kind NOT IN ('experience', 'stay') THEN RAISE EXCEPTION 'Reserva não encontrada.'; END IF;
  SELECT user_id INTO v_farmer_user FROM public.farmer_details WHERE id = v_order.farmer_id;
  IF (p_by = 'client' AND v_order.client_id <> p_actor)
     OR (p_by = 'farmer' AND v_farmer_user IS DISTINCT FROM p_actor) THEN
    RAISE EXCEPTION 'Reserva não encontrada.';
  END IF;
  IF v_order.status <> 'awaiting_pickup' THEN RAISE EXCEPTION 'Esta reserva já não pode ser cancelada.'; END IF;
  IF v_order.booking_start <= now() THEN RAISE EXCEPTION 'A reserva já começou.'; END IF;

  -- Cliente: grátis até 5 dias antes; depois retém 25% da experiência ou do alojamento
  -- (20% para o agricultor, 5% para a plataforma). Agricultor: devolução total.
  IF p_by = 'client' AND now() > v_order.booking_start - interval '5 days' THEN
    v_fee := round(v_order.booking_amount * 0.25, 2);
    v_farmer_share := round(v_order.booking_amount * 0.20, 2);
  END IF;
  v_refund := v_order.total - v_fee;

  UPDATE public.orders
     SET status = 'refunded', expired_at = now(), cancelled_by = p_by,
         cancellation_fee = v_fee, refund_amount = v_refund,
         farmer_amount = v_farmer_share, commission_amount = v_fee - v_farmer_share
   WHERE id = v_order.id;

  -- Brindes de volta ao lote de onde saíram (com a validade original).
  PERFORM public.return_booking_gifts(v_order.id, v_farmer_user);

  SELECT product_name INTO v_title FROM public.order_items WHERE order_id = v_order.id
   ORDER BY subtotal DESC LIMIT 1;
  INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
  VALUES (v_order.client_id, v_order.id, 'booking_cancelled', 'Reserva cancelada',
          CASE WHEN p_by = 'farmer'
            THEN 'O agricultor cancelou a reserva de "' || v_title || '". O valor de ' || to_char(v_refund, 'FM999990.00') || '€ foi devolvido na totalidade.'
            ELSE 'Cancelaste a reserva de "' || v_title || '". Vão ser devolvidos ' || to_char(v_refund, 'FM999990.00') || '€.'
          END,
          '/encomendas?id=' || v_order.id::text);
  IF p_by = 'client' AND v_farmer_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
    VALUES (v_farmer_user, v_order.id, 'booking_cancelled', 'Reserva cancelada pelo cliente',
            'O cliente cancelou a reserva de "' || v_title || '".'
              || CASE WHEN v_farmer_share > 0 THEN ' Recebes ' || to_char(v_farmer_share, 'FM999990.00') || '€ da taxa de cancelamento.' ELSE '' END,
            '/agricultor/encomendas?id=' || v_order.id::text);
  END IF;

  RETURN jsonb_build_object('refund_amount', v_refund, 'cancellation_fee', v_fee);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_farm_booking(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_farm_booking(uuid, uuid, text) TO service_role;


-- 7. Alojamento.
CREATE TABLE public.farm_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmer_details(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 20 AND 5000),
  media_urls text[] NOT NULL DEFAULT '{}',
  -- Preço por noite: por quarto ou por pessoa.
  pricing_mode text NOT NULL CHECK (pricing_mode IN ('per_room', 'per_person')),
  base_price numeric(10,2) NOT NULL CHECK (base_price > 0),
  -- Preço da noite que começa nesse dia da semana: {"5": 90, "6": 90}.
  day_prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Quartos/unidades iguais deste tipo e lotação de cada um.
  units_count integer NOT NULL CHECK (units_count BETWEEN 1 AND 50),
  capacity_per_unit integer NOT NULL CHECK (capacity_per_unit BETWEEN 1 AND 20),
  min_nights integer NOT NULL DEFAULT 1 CHECK (min_nights BETWEEN 1 AND 30),
  check_in_time text NOT NULL DEFAULT '15:00' CHECK (check_in_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  check_out_time text NOT NULL DEFAULT '11:00' CHECK (check_out_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  -- Registo obrigatório, mostrado ao cliente.
  registration_type text NOT NULL CHECK (registration_type IN ('AL', 'TER')),
  registration_number text NOT NULL CHECK (char_length(btrim(registration_number)) BETWEEN 2 AND 40),
  keep_without_gift boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_farm_stays_farmer ON public.farm_stays (farmer_id);

CREATE TRIGGER update_farm_stays_updated_at
BEFORE UPDATE ON public.farm_stays
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.farm_stays ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.farm_stays TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.farm_stays TO authenticated;
GRANT ALL ON public.farm_stays TO service_role;

CREATE POLICY "Anyone can view active stays"
  ON public.farm_stays FOR SELECT TO anon, authenticated
  USING ((active AND public.farmer_is_listed(farmer_id)) OR public.user_owns_farmer(farmer_id));

CREATE POLICY "Farmer manages own stays"
  ON public.farm_stays FOR ALL TO authenticated
  USING (public.user_owns_farmer(farmer_id))
  WITH CHECK (public.user_owns_farmer(farmer_id));

CREATE TABLE public.stay_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id uuid NOT NULL REFERENCES public.farm_stays(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  extra_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (extra_price >= 0),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stay_id, product_id)
);

ALTER TABLE public.stay_gifts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.stay_gifts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stay_gifts TO authenticated;
GRANT ALL ON public.stay_gifts TO service_role;

CREATE POLICY "Anyone can view gifts of visible stays"
  ON public.stay_gifts FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.farm_stays s WHERE s.id = stay_id));

CREATE POLICY "Farmer manages own stay gifts"
  ON public.stay_gifts FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.farm_stays s
     WHERE s.id = stay_id AND public.user_owns_farmer(s.farmer_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.farm_stays s
      JOIN public.products p ON p.id = product_id AND p.farmer_id = s.farmer_id
     WHERE s.id = stay_id AND public.user_owns_farmer(s.farmer_id)
  ));

-- Datas fechadas pelo agricultor (noites de start_date a end_date, inclusive).
CREATE TABLE public.stay_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id uuid NOT NULL REFERENCES public.farm_stays(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

ALTER TABLE public.stay_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Públicas, para o calendário do cliente.
GRANT SELECT ON public.stay_blocked_dates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stay_blocked_dates TO authenticated;
GRANT ALL ON public.stay_blocked_dates TO service_role;

CREATE POLICY "Anyone can view blocked dates of visible stays"
  ON public.stay_blocked_dates FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.farm_stays s WHERE s.id = stay_id));

CREATE POLICY "Farmer manages own blocked dates"
  ON public.stay_blocked_dates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farm_stays s WHERE s.id = stay_id AND public.user_owns_farmer(s.farmer_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.farm_stays s WHERE s.id = stay_id AND public.user_owns_farmer(s.farmer_id)));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stay_id uuid REFERENCES public.farm_stays(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_stay ON public.orders (stay_id, booking_start);

GRANT SELECT (stay_id) ON public.orders TO authenticated;

-- Quartos ocupados por noite (só contagens, por isso é pública).
CREATE OR REPLACE FUNCTION public.stay_booked_units(p_stay_id uuid, p_from date, p_to date)
RETURNS TABLE (night date, units bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT d::date, COALESCE(sum(o.booking_units), 0)
    FROM generate_series(p_from, p_to - 1, interval '1 day') d
    JOIN public.orders o
      ON o.stay_id = p_stay_id AND o.kind = 'stay'
     AND o.status IN ('awaiting_pickup', 'delivered')
     AND (o.booking_start AT TIME ZONE 'Europe/Lisbon')::date <= d::date
     AND (o.booking_end AT TIME ZONE 'Europe/Lisbon')::date > d::date
   WHERE p_to > p_from AND p_to - p_from <= 400
   GROUP BY d
$$;

REVOKE EXECUTE ON FUNCTION public.stay_booked_units(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stay_booked_units(uuid, date, date) TO anon, authenticated, service_role;

-- Criar reserva de alojamento (Edge Function create-stay-booking, com service_role).
CREATE OR REPLACE FUNCTION public.create_stay_booking(
  p_client uuid,
  p_stay_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_units integer,
  p_paid_gift_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stay public.farm_stays%ROWTYPE;
  v_farmer_user uuid;
  v_nights integer := p_check_out - p_check_in;
  v_start timestamptz;
  v_end timestamptz;
  v_night date;
  v_used bigint;
  v_amount numeric := 0;
  v_total numeric;
  v_commission numeric;
  v_free record;
  v_paid record;
  v_paid_count integer := 0;
  v_paid_ids uuid[] := ARRAY(SELECT DISTINCT unnest(COALESCE(p_paid_gift_ids, '{}')));
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_order uuid;
  v_when text;
  g record;
BEGIN
  IF p_client IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;

  SELECT * INTO v_stay FROM public.farm_stays WHERE id = p_stay_id FOR UPDATE;
  IF NOT FOUND OR NOT v_stay.active OR NOT public.farmer_is_listed(v_stay.farmer_id) THEN
    RAISE EXCEPTION 'Este alojamento não está disponível.';
  END IF;
  SELECT user_id INTO v_farmer_user FROM public.farmer_details WHERE id = v_stay.farmer_id;
  IF v_farmer_user = p_client THEN
    RAISE EXCEPTION 'Não podes reservar o alojamento da tua própria quinta.';
  END IF;

  IF p_check_in IS NULL OR p_check_out IS NULL OR v_nights < 1 THEN
    RAISE EXCEPTION 'A data de saída tem de ser depois da data de entrada.';
  END IF;
  IF p_check_in < public.lisbon_today() THEN RAISE EXCEPTION 'A data de entrada já passou.'; END IF;
  IF p_check_in > public.lisbon_today() + 365 THEN RAISE EXCEPTION 'Só é possível reservar até um ano de antecedência.'; END IF;
  IF v_nights < v_stay.min_nights THEN
    RAISE EXCEPTION 'A estadia mínima é de % noite(s).', v_stay.min_nights;
  END IF;
  IF v_nights > 60 THEN RAISE EXCEPTION 'A estadia máxima é de 60 noites.'; END IF;
  IF p_units IS NULL OR p_units < 1 OR p_units > v_stay.units_count THEN
    RAISE EXCEPTION 'O número de quartos tem de estar entre 1 e %.', v_stay.units_count;
  END IF;
  IF p_guests IS NULL OR p_guests < 1 OR p_guests > p_units * v_stay.capacity_per_unit THEN
    RAISE EXCEPTION 'Para % quarto(s), o máximo é de % hóspedes.', p_units, p_units * v_stay.capacity_per_unit;
  END IF;

  v_start := (p_check_in + v_stay.check_in_time::time) AT TIME ZONE 'Europe/Lisbon';
  v_end := (p_check_out + v_stay.check_out_time::time) AT TIME ZONE 'Europe/Lisbon';
  IF v_start <= now() THEN RAISE EXCEPTION 'A hora de entrada de hoje já passou.'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.stay_blocked_dates b
     WHERE b.stay_id = v_stay.id AND b.start_date < p_check_out AND b.end_date >= p_check_in
  ) THEN
    RAISE EXCEPTION 'O alojamento está fechado em parte destas datas.';
  END IF;

  -- Disponibilidade e preço, noite a noite (alojamento bloqueado com FOR UPDATE).
  FOR v_night IN SELECT d::date FROM generate_series(p_check_in, p_check_out - 1, interval '1 day') d LOOP
    SELECT COALESCE(sum(booking_units), 0) INTO v_used
      FROM public.orders
     WHERE stay_id = v_stay.id AND kind = 'stay' AND status IN ('awaiting_pickup', 'delivered')
       AND (booking_start AT TIME ZONE 'Europe/Lisbon')::date <= v_night
       AND (booking_end AT TIME ZONE 'Europe/Lisbon')::date > v_night;
    IF v_used + p_units > v_stay.units_count THEN
      RAISE EXCEPTION 'Não há quartos suficientes livres na noite de %.', to_char(v_night, 'DD/MM/YYYY');
    END IF;
    v_amount := v_amount
      + COALESCE((v_stay.day_prices->>extract(dow FROM v_night)::integer::text)::numeric, v_stay.base_price)
        * CASE WHEN v_stay.pricing_mode = 'per_person' THEN p_guests ELSE p_units END;
  END LOOP;
  v_amount := round(v_amount, 2);
  v_total := v_amount;

  FOR g IN SELECT product_id FROM public.stay_gifts WHERE stay_id = v_stay.id LOOP
    PERFORM public.expire_stock_batches(g.product_id);
  END LOOP;

  SELECT g2.product_id, p.name INTO v_free
    FROM public.stay_gifts g2
    JOIN public.products p ON p.id = g2.product_id
   WHERE g2.stay_id = v_stay.id AND g2.extra_price = 0
     AND p.active AND COALESCE(p.stock_quantity, 0) >= 1
   ORDER BY g2.position, g2.created_at
   LIMIT 1
   FOR UPDATE OF p;
  IF v_free.product_id IS NULL AND NOT v_stay.keep_without_gift THEN
    RAISE EXCEPTION 'Este alojamento não está disponível de momento.';
  END IF;

  FOR v_paid IN
    SELECT g3.product_id, g3.extra_price, p.name
      FROM public.stay_gifts g3
      JOIN public.products p ON p.id = g3.product_id
     WHERE g3.stay_id = v_stay.id AND g3.extra_price > 0 AND g3.id = ANY (v_paid_ids)
       AND p.active AND COALESCE(p.stock_quantity, 0) >= 1
       FOR UPDATE OF p
  LOOP
    v_paid_count := v_paid_count + 1;
    v_total := v_total + v_paid.extra_price;
  END LOOP;
  IF v_paid_count <> coalesce(array_length(v_paid_ids, 1), 0) THEN
    RAISE EXCEPTION 'Um dos brindes escolhidos já não está disponível.';
  END IF;

  v_total := round(v_total, 2);
  v_commission := round(v_total * 0.10, 2);

  LOOP
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE pickup_code = v_code);
  END LOOP;

  INSERT INTO public.orders (
    client_id, farmer_id, total, commission_amount, farmer_amount, status, pickup_code,
    pickup_deadline, paid_at, accepted_at, scheduled_pickup_at,
    kind, stay_id, booking_start, booking_end, booking_people, booking_units, booking_amount
  )
  VALUES (
    p_client, v_stay.farmer_id, v_total, v_commission, v_total - v_commission, 'awaiting_pickup', v_code,
    v_end, now(), now(), v_start,
    'stay', v_stay.id, v_start, v_end, p_guests, p_units, v_amount
  )
  RETURNING id INTO v_order;

  INSERT INTO public.order_items (order_id, product_name, quantity, unit, unit_price, subtotal)
  VALUES (v_order, v_stay.title, v_nights, 'noite', round(v_amount / v_nights, 2), v_amount);

  IF v_free.product_id IS NOT NULL THEN
    INSERT INTO public.booking_gifts (order_id, product_id, product_name, extra_price)
    VALUES (v_order, v_free.product_id, v_free.name, 0);
    INSERT INTO public.order_items (order_id, product_name, quantity, unit, unit_price, subtotal)
    VALUES (v_order, 'Brinde: ' || v_free.name, 1, 'un', 0, 0);
    PERFORM public.consume_gift_stock(v_free.product_id, 1, v_order, p_client);
  END IF;

  FOR v_paid IN
    SELECT g4.product_id, g4.extra_price, p.name
      FROM public.stay_gifts g4 JOIN public.products p ON p.id = g4.product_id
     WHERE g4.stay_id = v_stay.id AND g4.id = ANY (v_paid_ids)
  LOOP
    INSERT INTO public.booking_gifts (order_id, product_id, product_name, extra_price)
    VALUES (v_order, v_paid.product_id, v_paid.name, v_paid.extra_price);
    INSERT INTO public.order_items (order_id, product_name, quantity, unit, unit_price, subtotal)
    VALUES (v_order, 'Brinde extra: ' || v_paid.name, 1, 'un', v_paid.extra_price, v_paid.extra_price);
    PERFORM public.consume_gift_stock(v_paid.product_id, 1, v_order, p_client);
  END LOOP;

  v_when := to_char(p_check_in, 'DD/MM/YYYY') || ' a ' || to_char(p_check_out, 'DD/MM/YYYY');
  INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
  VALUES (p_client, v_order, 'booking_confirmed', 'Reserva confirmada',
          'A tua reserva de "' || v_stay.title || '" de ' || v_when || ' está confirmada. Mostra o QR code no check-in.',
          '/encomendas?id=' || v_order::text);
  IF v_farmer_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
    VALUES (v_farmer_user, v_order, 'new_booking', 'Nova reserva de alojamento',
            'Nova reserva de "' || v_stay.title || '" de ' || v_when || ' (' || p_guests || ' hóspede(s), ' || p_units || ' quarto(s)).',
            '/agricultor/encomendas?id=' || v_order::text);
  END IF;

  RETURN jsonb_build_object('order_id', v_order, 'pickup_code', v_code, 'total', v_total);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_stay_booking(uuid, uuid, date, date, integer, integer, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_stay_booking(uuid, uuid, date, date, integer, integer, uuid[]) TO service_role;


-- 8. Avaliações: quem cancela a própria reserva não avalia como "cancelada".
-- Igual a 20261110120000_review_photos.sql, com essa verificação.
CREATE OR REPLACE FUNCTION public.submit_farmer_review(
  p_order_id uuid,
  p_rating integer,
  p_comment text DEFAULT NULL,
  p_show_photo boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_user uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_context text;
  v_full_name text;
  v_avatar text;
  v_photo text;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Escolhe uma avaliação de 1 a 5 estrelas.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.client_id <> v_user THEN
    RAISE EXCEPTION 'Encomenda não encontrada.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.farmer_reviews WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Esta encomenda já foi avaliada.';
  END IF;

  v_context := public.order_review_context(
    v_order.status, v_order.delivery_address, v_order.expected_delivery_at, v_order.pickup_deadline
  );
  IF v_context IS NULL OR v_order.cancelled_by = 'client' THEN
    RAISE EXCEPTION 'Esta encomenda ainda não pode ser avaliada.';
  END IF;

  SELECT full_name, avatar_url INTO v_full_name, v_avatar
    FROM public.profiles WHERE id = v_user;
  IF COALESCE(p_show_photo, false) AND public.is_own_avatar_path(v_user, v_avatar) THEN
    v_photo := v_avatar;
  END IF;

  INSERT INTO public.farmer_reviews
    (order_id, farmer_id, client_id, rating, comment, reviewer_name, context, show_photo, reviewer_photo_path)
  VALUES (
    p_order_id, v_order.farmer_id, v_user, p_rating,
    NULLIF(btrim(left(COALESCE(p_comment, ''), 1000)), ''),
    public.reviewer_display_name(v_full_name), v_context,
    v_photo IS NOT NULL, v_photo
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$fn$;


-- 9. Pontuação de atividade: igual a 20261003150000_farmer_activity.sql, mas sem
-- contar contra o agricultor os cancelamentos feitos pelo cliente.
CREATE OR REPLACE FUNCTION public.compute_farmer_activity()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := public.today_lisbon();
  v_since timestamptz := now() - interval '30 days';
  v_count integer;
BEGIN
  WITH f AS (
    SELECT fd.id AS farmer_id, fd.user_id, fd.paused_until, fd.initial_score,
           fd.verification_status
      FROM public.farmer_details fd
     WHERE fd.registration_step = 2
  ),
  prod AS (
    SELECT p.farmer_id,
           count(*) FILTER (WHERE p.active) AS active_count,
           count(*) FILTER (WHERE p.active AND COALESCE(p.stock_quantity, 0) > 0) AS in_stock_count,
           count(*) FILTER (
             WHERE p.active
               AND (p.availability_start IS NULL OR p.availability_start <= v_today)
               AND (p.availability_end IS NULL OR p.availability_end >= v_today)
           ) AS in_season_count,
           count(*) FILTER (
             WHERE p.active AND COALESCE(p.stock_quantity, 0) > 0
               AND (p.availability_start IS NULL OR p.availability_start <= v_today)
               AND (p.availability_end IS NULL OR p.availability_end >= v_today)
           ) AS sellable_count,
           max(p.created_at) AS last_created
      FROM public.products p
     GROUP BY p.farmer_id
  ),
  -- Ações do próprio agricultor (as vendas são automáticas e não contam).
  hist AS (
    SELECT h.farmer_id, max(h.created_at) AS last_edit,
           count(*) FILTER (WHERE h.created_at >= v_since) AS edits_30d
      FROM public.product_history h
      JOIN f ON f.farmer_id = h.farmer_id
     WHERE h.event_type <> 'sale' AND h.actor_id = f.user_id
     GROUP BY h.farmer_id
  ),
  ord AS (
    SELECT o.farmer_id,
           count(*) AS total,
           -- Cancelamentos feitos pelo cliente (reservas) não contam contra o agricultor.
           count(*) FILTER (WHERE o.status = 'refunded' AND o.cancelled_by IS DISTINCT FROM 'client') AS refunded,
           count(*) FILTER (WHERE o.status = 'awaiting_pickup' AND o.accepted_at IS NULL) AS pending,
           percentile_cont(0.5) WITHIN GROUP (
             ORDER BY extract(epoch FROM (
               COALESCE(o.accepted_at, o.delivered_at, o.expired_at, now()) - o.created_at
             )) / 3600.0
           ) FILTER (WHERE o.status <> 'refunded') AS median_hours,
           max(o.accepted_at) AS last_accept
      FROM public.orders o
     WHERE o.created_at >= v_since AND o.status <> 'pending_payment'
     GROUP BY o.farmer_id
  ),
  -- Só contam mensagens com mais de 24 h (as recentes ainda podem ser respondidas).
  chat AS (
    SELECT o.farmer_id,
           count(*) AS client_msgs,
           count(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM public.order_chat_messages r
              WHERE r.order_id = m.order_id
                AND r.sender_role = 'agricultor'
                AND r.created_at > m.created_at
                AND r.created_at <= m.created_at + interval '24 hours'
           )) AS answered
      FROM public.order_chat_messages m
      JOIN public.orders o ON o.id = m.order_id
     WHERE m.sender_role = 'cliente'
       AND m.created_at >= v_since
       AND m.created_at <= now() - interval '24 hours'
     GROUP BY o.farmer_id
  ),
  last_reply AS (
    SELECT o.farmer_id, max(m.created_at) AS last_msg
      FROM public.order_chat_messages m
      JOIN public.orders o ON o.id = m.order_id
     WHERE m.sender_role = 'agricultor'
     GROUP BY o.farmer_id
  ),
  -- Semanas (ISO) com pelo menos uma ação, no último ano.
  acts AS (
    SELECT DISTINCT farmer_id, date_trunc('week', ts) AS wk FROM (
      SELECT h.farmer_id, h.created_at AS ts
        FROM public.product_history h JOIN f ON f.farmer_id = h.farmer_id
       WHERE h.event_type <> 'sale' AND h.actor_id = f.user_id
      UNION ALL
      SELECT o.farmer_id, o.accepted_at FROM public.orders o WHERE o.accepted_at IS NOT NULL
      UNION ALL
      SELECT p.farmer_id, p.created_at FROM public.products p
    ) a
    WHERE ts >= now() - interval '52 weeks'
  ),
  -- Semanas consecutivas partilham a mesma âncora (gaps-and-islands).
  islands AS (
    SELECT farmer_id,
           wk + (row_number() OVER (PARTITION BY farmer_id ORDER BY wk DESC) - 1) * interval '1 week' AS anchor
      FROM acts
  ),
  streak AS (
    SELECT i.farmer_id, count(*)::smallint AS weeks
      FROM islands i
     WHERE i.anchor = (SELECT max(j.anchor) FROM islands j WHERE j.farmer_id = i.farmer_id)
       AND i.anchor >= date_trunc('week', now()) - interval '1 week'
     GROUP BY i.farmer_id
  ),
  parts AS (
    SELECT f.farmer_id, f.paused_until, f.initial_score, f.verification_status,
           COALESCE(prod.active_count, 0) AS active_count,
           COALESCE(prod.in_stock_count, 0) AS in_stock_count,
           COALESCE(prod.in_season_count, 0) AS in_season_count,
           COALESCE(prod.sellable_count, 0) AS sellable_count,
           GREATEST(hist.last_edit, prod.last_created) AS last_catalog,
           COALESCE(hist.edits_30d, 0) AS edits_30d,
           ord.total AS orders_total, ord.refunded AS orders_refunded,
           COALESCE(ord.pending, 0) AS orders_pending, ord.median_hours,
           chat.client_msgs, chat.answered,
           GREATEST(hist.last_edit, prod.last_created, ord.last_accept, last_reply.last_msg) AS last_action_at,
           COALESCE(streak.weeks, 0) AS streak_weeks
      FROM f
      LEFT JOIN prod ON prod.farmer_id = f.farmer_id
      LEFT JOIN hist ON hist.farmer_id = f.farmer_id
      LEFT JOIN ord ON ord.farmer_id = f.farmer_id
      LEFT JOIN chat ON chat.farmer_id = f.farmer_id
      LEFT JOIN last_reply ON last_reply.farmer_id = f.farmer_id
      LEFT JOIN streak ON streak.farmer_id = f.farmer_id
  ),
  scored AS (
    SELECT p.*,
           CASE WHEN p.last_catalog IS NULL THEN NULL
                ELSE extract(epoch FROM now() - p.last_catalog) / 86400.0 END AS days_since_update,
           -- catálogo: sempre avaliado (sem produtos = 0)
           CASE WHEN p.last_catalog IS NULL THEN 0
                ELSE 0.75 * LEAST(1, GREATEST(0, (45 - extract(epoch FROM now() - p.last_catalog) / 86400.0) / 38.0))
                   + 0.25 * CASE WHEN p.active_count > 0 THEN p.in_stock_count::numeric / p.active_count ELSE 0 END
           END AS s_catalog,
           CASE WHEN COALESCE(p.orders_total, 0) = 0 THEN NULL
                ELSE 0.7 * CASE WHEN p.median_hours IS NULL THEN 1
                                ELSE LEAST(1, GREATEST(0, (48 - p.median_hours) / 46.0)) END
                   + 0.3 * (1 - p.orders_refunded::numeric / p.orders_total)
           END AS s_orders,
           CASE WHEN COALESCE(p.client_msgs, 0) = 0 THEN NULL
                ELSE p.answered::numeric / p.client_msgs END AS s_chat,
           CASE WHEN p.paused_until IS NOT NULL AND p.paused_until > v_today THEN 'paused'
                WHEN p.active_count > 0 AND p.in_season_count = 0 THEN 'off_season'
           END AS exempt_reason
      FROM parts p
  ),
  final AS (
    SELECT s.*,
           round(100 * (
             40 * s.s_catalog + COALESCE(40 * s.s_orders, 0) + COALESCE(20 * s.s_chat, 0)
           ) / (40 + CASE WHEN s.s_orders IS NULL THEN 0 ELSE 40 END
                   + CASE WHEN s.s_chat IS NULL THEN 0 ELSE 20 END))::smallint AS score
      FROM scored s
  )
  INSERT INTO public.farmer_activity AS fa
    (farmer_id, score, level, components, last_action_at, streak_weeks, exempt_reason, computed_at)
  SELECT farmer_id,
         score,
         CASE WHEN score >= 90 THEN 'pomar' WHEN score >= 70 THEN 'colheita'
              WHEN score >= 40 THEN 'rebento' ELSE 'semente' END,
         jsonb_build_object(
           'catalog', jsonb_build_object(
             'score', round(s_catalog * 100),
             'days_since_update', round(days_since_update),
             'active_products', active_count,
             'in_stock_products', in_stock_count,
             'sellable_products', sellable_count,
             'edits_30d', edits_30d),
           'orders', jsonb_build_object(
             'score', round(s_orders * 100),
             'total', COALESCE(orders_total, 0),
             'refunded', COALESCE(orders_refunded, 0),
             'pending', orders_pending,
             'median_hours', round(median_hours::numeric, 1)),
           'chat', jsonb_build_object(
             'score', round(s_chat * 100),
             'client_messages', COALESCE(client_msgs, 0),
             'answered', COALESCE(answered, 0))
         ),
         last_action_at, streak_weeks, exempt_reason, now()
    FROM final
  ON CONFLICT (farmer_id) DO UPDATE SET
    previous_level = fa.level,
    -- Isento (pausa / fora de época): a pontuação fica congelada.
    score = CASE WHEN EXCLUDED.exempt_reason IS NULL THEN EXCLUDED.score ELSE fa.score END,
    level = CASE WHEN EXCLUDED.exempt_reason IS NULL THEN EXCLUDED.level ELSE fa.level END,
    components = CASE WHEN EXCLUDED.exempt_reason IS NULL THEN EXCLUDED.components ELSE fa.components END,
    streak_weeks = CASE WHEN EXCLUDED.exempt_reason IS NULL THEN EXCLUDED.streak_weeks ELSE fa.streak_weeks END,
    last_action_at = EXCLUDED.last_action_at,
    exempt_reason = EXCLUDED.exempt_reason,
    computed_at = EXCLUDED.computed_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Destaques da página inicial: top 6 por atividade + certificados, entre
  -- agricultores verificados, não pausados, com algo à venda hoje e com pelo
  -- menos nível Rebento (≥ 40) — os certificados sozinhos não chegam para
  -- destacar um agricultor parado.
  WITH eligible AS (
    SELECT fa.farmer_id,
           row_number() OVER (
             ORDER BY fa.score + COALESCE(fd.initial_score, 0) DESC, fa.last_action_at DESC NULLS LAST
           ) AS rnk
      FROM public.farmer_activity fa
      JOIN public.farmer_details fd ON fd.id = fa.farmer_id
     WHERE fd.registration_step = 2
       AND fd.verification_status = 'verified'
       AND fa.score >= 40
       AND (fd.paused_until IS NULL OR fd.paused_until <= v_today)
       AND EXISTS (
         SELECT 1 FROM public.products p
          WHERE p.farmer_id = fa.farmer_id AND p.active AND COALESCE(p.stock_quantity, 0) > 0
            AND (p.availability_start IS NULL OR p.availability_start <= v_today)
            AND (p.availability_end IS NULL OR p.availability_end >= v_today)
       )
  )
  UPDATE public.farmer_activity fa SET
    featured_rank = CASE WHEN e.rnk <= 6 THEN e.rnk END,
    featured_since = CASE
      WHEN e.rnk <= 6 THEN COALESCE(fa.featured_since, now())
      ELSE NULL END
    FROM (
      SELECT fa2.farmer_id, e2.rnk
        FROM public.farmer_activity fa2
        LEFT JOIN eligible e2 ON e2.farmer_id = fa2.farmer_id
    ) e
   WHERE e.farmer_id = fa.farmer_id;

  RETURN v_count;
END;
$$;


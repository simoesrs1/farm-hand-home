CREATE TABLE public.product_stock_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL,
  quantity_initial numeric NOT NULL CHECK (quantity_initial > 0),
  quantity_remaining numeric NOT NULL CHECK (quantity_remaining >= 0),
  expires_at date,
  added_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expired_at timestamptz
);
CREATE INDEX idx_psb_product ON public.product_stock_batches(product_id, added_at);
GRANT SELECT ON public.product_stock_batches TO authenticated;
GRANT ALL ON public.product_stock_batches TO service_role;
ALTER TABLE public.product_stock_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farmer views own batches" ON public.product_stock_batches FOR SELECT TO authenticated USING (public.user_owns_farmer(farmer_id));

-- Backfill: stock existente vira um lote
INSERT INTO public.product_stock_batches (product_id, farmer_id, quantity_initial, quantity_remaining, expires_at, added_at)
SELECT id, farmer_id, stock_quantity, stock_quantity, availability_end, updated_at
FROM public.products WHERE COALESCE(stock_quantity,0) > 0;

CREATE OR REPLACE FUNCTION public.lisbon_today() RETURNS date LANGUAGE sql STABLE SET search_path TO 'public'
AS $$ SELECT (now() AT TIME ZONE 'Europe/Lisbon')::date $$;

CREATE OR REPLACE FUNCTION public.deduct_stock_batches(p_product_id uuid, p_qty numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; v_left numeric := p_qty; v_take numeric;
BEGIN
  FOR r IN SELECT id, quantity_remaining FROM public.product_stock_batches
    WHERE product_id = p_product_id AND quantity_remaining > 0
      AND (expires_at IS NULL OR expires_at >= public.lisbon_today())
    ORDER BY added_at, id FOR UPDATE
  LOOP
    EXIT WHEN v_left <= 0;
    v_take := LEAST(r.quantity_remaining, v_left);
    UPDATE public.product_stock_batches SET quantity_remaining = quantity_remaining - v_take WHERE id = r.id;
    v_left := v_left - v_take;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.expire_stock_batches(p_product_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; v_count integer := 0; v_user uuid;
BEGIN
  FOR r IN
    WITH exp AS (
      UPDATE public.product_stock_batches b
         SET quantity_remaining = 0, expired_at = now()
        FROM (SELECT id, quantity_remaining AS q FROM public.product_stock_batches
               WHERE quantity_remaining > 0 AND expires_at IS NOT NULL
                 AND expires_at < public.lisbon_today()
                 AND (p_product_id IS NULL OR product_id = p_product_id)
               FOR UPDATE) old
       WHERE b.id = old.id
      RETURNING b.product_id, old.q
    )
    SELECT product_id, SUM(q) AS qty FROM exp GROUP BY product_id
  LOOP
    PERFORM set_config('app.product_reason', 'expired', true);
    UPDATE public.products SET stock_quantity = GREATEST(0, COALESCE(stock_quantity,0) - r.qty)
     WHERE id = r.product_id;
    SELECT fd.user_id INTO v_user FROM public.products p JOIN public.farmer_details fd ON fd.id = p.farmer_id WHERE p.id = r.product_id;
    IF v_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message)
      SELECT v_user, 'stock_expired', 'Stock fora de validade',
             r.qty::text || ' unidade(s) de "' || p.name || '" passaram a validade e foram retiradas do stock.'
        FROM public.products p WHERE p.id = r.product_id;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.add_stock_batch(p_product_id uuid, p_quantity numeric, p_expires_at date DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_farmer uuid; v_new numeric;
BEGIN
  SELECT farmer_id INTO v_farmer FROM public.products WHERE id = p_product_id;
  IF v_farmer IS NULL OR NOT public.user_owns_farmer(v_farmer) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at < public.lisbon_today() THEN RAISE EXCEPTION 'A validade não pode estar no passado'; END IF;
  PERFORM public.expire_stock_batches(p_product_id);
  INSERT INTO public.product_stock_batches (product_id, farmer_id, quantity_initial, quantity_remaining, expires_at)
  VALUES (p_product_id, v_farmer, p_quantity, p_quantity, p_expires_at);
  PERFORM set_config('app.product_reason', 'restock', true);
  UPDATE public.products SET stock_quantity = COALESCE(stock_quantity,0) + p_quantity
   WHERE id = p_product_id RETURNING stock_quantity INTO v_new;
  RETURN v_new;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_stock_fifo(p_product_id uuid, p_quantity numeric)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_farmer uuid; v_new numeric;
BEGIN
  SELECT farmer_id INTO v_farmer FROM public.products WHERE id = p_product_id;
  IF v_farmer IS NULL OR NOT public.user_owns_farmer(v_farmer) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  PERFORM public.deduct_stock_batches(p_product_id, p_quantity);
  UPDATE public.products SET stock_quantity = GREATEST(0, COALESCE(stock_quantity,0) - p_quantity)
   WHERE id = p_product_id RETURNING stock_quantity INTO v_new;
  RETURN v_new;
END; $$;

CREATE OR REPLACE FUNCTION public.consume_product_stock(p_product_id uuid, p_quantity numeric, p_order_id uuid, p_actor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.expire_stock_batches(p_product_id);
  PERFORM public.deduct_stock_batches(p_product_id, p_quantity);
  PERFORM set_config('app.product_reason', 'sale', true);
  PERFORM set_config('app.product_order_id', COALESCE(p_order_id::text, ''), true);
  PERFORM set_config('app.product_actor_id', COALESCE(p_actor_id::text, ''), true);
  UPDATE public.products SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
   WHERE id = p_product_id AND stock_quantity IS NOT NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.create_initial_stock_batch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF COALESCE(NEW.stock_quantity,0) > 0 THEN
    INSERT INTO public.product_stock_batches (product_id, farmer_id, quantity_initial, quantity_remaining, expires_at)
    VALUES (NEW.id, NEW.farmer_id, NEW.stock_quantity, NEW.stock_quantity, NEW.availability_end);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_initial_stock_batch AFTER INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.create_initial_stock_batch();

REVOKE EXECUTE ON FUNCTION public.deduct_stock_batches(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_product_stock(uuid, numeric, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stock_batches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_stock_batches(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.add_stock_batch(uuid, numeric, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_stock_batch(uuid, numeric, date) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_stock_fifo(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_stock_fifo(uuid, numeric) TO authenticated;
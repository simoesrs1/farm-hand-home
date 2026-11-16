-- Lotes nas vendas de produtos.
--
-- Cada venda passa a registar de que lote saíram as unidades
-- (order_lot_allocations):
--   * modo automático (normal): na compra, sai do lote com a validade mais
--     próxima, e fica registado o lote;
--   * "Escolher o lote em cada venda" (products.choose_lot_on_sale): na compra só
--     desce o stock à venda; as unidades ficam à espera de lote (batch_id NULL)
--     até o agricultor indicar os lotes depois de validar o QR code
--     (allocate_order_lots). Só aí descem os lotes.
-- Encomenda de produtos que não chega a ser entregue (expirada ou devolvida): as
-- unidades à espera de lote voltam ao stock à venda; as já tiradas de um lote
-- voltam a esse lote se a validade não tiver passado. O agricultor é avisado.
-- Encomendas anteriores a esta migração não têm registo e não devolvem stock.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS choose_lot_on_sale boolean NOT NULL DEFAULT false;

GRANT SELECT (choose_lot_on_sale) ON public.products TO anon, authenticated;
GRANT INSERT (choose_lot_on_sale), UPDATE (choose_lot_on_sale) ON public.products TO authenticated;

CREATE TABLE public.order_lot_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  -- NULL = vendido, à espera de o agricultor indicar o lote.
  batch_id uuid REFERENCES public.product_stock_batches(id) ON DELETE SET NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_lot_allocations_order ON public.order_lot_allocations (order_id);
CREATE INDEX idx_order_lot_allocations_pending ON public.order_lot_allocations (product_id) WHERE batch_id IS NULL;

ALTER TABLE public.order_lot_allocations ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.order_lot_allocations TO authenticated;
GRANT ALL ON public.order_lot_allocations TO service_role;

-- Só o agricultor dono do produto; escrita só pelas funções abaixo.
CREATE POLICY "Farmer views own lot allocations"
  ON public.order_lot_allocations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND public.user_owns_farmer(p.farmer_id)
  ));


-- Venda (create-order). Igual a 20261010120000, mas regista os lotes e respeita
-- "Escolher o lote em cada venda". Ordem: validade mais próxima (20261116120000).
CREATE OR REPLACE FUNCTION public.consume_product_stock(p_product_id uuid, p_quantity numeric, p_order_id uuid, p_actor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_choose boolean;
  r record;
  v_left numeric := p_quantity;
  v_take numeric;
BEGIN
  SELECT choose_lot_on_sale INTO v_choose FROM public.products WHERE id = p_product_id;
  PERFORM public.expire_stock_batches(p_product_id);

  IF COALESCE(v_choose, false) THEN
    INSERT INTO public.order_lot_allocations (order_id, product_id, batch_id, quantity)
    VALUES (p_order_id, p_product_id, NULL, p_quantity);
  ELSE
    FOR r IN SELECT id, quantity_remaining FROM public.product_stock_batches
      WHERE product_id = p_product_id AND quantity_remaining > 0
        AND expires_at IS NOT NULL AND expires_at >= public.lisbon_today()
      ORDER BY expires_at, added_at, id FOR UPDATE
    LOOP
      EXIT WHEN v_left <= 0;
      v_take := LEAST(r.quantity_remaining, v_left);
      UPDATE public.product_stock_batches SET quantity_remaining = quantity_remaining - v_take WHERE id = r.id;
      IF p_order_id IS NOT NULL THEN
        INSERT INTO public.order_lot_allocations (order_id, product_id, batch_id, quantity)
        VALUES (p_order_id, p_product_id, r.id, v_take);
      END IF;
      v_left := v_left - v_take;
    END LOOP;
  END IF;

  PERFORM set_config('app.product_reason', 'sale', true);
  PERFORM set_config('app.product_order_id', COALESCE(p_order_id::text, ''), true);
  PERFORM set_config('app.product_actor_id', COALESCE(p_actor_id::text, ''), true);
  UPDATE public.products SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
   WHERE id = p_product_id AND stock_quantity IS NOT NULL;
  PERFORM set_config('app.product_reason', '', true);
END; $fn$;

REVOKE EXECUTE ON FUNCTION public.consume_product_stock(uuid, numeric, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_product_stock(uuid, numeric, uuid, uuid) TO service_role;


-- O agricultor indica os lotes das unidades vendidas (depois do QR code).
-- p_allocations: [{"product_id": "...", "batch_id": "...", "quantity": 2}, ...]
CREATE OR REPLACE FUNCTION public.allocate_order_lots(p_order_id uuid, p_allocations jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_order public.orders%ROWTYPE;
  v_pending record;
  v_given numeric;
  a record;
  v_batch public.product_stock_batches%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR NOT public.user_owns_farmer(v_order.farmer_id) THEN RAISE EXCEPTION 'Encomenda não encontrada.'; END IF;
  IF v_order.status <> 'delivered' THEN RAISE EXCEPTION 'Indique os lotes depois de validar a entrega.'; END IF;
  IF p_allocations IS NULL OR jsonb_typeof(p_allocations) <> 'array' THEN RAISE EXCEPTION 'Lotes inválidos.'; END IF;

  -- Cada produto à espera tem de ficar com o total exato.
  FOR v_pending IN
    SELECT l.product_id, sum(l.quantity) AS qty, max(p.name) AS name
      FROM public.order_lot_allocations l JOIN public.products p ON p.id = l.product_id
     WHERE l.order_id = p_order_id AND l.batch_id IS NULL
     GROUP BY l.product_id
  LOOP
    SELECT COALESCE(sum((x->>'quantity')::numeric), 0) INTO v_given
      FROM jsonb_array_elements(p_allocations) x
     WHERE (x->>'product_id')::uuid = v_pending.product_id;
    IF v_given <> v_pending.qty THEN
      RAISE EXCEPTION 'Indique % un. de "%" (indicou %).', v_pending.qty, v_pending.name, v_given;
    END IF;
  END LOOP;

  FOR a IN
    SELECT (x->>'product_id')::uuid AS product_id, (x->>'batch_id')::uuid AS batch_id, (x->>'quantity')::numeric AS quantity
      FROM jsonb_array_elements(p_allocations) x
  LOOP
    CONTINUE WHEN a.quantity IS NULL OR a.quantity <= 0;
    IF NOT EXISTS (
      SELECT 1 FROM public.order_lot_allocations
       WHERE order_id = p_order_id AND product_id = a.product_id AND batch_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Este produto não tem unidades à espera de lote.';
    END IF;
    SELECT * INTO v_batch FROM public.product_stock_batches WHERE id = a.batch_id FOR UPDATE;
    IF NOT FOUND OR v_batch.product_id <> a.product_id OR v_batch.expires_at IS NULL THEN
      RAISE EXCEPTION 'Lote inválido.';
    END IF;
    IF v_batch.quantity_remaining < a.quantity THEN
      RAISE EXCEPTION 'O lote com validade % só tem % un.', to_char(v_batch.expires_at, 'DD/MM/YYYY'), v_batch.quantity_remaining;
    END IF;
    UPDATE public.product_stock_batches SET quantity_remaining = quantity_remaining - a.quantity WHERE id = a.batch_id;
    INSERT INTO public.order_lot_allocations (order_id, product_id, batch_id, quantity)
    VALUES (p_order_id, a.product_id, a.batch_id, a.quantity);
  END LOOP;

  DELETE FROM public.order_lot_allocations WHERE order_id = p_order_id AND batch_id IS NULL;
END; $fn$;

REVOKE EXECUTE ON FUNCTION public.allocate_order_lots(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_order_lots(uuid, jsonb) TO authenticated;


-- Encomenda de produtos que não chega a ser entregue: devolve o stock.
CREATE OR REPLACE FUNCTION public.release_undelivered_order_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  r record;
  v_lines text[] := '{}';
  v_farmer_user uuid;
BEGIN
  IF NEW.kind <> 'product' OR OLD.status <> 'awaiting_pickup' OR NEW.status NOT IN ('expired', 'refunded') THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT l.id, l.product_id, l.batch_id, l.quantity, b.expires_at, b.expired_at, p.name
      FROM public.order_lot_allocations l
      JOIN public.products p ON p.id = l.product_id
      LEFT JOIN public.product_stock_batches b ON b.id = l.batch_id
     WHERE l.order_id = NEW.id
  LOOP
    PERFORM set_config('app.product_reason', 'restock', true);
    IF r.batch_id IS NULL THEN
      -- À espera de lote: os lotes não desceram, só volta o stock à venda.
      UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) + r.quantity WHERE id = r.product_id;
      v_lines := v_lines || (r.quantity::text || ' un. de "' || r.name || '" voltaram ao stock à venda.');
    ELSIF r.expired_at IS NULL AND r.expires_at IS NOT NULL AND r.expires_at >= public.lisbon_today() THEN
      UPDATE public.product_stock_batches SET quantity_remaining = quantity_remaining + r.quantity WHERE id = r.batch_id;
      UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) + r.quantity WHERE id = r.product_id;
      v_lines := v_lines || (r.quantity::text || ' un. de "' || r.name || '" voltaram ao stock (validade '
                             || to_char(r.expires_at, 'DD/MM/YYYY') || ').');
    ELSE
      v_lines := v_lines || (r.quantity::text || ' un. de "' || r.name || '" não voltaram ao stock: a validade terminou'
                             || COALESCE(' a ' || to_char(r.expires_at, 'DD/MM/YYYY'), '') || '.');
    END IF;
    DELETE FROM public.order_lot_allocations WHERE id = r.id;
  END LOOP;
  PERFORM set_config('app.product_reason', '', true);

  IF array_length(v_lines, 1) > 0 THEN
    SELECT user_id INTO v_farmer_user FROM public.farmer_details WHERE id = NEW.farmer_id;
    IF v_farmer_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
      VALUES (v_farmer_user, NEW.id, 'order_stock_returned', 'Stock de uma encomenda não entregue',
              array_to_string(v_lines, ' '), '/agricultor/produtos');
    END IF;
  END IF;
  RETURN NEW;
END; $fn$;

REVOKE EXECUTE ON FUNCTION public.release_undelivered_order_stock() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_release_undelivered_order_stock
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.release_undelivered_order_stock();

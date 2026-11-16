-- Vender primeiro o lote com a validade mais próxima.
--
-- Até aqui as vendas, o "Retirar stock" e os brindes das reservas tiravam do lote
-- inserido há mais tempo. Passam a tirar do lote cuja validade termina primeiro
-- (com a mesma validade, o inserido há mais tempo), para não deixar expirar um
-- lote enquanto se vende outro com mais validade. É também a ordem em que os
-- lotes aparecem em Os meus produtos.
-- Igual a 20261113120000_farm_experiences.sql, só com a ordem alterada.

CREATE OR REPLACE FUNCTION public.deduct_stock_batches(p_product_id uuid, p_qty numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE r record; v_left numeric := p_qty; v_take numeric;
BEGIN
  FOR r IN SELECT id, quantity_remaining FROM public.product_stock_batches
    WHERE product_id = p_product_id AND quantity_remaining > 0
      AND expires_at IS NOT NULL AND expires_at >= public.lisbon_today()
    ORDER BY expires_at, added_at, id FOR UPDATE
  LOOP
    EXIT WHEN v_left <= 0;
    v_take := LEAST(r.quantity_remaining, v_left);
    UPDATE public.product_stock_batches SET quantity_remaining = quantity_remaining - v_take WHERE id = r.id;
    v_left := v_left - v_take;
  END LOOP;
END; $fn$;

CREATE OR REPLACE FUNCTION public.consume_gift_stock(p_product_id uuid, p_quantity numeric, p_order_id uuid, p_actor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE r record; v_left numeric := p_quantity; v_take numeric;
BEGIN
  PERFORM public.expire_stock_batches(p_product_id);
  FOR r IN SELECT id, quantity_remaining FROM public.product_stock_batches
    WHERE product_id = p_product_id AND quantity_remaining > 0
      AND expires_at IS NOT NULL AND expires_at >= public.lisbon_today()
    ORDER BY expires_at, added_at, id FOR UPDATE
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

REVOKE EXECUTE ON FUNCTION public.deduct_stock_batches(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_gift_stock(uuid, numeric, uuid, uuid) FROM PUBLIC, anon, authenticated;

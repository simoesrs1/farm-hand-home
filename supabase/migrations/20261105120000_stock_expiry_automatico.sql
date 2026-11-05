-- Validade do stock: remoção automática dos lotes expirados.
--
-- Depende de drizzle/migrations/0001_product_stock_batches_fifo.sql
-- (tabela product_stock_batches e funções FIFO).
--
-- Regras:
--   * Um lote com validade D continua à venda até ao fim do dia D (hora de
--     Lisboa) e sai a partir de D+1.
--   * As vendas gastam primeiro o lote inserido há mais tempo (FIFO por
--     added_at), sem alteração.
--   * Ao expirar, o agricultor recebe uma notificação: se o produto ficou sem
--     stock, diz que acabou; se ainda sobra stock, diz quanto ainda há à venda.
--   * O cron corre de hora a hora, para os produtos expirados saírem do
--     catálogo sem depender de alguém abrir a página do agricultor.


-- 1. Histórico: novo tipo de evento 'expired'.
ALTER TABLE public.product_history
  DROP CONSTRAINT IF EXISTS product_history_event_type_check;
ALTER TABLE public.product_history
  ADD CONSTRAINT product_history_event_type_check CHECK (event_type IN (
    'created', 'stock_added', 'stock_removed', 'sale', 'expired', 'updated', 'deleted', 'restored'
  ));

CREATE OR REPLACE FUNCTION public.log_product_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(
    auth.uid(),
    NULLIF(current_setting('app.product_actor_id', true), '')::uuid
  );
  v_reason text := NULLIF(current_setting('app.product_reason', true), '');
  v_order uuid := NULLIF(current_setting('app.product_order_id', true), '')::uuid;
  v_actor_name text;
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_key text;
  v_stock_old numeric;
  v_stock_new numeric;
  v_delta numeric;
  v_event text;
BEGIN
  IF v_reason IS DISTINCT FROM 'sale' AND v_actor IS NOT NULL THEN
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = v_actor;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.product_history
      (product_id, farmer_id, event_type, stock_before, stock_after, quantity_delta,
       actor_id, actor_name, created_at)
    VALUES
      (NEW.id, NEW.farmer_id, 'created', NULL, COALESCE(NEW.stock_quantity, 0),
       COALESCE(NEW.stock_quantity, 0), v_actor, v_actor_name, NEW.created_at);
    RETURN NEW;
  END IF;

  -- UPDATE: compara todos os campos exceto os que não interessam ao histórico.
  v_old := to_jsonb(OLD) - 'updated_at' - 'stock_quantity';
  v_new := to_jsonb(NEW) - 'updated_at' - 'stock_quantity';
  FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
    IF v_old -> v_key IS DISTINCT FROM v_new -> v_key THEN
      v_changes := v_changes || jsonb_build_object(
        v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key)
      );
    END IF;
  END LOOP;

  v_stock_old := COALESCE(OLD.stock_quantity, 0);
  v_stock_new := COALESCE(NEW.stock_quantity, 0);
  v_delta := v_stock_new - v_stock_old;

  IF v_delta = 0 AND v_changes = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  IF OLD.active AND NOT NEW.active THEN
    v_event := 'deleted';
  ELSIF NOT OLD.active AND NEW.active THEN
    v_event := 'restored';
  ELSIF v_delta < 0 AND v_reason = 'sale' THEN
    v_event := 'sale';
  ELSIF v_delta < 0 AND v_reason = 'expired' THEN
    v_event := 'expired';
  ELSIF v_delta > 0 THEN
    v_event := 'stock_added';
  ELSIF v_delta < 0 THEN
    v_event := 'stock_removed';
  ELSE
    v_event := 'updated';
  END IF;

  INSERT INTO public.product_history
    (product_id, farmer_id, event_type, stock_before, stock_after, quantity_delta,
     changes, actor_id, actor_name, order_id)
  VALUES
    (NEW.id, NEW.farmer_id, v_event,
     CASE WHEN v_delta <> 0 THEN v_stock_old END,
     CASE WHEN v_delta <> 0 THEN v_stock_new END,
     CASE WHEN v_delta <> 0 THEN v_delta END,
     v_changes, v_actor, v_actor_name, v_order);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_product_history() FROM PUBLIC, anon, authenticated;


-- 2. Stock esgotado: quando foi a validade a esgotar o stock, a notificação
-- de expiração já o diz, por isso não se envia uma segunda.
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
    IF v_reason IS DISTINCT FROM 'expired' THEN
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

REVOKE EXECUTE ON FUNCTION public.notify_farmer_on_low_stock() FROM anon, authenticated;


-- 3. Expiração dos lotes, com a mensagem conforme o stock que sobra.
CREATE OR REPLACE FUNCTION public.expire_stock_batches(p_product_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_user uuid;
  v_name text;
  v_unit text;
  v_left numeric;
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
    UPDATE public.products
       SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - r.qty)
     WHERE id = r.product_id
    RETURNING name, unit, stock_quantity INTO v_name, v_unit, v_left;

    SELECT fd.user_id INTO v_user
      FROM public.products p
      JOIN public.farmer_details fd ON fd.id = p.farmer_id
     WHERE p.id = r.product_id;

    IF v_user IS NOT NULL THEN
      IF COALESCE(v_left, 0) <= 0 THEN
        INSERT INTO public.notifications (user_id, type, title, message)
        VALUES (
          v_user, 'stock_expired', 'Produto removido do stock',
          'O produto "' || v_name || '" foi removido do stock por ter expirado a validade. '
            || 'Ficou sem stock: repõe o stock para voltar a estar visível no catálogo.'
        );
      ELSE
        INSERT INTO public.notifications (user_id, type, title, message)
        VALUES (
          v_user, 'stock_expired', 'Stock fora de validade',
          r.qty::text || ' unidade(s) do produto "' || v_name || '" foram removidas do stock por ter expirado a validade. '
            || 'Ainda tens ' || v_left::text || ' ' || COALESCE(v_unit, 'unidade(s)') || ' para venda.'
        );
      END IF;
    END IF;
    v_count := v_count + 1;
  END LOOP;

  -- Não deixar o motivo ativo para o resto da transação (ex.: consume_product_stock).
  PERFORM set_config('app.product_reason', '', true);
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_stock_batches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_stock_batches(uuid) TO authenticated, service_role;


-- 4. Execução automática de hora a hora (minuto 5).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule(
  'expire-stock-batches',
  '5 * * * *',
  $$SELECT public.expire_stock_batches()$$
);

-- Primeira execução, para retirar já o que expirou entretanto.
SELECT public.expire_stock_batches();

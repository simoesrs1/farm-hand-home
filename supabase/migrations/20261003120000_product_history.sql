-- Histórico de produtos.
--
-- Cada INSERT/UPDATE em public.products gera uma linha em product_history,
-- escrita por trigger (SECURITY DEFINER) para que nenhum caminho de escrita —
-- página de edição, botões +/- de stock, checkout no servidor — escape ao
-- registo. O autor é auth.uid(); quando a escrita vem do service_role (sem
-- utilizador no JWT), o chamador pode identificar o autor e o motivo através
-- das definições locais app.product_actor_id / app.product_reason /
-- app.product_order_id (ver consume_product_stock abaixo).

CREATE TABLE IF NOT EXISTS public.product_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'created', 'stock_added', 'stock_removed', 'sale', 'updated', 'deleted', 'restored'
  )),
  stock_before numeric,
  stock_after numeric,
  quantity_delta numeric,
  -- Outros campos alterados no mesmo UPDATE: { campo: { "old": ..., "new": ... } }
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  -- Nome do autor no momento da alteração (o perfil pode mudar ou deixar de
  -- ser legível). Fica vazio nas vendas: o agricultor não vê nomes de clientes.
  actor_name text,
  order_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS product_history_product_idx
  ON public.product_history (product_id, created_at DESC);

ALTER TABLE public.product_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.product_history TO authenticated;
GRANT ALL ON public.product_history TO service_role;

DROP POLICY IF EXISTS "Farmer can view own product history" ON public.product_history;
CREATE POLICY "Farmer can view own product history"
  ON public.product_history FOR SELECT TO authenticated
  USING (public.user_owns_farmer(farmer_id));
-- Sem políticas de INSERT/UPDATE/DELETE: o histórico só é escrito pelo trigger.


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

DROP TRIGGER IF EXISTS trg_log_product_history ON public.products;
CREATE TRIGGER trg_log_product_history
AFTER INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_product_history();


-- Decremento de stock usado pelo checkout (service_role). Num único UPDATE
-- atómico (sem a corrida do ler-e-escrever) e com autor/motivo/encomenda
-- passados ao trigger através de definições locais à transação.
CREATE OR REPLACE FUNCTION public.consume_product_stock(
  p_product_id uuid,
  p_quantity numeric,
  p_order_id uuid,
  p_actor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.product_reason', 'sale', true);
  PERFORM set_config('app.product_order_id', COALESCE(p_order_id::text, ''), true);
  PERFORM set_config('app.product_actor_id', COALESCE(p_actor_id::text, ''), true);
  UPDATE public.products
     SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
   WHERE id = p_product_id
     AND stock_quantity IS NOT NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_product_stock(uuid, numeric, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_product_stock(uuid, numeric, uuid, uuid)
  TO service_role;


-- Produtos já existentes: um registo de criação com a data e o dono originais.
-- O stock inicial é desconhecido, por isso fica a NULL.
INSERT INTO public.product_history
  (product_id, farmer_id, event_type, actor_id, actor_name, note, created_at)
SELECT p.id, p.farmer_id, 'created', fd.user_id, pr.full_name,
       'Registo anterior ao histórico', p.created_at
  FROM public.products p
  JOIN public.farmer_details fd ON fd.id = p.farmer_id
  LEFT JOIN public.profiles pr ON pr.id = fd.user_id
 WHERE NOT EXISTS (
   SELECT 1 FROM public.product_history h
    WHERE h.product_id = p.id AND h.event_type = 'created'
 );

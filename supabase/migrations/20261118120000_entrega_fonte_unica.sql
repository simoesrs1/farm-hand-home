-- Entrega ao domicílio com uma única fonte: products.delivery_mode.
--
-- O envio é sempre feito pelo próprio agricultor, por isso "shipping" passa a
-- significar "entrega ao domicílio pelo agricultor" e local_delivery deixa de
-- ser um conceito à parte. Durante a transição (frontend antigo ainda em
-- cache), local_delivery continua a existir e fica sincronizado por trigger;
-- será removido numa migração posterior.
--
--   pickup   → só levantamento na quinta
--   shipping → só entrega ao domicílio (pelo agricultor)
--   both     → levantamento ou entrega, à escolha do cliente

-- 1. Alinhar os dados existentes.
UPDATE public.products
   SET delivery_mode = 'both'
 WHERE local_delivery AND delivery_mode = 'pickup';

UPDATE public.products
   SET local_delivery = (delivery_mode IN ('shipping', 'both'))
 WHERE local_delivery IS DISTINCT FROM (delivery_mode IN ('shipping', 'both'));

-- Sem entrega não há acompanhamento.
UPDATE public.products
   SET delivery_tracking = false
 WHERE delivery_mode = 'pickup' AND delivery_tracking;

UPDATE public.farmer_details
   SET default_delivery_mode = 'both'
 WHERE default_local_delivery AND default_delivery_mode = 'pickup';

UPDATE public.farmer_details
   SET default_local_delivery = (default_delivery_mode IN ('shipping', 'both'))
 WHERE default_delivery_mode IS NOT NULL
   AND default_local_delivery IS DISTINCT FROM (default_delivery_mode IN ('shipping', 'both'));

UPDATE public.farmer_details
   SET default_delivery_tracking = false
 WHERE default_delivery_mode = 'pickup' AND default_delivery_tracking;


-- 2. Sincronização durante a transição. Se só local_delivery for escrito
-- (frontend antigo), o modo é derivado dele; caso contrário local_delivery
-- é sempre o espelho do modo.
CREATE OR REPLACE FUNCTION public.sync_product_delivery_mode()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (TG_OP = 'UPDATE'
        AND NEW.local_delivery IS DISTINCT FROM OLD.local_delivery
        AND NEW.delivery_mode IS NOT DISTINCT FROM OLD.delivery_mode)
     OR TG_OP = 'INSERT' THEN
    IF NEW.local_delivery AND NEW.delivery_mode = 'pickup' THEN
      NEW.delivery_mode := 'both';
    ELSIF TG_OP = 'UPDATE' AND NOT NEW.local_delivery AND NEW.delivery_mode <> 'pickup' THEN
      NEW.delivery_mode := 'pickup';
    END IF;
  END IF;

  NEW.local_delivery := NEW.delivery_mode IN ('shipping', 'both');
  IF NEW.delivery_mode = 'pickup' THEN
    NEW.delivery_tracking := false;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_product_delivery_mode() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_product_delivery_mode ON public.products;
CREATE TRIGGER trg_sync_product_delivery_mode
BEFORE INSERT OR UPDATE OF delivery_mode, local_delivery, delivery_tracking ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_product_delivery_mode();


CREATE OR REPLACE FUNCTION public.sync_farmer_delivery_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.default_delivery_mode IS NULL THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE'
        AND NEW.default_local_delivery IS DISTINCT FROM OLD.default_local_delivery
        AND NEW.default_delivery_mode IS NOT DISTINCT FROM OLD.default_delivery_mode)
     OR TG_OP = 'INSERT' THEN
    IF NEW.default_local_delivery AND NEW.default_delivery_mode = 'pickup' THEN
      NEW.default_delivery_mode := 'both';
    ELSIF TG_OP = 'UPDATE' AND NOT COALESCE(NEW.default_local_delivery, false)
          AND NEW.default_delivery_mode <> 'pickup' THEN
      NEW.default_delivery_mode := 'pickup';
    END IF;
  END IF;

  NEW.default_local_delivery := NEW.default_delivery_mode IN ('shipping', 'both');
  IF NEW.default_delivery_mode = 'pickup' THEN
    NEW.default_delivery_tracking := false;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_farmer_delivery_defaults() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_farmer_delivery_defaults ON public.farmer_details;
CREATE TRIGGER trg_sync_farmer_delivery_defaults
BEFORE INSERT OR UPDATE OF default_delivery_mode, default_local_delivery, default_delivery_tracking ON public.farmer_details
FOR EACH ROW EXECUTE FUNCTION public.sync_farmer_delivery_defaults();


-- 3. Padrão do agricultor: delivery_mode é a fonte. local_delivery ainda é
-- aceite (frontend antigo) e convertido para o modo equivalente.
CREATE OR REPLACE FUNCTION public.apply_delivery_defaults(p_farmer_id uuid, p_values jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_values jsonb := p_values;
BEGIN
  IF p_farmer_id IS NULL OR NOT public.user_owns_farmer(p_farmer_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF p_values IS NULL OR jsonb_typeof(p_values) <> 'object' THEN
    RAISE EXCEPTION 'Valores inválidos';
  END IF;

  -- Pedido antigo só com local_delivery: o modo fica "ambos" ou "levantamento".
  IF v_values ? 'local_delivery' AND NOT v_values ? 'delivery_mode' THEN
    v_values := v_values || jsonb_build_object(
      'delivery_mode',
      CASE WHEN (v_values->>'local_delivery')::boolean THEN 'both' ELSE 'pickup' END
    );
  END IF;
  v_values := v_values - 'local_delivery';

  UPDATE public.farmer_details SET
    default_delivery_mode = CASE WHEN v_values ? 'delivery_mode'
      THEN (v_values->>'delivery_mode')::public.delivery_mode ELSE default_delivery_mode END,
    default_delivery_tracking = CASE WHEN v_values ? 'delivery_tracking'
      THEN (v_values->>'delivery_tracking')::boolean ELSE default_delivery_tracking END,
    default_shipping_days = CASE WHEN v_values ? 'shipping_days'
      THEN (v_values->>'shipping_days')::integer ELSE default_shipping_days END,
    default_delivery_fee = CASE WHEN v_values ? 'delivery_fee'
      THEN (v_values->>'delivery_fee')::numeric ELSE default_delivery_fee END,
    free_delivery_threshold = CASE WHEN v_values ? 'free_delivery_threshold'
      THEN NULLIF((v_values->>'free_delivery_threshold')::numeric, 0) ELSE free_delivery_threshold END
  WHERE id = p_farmer_id;

  IF v_values ?| ARRAY['delivery_mode', 'delivery_tracking', 'shipping_days', 'delivery_fee'] THEN
    UPDATE public.products SET
      delivery_mode = CASE WHEN v_values ? 'delivery_mode'
        THEN (v_values->>'delivery_mode')::public.delivery_mode ELSE delivery_mode END,
      delivery_tracking = CASE WHEN v_values ? 'delivery_tracking'
        THEN (v_values->>'delivery_tracking')::boolean ELSE delivery_tracking END,
      shipping_days = CASE WHEN v_values ? 'shipping_days'
        THEN (v_values->>'shipping_days')::integer ELSE shipping_days END,
      delivery_fee = CASE WHEN v_values ? 'delivery_fee'
        THEN COALESCE((v_values->>'delivery_fee')::numeric, 0) ELSE delivery_fee END,
      updated_at = now()
    WHERE farmer_id = p_farmer_id AND active;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    -- O trigger trg_sync_product_delivery_mode desliga o acompanhamento sem entrega.
  END IF;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_delivery_defaults(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_delivery_defaults(uuid, jsonb) TO authenticated;

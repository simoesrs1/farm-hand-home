-- Entrega ao domicílio: fim da transição iniciada em 20261118120000.
-- products.delivery_mode é a única fonte; local_delivery e default_local_delivery
-- (e os triggers que os mantinham sincronizados) deixam de existir.

-- 1. Triggers de sincronização (dependem das colunas a remover).
DROP TRIGGER IF EXISTS trg_sync_product_delivery_mode ON public.products;
DROP TRIGGER IF EXISTS trg_sync_farmer_delivery_defaults ON public.farmer_details;
DROP FUNCTION IF EXISTS public.sync_product_delivery_mode();
DROP FUNCTION IF EXISTS public.sync_farmer_delivery_defaults();

-- 2. Colunas duplicadas. Nenhuma vista as usa (public_farmer_profiles não as inclui).
ALTER TABLE public.products DROP COLUMN IF EXISTS local_delivery;
ALTER TABLE public.farmer_details DROP COLUMN IF EXISTS default_local_delivery;


-- 3. Padrão do agricultor só com delivery_mode. Sem entrega não há acompanhamento
-- (antes garantido pelo trigger).
CREATE OR REPLACE FUNCTION public.apply_delivery_defaults(p_farmer_id uuid, p_values jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_farmer_id IS NULL OR NOT public.user_owns_farmer(p_farmer_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF p_values IS NULL OR jsonb_typeof(p_values) <> 'object' THEN
    RAISE EXCEPTION 'Valores inválidos';
  END IF;

  UPDATE public.farmer_details SET
    default_delivery_mode = CASE WHEN p_values ? 'delivery_mode'
      THEN (p_values->>'delivery_mode')::public.delivery_mode ELSE default_delivery_mode END,
    default_delivery_tracking = CASE WHEN p_values ? 'delivery_tracking'
      THEN (p_values->>'delivery_tracking')::boolean ELSE default_delivery_tracking END,
    default_shipping_days = CASE WHEN p_values ? 'shipping_days'
      THEN (p_values->>'shipping_days')::integer ELSE default_shipping_days END,
    default_delivery_fee = CASE WHEN p_values ? 'delivery_fee'
      THEN (p_values->>'delivery_fee')::numeric ELSE default_delivery_fee END,
    free_delivery_threshold = CASE WHEN p_values ? 'free_delivery_threshold'
      THEN NULLIF((p_values->>'free_delivery_threshold')::numeric, 0) ELSE free_delivery_threshold END
  WHERE id = p_farmer_id;

  UPDATE public.farmer_details SET default_delivery_tracking = false
   WHERE id = p_farmer_id AND default_delivery_mode = 'pickup' AND default_delivery_tracking;

  IF p_values ?| ARRAY['delivery_mode', 'delivery_tracking', 'shipping_days', 'delivery_fee'] THEN
    UPDATE public.products SET
      delivery_mode = CASE WHEN p_values ? 'delivery_mode'
        THEN (p_values->>'delivery_mode')::public.delivery_mode ELSE delivery_mode END,
      delivery_tracking = CASE WHEN p_values ? 'delivery_tracking'
        THEN (p_values->>'delivery_tracking')::boolean ELSE delivery_tracking END,
      shipping_days = CASE WHEN p_values ? 'shipping_days'
        THEN (p_values->>'shipping_days')::integer ELSE shipping_days END,
      delivery_fee = CASE WHEN p_values ? 'delivery_fee'
        THEN COALESCE((p_values->>'delivery_fee')::numeric, 0) ELSE delivery_fee END,
      updated_at = now()
    WHERE farmer_id = p_farmer_id AND active;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    UPDATE public.products SET delivery_tracking = false
     WHERE farmer_id = p_farmer_id AND active AND delivery_mode = 'pickup' AND delivery_tracking;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_delivery_defaults(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_delivery_defaults(uuid, jsonb) TO authenticated;

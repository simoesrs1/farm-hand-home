-- Preço da entrega ao domicílio e padrão de entrega do agricultor.
--
-- Padrão: o cartão "Entrega" do formulário de produto (modo de entrega,
-- entrega ao domicílio, acompanhamento, dias de envio, preço da entrega) fica
-- guardado em farmer_details e preenche os produtos novos. Cada produto guarda
-- sempre os seus próprios valores; "aplicar a todos" atualiza o padrão e todos
-- os produtos ativos do agricultor, só nos campos alterados
-- (apply_delivery_defaults).
--
-- Entrega grátis: um único valor por agricultor (free_delivery_threshold),
-- porque se aplica ao carrinho inteiro. A encomenda paga uma só entrega: o
-- preço mais alto entre os produtos com entrega ao domicílio, ou 0 se o valor
-- dos produtos atingir o limite. Calculado em create-order.
--
-- A plataforma não cobra comissão sobre a entrega: orders.delivery_fee vai
-- inteiro para o agricultor.

-- 1. Padrão de entrega do agricultor (NULL = ainda não definido).
ALTER TABLE public.farmer_details
  ADD COLUMN IF NOT EXISTS default_delivery_mode public.delivery_mode,
  ADD COLUMN IF NOT EXISTS default_local_delivery boolean,
  ADD COLUMN IF NOT EXISTS default_delivery_tracking boolean,
  ADD COLUMN IF NOT EXISTS default_shipping_days integer,
  ADD COLUMN IF NOT EXISTS default_delivery_fee numeric(10,2)
    CHECK (default_delivery_fee IS NULL OR default_delivery_fee >= 0),
  ADD COLUMN IF NOT EXISTS free_delivery_threshold numeric(10,2)
    CHECK (free_delivery_threshold IS NULL OR free_delivery_threshold > 0);

-- 2. Preço da entrega por produto (0 = grátis).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2) NOT NULL DEFAULT 0
    CHECK (delivery_fee >= 0);

-- 3. Valor da entrega cobrado na encomenda (já incluído em orders.total).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2) NOT NULL DEFAULT 0;

-- Permissões por coluna, como nas restantes colunas destas tabelas.
GRANT SELECT (default_delivery_mode, default_local_delivery, default_delivery_tracking,
              default_shipping_days, default_delivery_fee)
  ON public.farmer_details TO authenticated;
GRANT UPDATE (default_delivery_mode, default_local_delivery, default_delivery_tracking,
              default_shipping_days, default_delivery_fee, free_delivery_threshold)
  ON public.farmer_details TO authenticated;
GRANT SELECT (free_delivery_threshold) ON public.farmer_details TO anon, authenticated;
GRANT SELECT (delivery_fee) ON public.products TO authenticated, anon;
GRANT INSERT (delivery_fee), UPDATE (delivery_fee) ON public.products TO authenticated;
GRANT SELECT (delivery_fee) ON public.orders TO authenticated;


-- 4. Vista pública: o carrinho precisa do limite da entrega grátis.
-- Mesma definição de 20261003150000_farmer_activity.sql, com a coluna nova no fim.
CREATE OR REPLACE VIEW public.public_farmer_profiles
WITH (security_invoker = off) AS
 SELECT fd.id,
    fd.user_id,
    fd.company_name,
    fd.cae_code,
    fd.address,
    fd.website,
    fd.description,
    fd.initial_score,
    fd.registration_step,
    fd.created_at,
    fd.updated_at,
    fd.pickup_address,
    fd.pickup_lat,
    fd.pickup_lng,
    fd.pickup_hours,
    fd.pickup_hours_note,
    fd.delivery_radius_km,
    fd.delivery_hours,
    fd.delivery_note,
    fd.paused_until,
    fd.pause_note,
    COALESCE(fa.score, 0)::integer AS activity_score,
    fa.featured_rank::integer AS featured_rank,
    fd.free_delivery_threshold
   FROM public.farmer_details fd
   LEFT JOIN public.farmer_activity fa ON fa.farmer_id = fd.id
  WHERE fd.registration_step = 2;

GRANT SELECT ON public.public_farmer_profiles TO anon, authenticated, service_role;


-- 5. Guardar valores como padrão e aplicá-los a todos os produtos.
-- p_values só traz as chaves a alterar, por exemplo
--   {"delivery_fee": 3.5, "free_delivery_threshold": 30}
-- free_delivery_threshold só existe no agricultor; as restantes chaves
-- atualizam o padrão e todos os produtos ativos.
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
    default_local_delivery = CASE WHEN p_values ? 'local_delivery'
      THEN (p_values->>'local_delivery')::boolean ELSE default_local_delivery END,
    default_delivery_tracking = CASE WHEN p_values ? 'delivery_tracking'
      THEN (p_values->>'delivery_tracking')::boolean ELSE default_delivery_tracking END,
    default_shipping_days = CASE WHEN p_values ? 'shipping_days'
      THEN (p_values->>'shipping_days')::integer ELSE default_shipping_days END,
    default_delivery_fee = CASE WHEN p_values ? 'delivery_fee'
      THEN (p_values->>'delivery_fee')::numeric ELSE default_delivery_fee END,
    free_delivery_threshold = CASE WHEN p_values ? 'free_delivery_threshold'
      THEN NULLIF((p_values->>'free_delivery_threshold')::numeric, 0) ELSE free_delivery_threshold END
  WHERE id = p_farmer_id;

  IF p_values ?| ARRAY['delivery_mode', 'local_delivery', 'delivery_tracking', 'shipping_days', 'delivery_fee'] THEN
    UPDATE public.products SET
      delivery_mode = CASE WHEN p_values ? 'delivery_mode'
        THEN (p_values->>'delivery_mode')::public.delivery_mode ELSE delivery_mode END,
      local_delivery = CASE WHEN p_values ? 'local_delivery'
        THEN (p_values->>'local_delivery')::boolean ELSE local_delivery END,
      delivery_tracking = CASE WHEN p_values ? 'delivery_tracking'
        THEN (p_values->>'delivery_tracking')::boolean ELSE delivery_tracking END,
      shipping_days = CASE WHEN p_values ? 'shipping_days'
        THEN (p_values->>'shipping_days')::integer ELSE shipping_days END,
      delivery_fee = CASE WHEN p_values ? 'delivery_fee'
        THEN COALESCE((p_values->>'delivery_fee')::numeric, 0) ELSE delivery_fee END,
      updated_at = now()
    WHERE farmer_id = p_farmer_id AND active;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Sem entrega ao domicílio não há acompanhamento.
    UPDATE public.products SET delivery_tracking = false
     WHERE farmer_id = p_farmer_id AND active AND NOT local_delivery AND delivery_tracking;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_delivery_defaults(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_delivery_defaults(uuid, jsonb) TO authenticated;

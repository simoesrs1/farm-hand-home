-- Contas de teste.
--
-- Uma conta marcada como de teste (profiles.is_test_account) pode ser cliente
-- e agricultor ao mesmo tempo: vende sem esperar pela verificação (a equipa
-- marca-a como verificada) e compra a outras quintas mesmo registada como
-- agricultor. A quinta de uma conta de teste só é visível para contas de teste
-- (e para o próprio dono): não aparece no catálogo, no mapa, nos destaques nem
-- na página pública para os clientes normais.
--
-- A marca não se muda pelo browser; aplica-se no SQL Editor do Supabase
-- (ver docs/contas-de-teste.md).

-- 1) Marca de conta de teste.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_test_account_flag()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Pedidos diretos do browser mantêm o valor; o painel e o SQL podem mudá-lo.
  IF TG_OP = 'INSERT' THEN
    IF current_user IN ('authenticated', 'anon') THEN NEW.is_test_account := false; END IF;
  ELSIF NEW.is_test_account IS DISTINCT FROM OLD.is_test_account
        AND current_user IN ('authenticated', 'anon') THEN
    NEW.is_test_account := OLD.is_test_account;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_test_account_flag ON public.profiles;
CREATE TRIGGER trg_protect_test_account_flag
BEFORE INSERT OR UPDATE OF is_test_account ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_test_account_flag();

-- 2) Quem está a ver é uma conta de teste? E a quinta é de teste?
CREATE OR REPLACE FUNCTION public.viewer_is_tester()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT is_test_account FROM public.profiles WHERE id = auth.uid()), false)
$$;

CREATE OR REPLACE FUNCTION public.farmer_is_test(_farmer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT p.is_test_account
       FROM public.farmer_details fd
       JOIN public.profiles p ON p.id = fd.user_id
      WHERE fd.id = _farmer_id),
    false)
$$;

GRANT EXECUTE ON FUNCTION public.viewer_is_tester() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.farmer_is_test(uuid) TO anon, authenticated;

-- 3) Visibilidade: quintas de teste só para contas de teste.
CREATE OR REPLACE FUNCTION public.farmer_is_listed(_farmer_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT verification_status = 'verified'
            AND registration_step >= 2
            AND (paused_until IS NULL OR paused_until <= public.today_lisbon())
            AND (NOT public.farmer_is_test(id) OR public.viewer_is_tester())
       FROM public.farmer_details WHERE id = _farmer_id),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.farmer_is_verified(_farmer_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT verification_status = 'verified' AND registration_step >= 2
            AND (NOT public.farmer_is_test(id) OR public.viewer_is_tester())
       FROM public.farmer_details WHERE id = _farmer_id),
    false
  );
$$;

-- Perfil público (página da quinta, mapa, carrinho): mesma definição de
-- 20261105140000_delivery_fee_and_defaults.sql, com o filtro das quintas de teste.
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
  WHERE fd.registration_step = 2
    AND (NOT public.farmer_is_test(fd.id) OR public.viewer_is_tester() OR fd.user_id = auth.uid());

GRANT SELECT ON public.public_farmer_profiles TO anon, authenticated, service_role;

-- 4) Quintas de teste nunca ficam em destaque na página inicial.
CREATE OR REPLACE FUNCTION public.no_featured_test_farmers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.featured_rank IS NOT NULL AND public.farmer_is_test(NEW.farmer_id) THEN
    NEW.featured_rank := NULL;
    NEW.featured_since := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.no_featured_test_farmers() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_no_featured_test_farmers ON public.farmer_activity;
CREATE TRIGGER trg_no_featured_test_farmers
BEFORE INSERT OR UPDATE OF featured_rank ON public.farmer_activity
FOR EACH ROW EXECUTE FUNCTION public.no_featured_test_farmers();

-- 5) Subscrever: contas de teste registadas como agricultor também podem,
--    nunca à própria quinta. Substitui a versão de 20261121150000.
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
  -- Contas de teste registadas como agricultor também podem comprar.
  IF v_profile_type IS DISTINCT FROM 'cliente' AND NOT public.viewer_is_tester() THEN
    RAISE EXCEPTION 'Apenas clientes podem comprar';
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = p_plan_id;
  IF NOT FOUND OR NOT v_plan.active OR NOT public.farmer_is_listed(v_plan.farmer_id) THEN
    RAISE EXCEPTION 'Esta subscrição não está disponível.';
  END IF;
  SELECT * INTO v_farmer FROM public.farmer_details WHERE id = v_plan.farmer_id;
  IF v_farmer.user_id = v_uid THEN
    RAISE EXCEPTION 'Não pode comprar à sua própria quinta.';
  END IF;

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

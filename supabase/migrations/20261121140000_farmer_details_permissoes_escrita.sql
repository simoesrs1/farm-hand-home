-- Permissões de escrita em farmer_details.
--
-- A leitura já estava limitada por coluna, mas a escrita não: `authenticated`
-- tinha UPDATE sobre a tabela inteira (padrão do Supabase). Um agricultor
-- conseguia, pelo browser, mudar o NIF, o nº de exploração, a morada oficial,
-- o registration_step ou a initial_score sem passar pelo pedido de alteração.
--
-- A partir daqui:
-- - o agricultor só atualiza diretamente as colunas operacionais (horários,
--   pausa, entregas, ofertas, valores por omissão das entregas);
-- - o registo inicial (dados oficiais) passa pela função
--   complete_farmer_onboarding, que só corre enquanto o registo não está
--   concluído e calcula a initial_score no servidor;
-- - depois do registo, os dados oficiais só mudam por pedido de alteração,
--   aplicado pela equipa no painel do Supabase.
-- As funções SECURITY DEFINER (claim_initial_profile_type, apply_delivery_defaults,
-- lock_farmer_on_change_request, …) não são afetadas.

-- 1) Escrita só nas colunas operacionais.
REVOKE INSERT, UPDATE ON public.farmer_details FROM anon, authenticated;

GRANT UPDATE (
  paused_until, pause_note,
  pickup_hours, pickup_hours_note,
  delivery_radius_km, delivery_hours, delivery_note,
  offers_products, offers_experiences, offers_stays,
  default_delivery_mode, default_delivery_tracking, default_shipping_days,
  default_delivery_fee, free_delivery_threshold
) ON public.farmer_details TO authenticated;

-- 2) Registo inicial do agricultor (dados oficiais), uma única vez.
CREATE OR REPLACE FUNCTION public.complete_farmer_onboarding(
  p_exploration_id text,
  p_exploration_number text,
  p_company_name text,
  p_company_nif text,
  p_cae_code text,
  p_address text,
  p_phone text,
  p_website text,
  p_description text,
  p_pickup_address text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_offers_products boolean,
  p_offers_experiences boolean,
  p_offers_stays boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _farmer public.farmer_details%ROWTYPE;
  _nif text := btrim(coalesce(p_company_nif, ''));
  _number text := upper(btrim(coalesce(p_exploration_number, '')));
  _total int := 0;
  _check int;
  _certs int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO _farmer FROM public.farmer_details WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de agricultor não encontrado.';
  END IF;
  IF _farmer.registration_step >= 2 THEN
    RAISE EXCEPTION 'O registo já foi concluído. Para alterar os dados, faça um pedido de alteração.';
  END IF;

  -- As mesmas regras de src/lib/farmer-validation.ts (o browser já as mostra).
  IF length(btrim(coalesce(p_exploration_id, ''))) < 3
     OR _number !~ '^[A-Z0-9]{7,20}$'
     OR length(btrim(coalesce(p_company_name, ''))) < 3
     OR btrim(coalesce(p_cae_code, '')) !~ '^\d{5}$'
     OR length(btrim(coalesce(p_address, ''))) < 5
     OR length(btrim(coalesce(p_phone, ''))) < 9
     OR length(btrim(coalesce(p_pickup_address, ''))) < 5
     OR p_pickup_lat IS NULL OR p_pickup_lng IS NULL
     OR abs(p_pickup_lat) > 90 OR abs(p_pickup_lng) > 180 THEN
    RAISE EXCEPTION 'Preencha corretamente todos os campos obrigatórios do registo.';
  END IF;

  -- NIF português: 9 dígitos e dígito de controlo.
  IF _nif !~ '^\d{9}$' THEN
    RAISE EXCEPTION 'O NIF da empresa não é válido.';
  END IF;
  FOR i IN 1..8 LOOP
    _total := _total + substr(_nif, i, 1)::int * (10 - i);
  END LOOP;
  _check := CASE WHEN _total % 11 < 2 THEN 0 ELSE 11 - _total % 11 END;
  IF _check <> substr(_nif, 9, 1)::int THEN
    RAISE EXCEPTION 'O NIF da empresa não é válido.';
  END IF;

  IF NOT (coalesce(p_offers_products, false) OR coalesce(p_offers_experiences, false) OR coalesce(p_offers_stays, false)) THEN
    RAISE EXCEPTION 'Indique o que a quinta oferece: produtos, experiências ou alojamento.';
  END IF;

  -- Pontuação inicial: 10 por certificado já carregado, até 50.
  SELECT count(*) INTO _certs FROM public.farmer_certificates WHERE farmer_id = _farmer.id;

  -- O nº de exploração e o NIF repetidos falham nos índices únicos
  -- (farmer_details_exploration_number_unique / _company_nif_unique), que o
  -- browser já traduz.
  UPDATE public.farmer_details SET
    exploration_id = btrim(p_exploration_id),
    exploration_number = _number,
    company_name = btrim(p_company_name),
    company_nif = _nif,
    cae_code = btrim(p_cae_code),
    address = btrim(p_address),
    phone = btrim(p_phone),
    website = nullif(btrim(coalesce(p_website, '')), ''),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    pickup_address = btrim(p_pickup_address),
    pickup_lat = p_pickup_lat,
    pickup_lng = p_pickup_lng,
    offers_products = coalesce(p_offers_products, false),
    offers_experiences = coalesce(p_offers_experiences, false),
    offers_stays = coalesce(p_offers_stays, false),
    initial_score = least(_certs * 10, 50),
    registration_step = 2
  WHERE id = _farmer.id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_farmer_onboarding(
  text, text, text, text, text, text, text, text, text, text,
  double precision, double precision, boolean, boolean, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_farmer_onboarding(
  text, text, text, text, text, text, text, text, text, text,
  double precision, double precision, boolean, boolean, boolean
) TO authenticated;

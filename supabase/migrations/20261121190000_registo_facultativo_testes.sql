-- Registo do agricultor com passos facultativos, só para contas de teste.
--
-- Uma conta marcada como de teste (profiles.is_test_account, ver
-- docs/contas-de-teste.md) pode concluir o registo da exploração com campos
-- vazios. Os campos preenchidos são validados na mesma. Sem escolha do que a
-- quinta oferece, ficam ativas todas as opções; sem nome da empresa, usa-se o
-- nome do perfil (ou "Quinta de teste").
--
-- Contas normais: as regras ficam exatamente como em 20261121150000.

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
  p_offers_stays boolean,
  p_offers_subscriptions boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _farmer public.farmer_details%ROWTYPE;
  _test boolean;
  _profile_name text;
  _exploration_id text := btrim(coalesce(p_exploration_id, ''));
  _nif text := btrim(coalesce(p_company_nif, ''));
  _number text := upper(btrim(coalesce(p_exploration_number, '')));
  _company text := btrim(coalesce(p_company_name, ''));
  _cae text := btrim(coalesce(p_cae_code, ''));
  _address text := btrim(coalesce(p_address, ''));
  _phone text := btrim(coalesce(p_phone, ''));
  _pickup text := btrim(coalesce(p_pickup_address, ''));
  _products boolean := coalesce(p_offers_products, false);
  _experiences boolean := coalesce(p_offers_experiences, false);
  _stays boolean := coalesce(p_offers_stays, false);
  _subscriptions boolean := coalesce(p_offers_subscriptions, false);
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

  SELECT coalesce(is_test_account, false), btrim(coalesce(full_name, ''))
    INTO _test, _profile_name
    FROM public.profiles WHERE id = _uid;
  _test := coalesce(_test, false);

  -- As mesmas regras de src/lib/farmer-validation.ts (o browser já as mostra).
  -- Conta de teste: um campo vazio é aceite; um campo preenchido valida-se.
  IF (NOT (_test AND _exploration_id = '') AND length(_exploration_id) < 3)
     OR (NOT (_test AND _number = '') AND _number !~ '^[A-Z0-9]{7,20}$')
     OR (NOT (_test AND _company = '') AND length(_company) < 3)
     OR (NOT (_test AND _cae = '') AND _cae !~ '^\d{5}$')
     OR (NOT (_test AND _address = '') AND length(_address) < 5)
     OR (NOT (_test AND _phone = '') AND length(_phone) < 9)
     OR (NOT (_test AND _pickup = '') AND length(_pickup) < 5)
     OR (NOT _test AND (p_pickup_lat IS NULL OR p_pickup_lng IS NULL))
     OR (p_pickup_lat IS NULL) <> (p_pickup_lng IS NULL)
     OR abs(p_pickup_lat) > 90 OR abs(p_pickup_lng) > 180 THEN
    RAISE EXCEPTION 'Preencha corretamente todos os campos obrigatórios do registo.';
  END IF;

  -- NIF português: 9 dígitos e dígito de controlo.
  IF NOT (_test AND _nif = '') THEN
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
  END IF;

  IF NOT (_products OR _experiences OR _stays OR _subscriptions) THEN
    IF _test THEN
      -- Conta de teste sem escolha: tudo ativo, para poder testar tudo.
      _products := true; _experiences := true; _stays := true; _subscriptions := true;
    ELSE
      RAISE EXCEPTION 'Indique o que a quinta oferece: produtos, experiências ou alojamento.';
    END IF;
  END IF;

  IF _test AND _company = '' THEN
    _company := coalesce(nullif(_profile_name, ''), 'Quinta de teste');
  END IF;

  -- Pontuação inicial: 10 por certificado já carregado, até 50.
  SELECT count(*) INTO _certs FROM public.farmer_certificates WHERE farmer_id = _farmer.id;

  -- O nº de exploração e o NIF repetidos falham nos índices únicos
  -- (farmer_details_exploration_number_unique / _company_nif_unique), que o
  -- browser já traduz. Vazios ficam NULL (só nas contas de teste).
  UPDATE public.farmer_details SET
    exploration_id = nullif(_exploration_id, ''),
    exploration_number = nullif(_number, ''),
    company_name = _company,
    company_nif = nullif(_nif, ''),
    cae_code = nullif(_cae, ''),
    address = nullif(_address, ''),
    phone = nullif(_phone, ''),
    website = nullif(btrim(coalesce(p_website, '')), ''),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    pickup_address = nullif(_pickup, ''),
    pickup_lat = p_pickup_lat,
    pickup_lng = p_pickup_lng,
    offers_products = _products,
    offers_experiences = _experiences,
    offers_stays = _stays,
    offers_subscriptions = _subscriptions,
    initial_score = least(_certs * 10, 50),
    registration_step = 2
  WHERE id = _farmer.id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_farmer_onboarding(
  text, text, text, text, text, text, text, text, text, text,
  double precision, double precision, boolean, boolean, boolean, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_farmer_onboarding(
  text, text, text, text, text, text, text, text, text, text,
  double precision, double precision, boolean, boolean, boolean, boolean
) TO authenticated;

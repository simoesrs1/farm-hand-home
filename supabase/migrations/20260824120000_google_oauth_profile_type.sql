-- Registo/login com Google (OAuth).
--
-- No registo por email o tipo de perfil viaja nos metadados do signUp e o
-- trigger handle_new_user grava-o. No OAuth isso não é possível: o cliente não
-- controla os metadados do utilizador criado pelo provider, e a política de
-- UPDATE em public.profiles proíbe explicitamente alterar profile_type.
--
-- Solução: marcar os perfis criados sem escolha explícita como "por reclamar" e
-- expor uma função SECURITY DEFINER que aceita UMA única escolha, logo após o
-- primeiro login.

-- 1) Marca de escolha do tipo de perfil.
--    Default true = já escolhido; os perfis existentes ficam trancados.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type_claimed boolean NOT NULL DEFAULT true;

-- 2) O trigger passa a distinguir signUp por email (com profile_type nos
--    metadados) de OAuth (sem), e aceita também o `name` que a Google envia.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _meta_type text := NULLIF(NEW.raw_user_meta_data->>'profile_type', '');
  _type text := COALESCE(_meta_type, 'cliente');
BEGIN
  INSERT INTO public.profiles (id, full_name, profile_type, active_mode, profile_type_claimed)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      ''
    ),
    _type,
    _type,
    _meta_type IS NOT NULL
  );

  IF _type = 'vendedor' THEN
    INSERT INTO public.farmer_details (user_id, registration_step)
    VALUES (NEW.id, 1)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- 3) Escolha única do tipo de perfil após o primeiro login OAuth.
--    Idempotente: se já estiver reclamado devolve o valor atual sem alterar nada.
CREATE OR REPLACE FUNCTION public.claim_initial_profile_type(_profile_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _claimed boolean;
  _current text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF _profile_type NOT IN ('cliente', 'vendedor') THEN
    RAISE EXCEPTION 'Tipo de perfil inválido: %', _profile_type;
  END IF;

  SELECT profile_type, profile_type_claimed
    INTO _current, _claimed
    FROM public.profiles
   WHERE id = _uid
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil inexistente';
  END IF;

  IF _claimed THEN
    RETURN _current;
  END IF;

  UPDATE public.profiles
     SET profile_type = _profile_type,
         active_mode = _profile_type,
         profile_type_claimed = true
   WHERE id = _uid;

  IF _profile_type = 'vendedor' THEN
    INSERT INTO public.farmer_details (user_id, registration_step)
    VALUES (_uid, 1)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN _profile_type;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_initial_profile_type(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_initial_profile_type(text) TO authenticated;

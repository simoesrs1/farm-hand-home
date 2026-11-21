-- Verificação inicial dos agricultores.
--
-- Até agora verification_status tinha 'verified' por omissão: um agricultor
-- novo ficava visível assim que preenchia os dados. Passa a começar como
-- 'unverified' e só aparece aos clientes (e vende) depois de a equipa
-- ValorRural o aprovar, mudando verification_status para 'verified' no painel
-- do Supabase. Entretanto pode criar produtos, experiências e alojamento,
-- que ficam ocultos (as políticas de leitura usam farmer_is_listed).
--
-- Estados: 'unverified' (verificação inicial), 'verified', 'pending_review'
-- (pedido de alteração de dados, ver lock_farmer_on_change_request).

-- 1) Agricultores novos começam por verificar. Os existentes mantêm o estado,
--    exceto os que ainda não completaram o registo (nunca foram verificados).
ALTER TABLE public.farmer_details
  ALTER COLUMN verification_status SET DEFAULT 'unverified';

UPDATE public.farmer_details
   SET verification_status = 'unverified'
 WHERE registration_step < 2
   AND verification_status = 'verified';

-- 2) Só aparece aos clientes quem tem o registo completo e está verificado
--    (e não está em pausa). Usada pelas políticas de produtos, experiências e
--    alojamento e pelas funções de reserva.
CREATE OR REPLACE FUNCTION public.farmer_is_listed(_farmer_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT verification_status = 'verified'
            AND registration_step >= 2
            AND (paused_until IS NULL OR paused_until <= public.today_lisbon())
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
       FROM public.farmer_details WHERE id = _farmer_id),
    false
  );
$$;

-- 3) O agricultor não pode mudar o próprio estado de verificação. A tabela
--    tem UPDATE para `authenticated` (o registo atualiza várias colunas), por
--    isso a proteção é um trigger: pedidos diretos do browser (current_user =
--    authenticated/anon) mantêm o valor antigo. As funções SECURITY DEFINER
--    (ex.: lock_farmer_on_change_request) e o painel do Supabase correm como
--    outro papel e podem alterá-lo.
CREATE OR REPLACE FUNCTION public.protect_farmer_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND current_user IN ('authenticated', 'anon') THEN
    NEW.verification_status := OLD.verification_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_farmer_verification_status ON public.farmer_details;
CREATE TRIGGER trg_protect_farmer_verification_status
BEFORE UPDATE OF verification_status ON public.farmer_details
FOR EACH ROW EXECUTE FUNCTION public.protect_farmer_verification_status();

-- Na criação, o estado é sempre o inicial (nunca escolhido pelo browser).
CREATE OR REPLACE FUNCTION public.default_farmer_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.verification_status := 'unverified';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_farmer_verification_status ON public.farmer_details;
CREATE TRIGGER trg_default_farmer_verification_status
BEFORE INSERT ON public.farmer_details
FOR EACH ROW EXECUTE FUNCTION public.default_farmer_verification_status();

-- 4) Aviso ao agricultor quando a equipa aprova a conta.
CREATE OR REPLACE FUNCTION public.notify_farmer_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.verification_status = 'unverified' AND NEW.verification_status = 'verified' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'farmer_verified',
      'Conta verificada',
      'A sua conta de agricultor foi verificada. Os seus produtos, experiências e alojamento já aparecem aos clientes e pode começar a vender.',
      '/agricultor/produtos'
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_farmer_verified() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_notify_farmer_verified ON public.farmer_details;
CREATE TRIGGER trg_notify_farmer_verified
AFTER UPDATE OF verification_status ON public.farmer_details
FOR EACH ROW EXECUTE FUNCTION public.notify_farmer_verified();

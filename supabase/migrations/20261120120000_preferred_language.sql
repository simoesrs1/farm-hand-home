-- Idioma escolhido pelo utilizador no seletor do site (PT, EN, DE, ES, FR).
-- Serve para recuperar a escolha noutros dispositivos e, mais tarde, para enviar
-- notificações e e-mails no idioma certo. NULL = ainda não escolheu (português).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text
  CHECK (preferred_language IS NULL OR preferred_language IN ('pt', 'en', 'de', 'es', 'fr'));

-- Cada utilizador lê e altera o seu (a policy "Users can update own profile" já
-- limita às próprias linhas).
GRANT SELECT (preferred_language), UPDATE (preferred_language) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

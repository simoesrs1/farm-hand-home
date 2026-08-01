ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_mode text NOT NULL DEFAULT 'cliente'
  CHECK (active_mode IN ('cliente','vendedor'));

UPDATE public.profiles SET active_mode = profile_type WHERE active_mode <> profile_type;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, profile_type, active_mode)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'profile_type', 'cliente'),
    COALESCE(NEW.raw_user_meta_data->>'profile_type', 'cliente')
  );

  IF COALESCE(NEW.raw_user_meta_data->>'profile_type', 'cliente') = 'vendedor' THEN
    INSERT INTO public.farmer_details (user_id, registration_step)
    VALUES (NEW.id, 1);
  END IF;

  RETURN NEW;
END;
$function$;
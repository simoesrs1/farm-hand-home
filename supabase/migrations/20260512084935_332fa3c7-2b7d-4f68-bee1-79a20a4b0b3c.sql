
-- 1) Remove the overly-permissive public policy that exposed all columns of farmer_details
DROP POLICY IF EXISTS "Public can read farmer details via view" ON public.farmer_details;

-- 2) Create a public view exposing ONLY safe columns. Uses SECURITY DEFINER semantics
--    (the default on older PG, explicit here) so it bypasses RLS but only returns
--    the whitelisted columns for registered farmers.
DROP VIEW IF EXISTS public.public_farmer_details;
CREATE VIEW public.public_farmer_details
WITH (security_invoker = false) AS
SELECT
  id,
  user_id,
  company_name,
  cae_code,
  address,
  website,
  description,
  initial_score,
  pickup_days,
  registration_step,
  created_at,
  updated_at
FROM public.farmer_details
WHERE registration_step = 2;

GRANT SELECT ON public.public_farmer_details TO anon, authenticated;

-- 3) Lock down SECURITY DEFINER functions so they are not directly callable
--    by anon / authenticated where they shouldn't be.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_owns_farmer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_farmer(uuid) TO authenticated;

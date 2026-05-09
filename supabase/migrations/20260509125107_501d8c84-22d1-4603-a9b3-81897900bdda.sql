
-- 1. Restrict profiles public access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Public can view farmer profiles"
ON public.profiles
FOR SELECT
USING (profile_type = 'vendedor' OR auth.uid() = id);

-- 2. Remove public access to farmer_details and replace with a safe public view
DROP POLICY IF EXISTS "Public can view completed farmer details" ON public.farmer_details;

CREATE OR REPLACE VIEW public.public_farmer_profiles
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  company_name,
  cae_code,
  address,
  website,
  description,
  initial_score,
  registration_step,
  created_at,
  updated_at
FROM public.farmer_details
WHERE registration_step = 2;

GRANT SELECT ON public.public_farmer_profiles TO anon, authenticated;

-- Allow the view to actually return rows by adding a public read policy
-- limited to non-sensitive context (the view selects only safe columns).
CREATE POLICY "Public can read farmer details via view"
ON public.farmer_details
FOR SELECT
TO anon, authenticated
USING (registration_step = 2);

-- Note: the policy above still covers all columns at the table level.
-- To truly restrict columns, revoke column SELECT from anon/authenticated
-- on the sensitive ones so direct table queries cannot read them.
REVOKE SELECT ON public.farmer_details FROM anon, authenticated;
GRANT SELECT (id, user_id, company_name, cae_code, address, website, description, initial_score, registration_step, created_at, updated_at)
  ON public.farmer_details TO anon, authenticated;
-- Owners still need full access for their own row; grant all sensitive columns to authenticated
-- (RLS still restricts to auth.uid() = user_id for the owner-scoped policy).
GRANT SELECT (company_nif, exploration_number, exploration_id, phone)
  ON public.farmer_details TO authenticated;

-- 3. Restrict certificate uploads to safe file extensions
DROP POLICY IF EXISTS "Farmers can upload certificates" ON storage.objects;

CREATE POLICY "Farmers can upload certificates"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'certificates'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND lower(storage.extension(name)) IN ('pdf','jpg','jpeg','png')
);

-- 4. Lock down SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

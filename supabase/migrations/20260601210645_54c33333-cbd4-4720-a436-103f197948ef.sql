DROP POLICY IF EXISTS "Public can read registered farmers (safe cols only)" ON public.farmer_details;

CREATE OR REPLACE VIEW public.farmer_public AS
SELECT id, user_id, company_name, cae_code, address, website, description,
       initial_score, registration_step, pickup_days, created_at, updated_at
FROM public.farmer_details
WHERE registration_step = 2;

GRANT SELECT ON public.farmer_public TO anon, authenticated;
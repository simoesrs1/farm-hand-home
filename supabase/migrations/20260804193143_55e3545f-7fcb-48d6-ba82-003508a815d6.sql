CREATE OR REPLACE VIEW public.public_farmer_profiles AS
SELECT id, user_id, company_name, cae_code, address, website, description,
       initial_score, registration_step, created_at, updated_at,
       pickup_lat, pickup_lng
FROM public.farmer_details
WHERE registration_step = 2;
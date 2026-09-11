DROP VIEW IF EXISTS public.public_farmer_profiles;
CREATE VIEW public.public_farmer_profiles
WITH (security_invoker = off) AS
 SELECT id,
    user_id,
    company_name,
    cae_code,
    address,
    website,
    description,
    initial_score,
    registration_step,
    created_at,
    updated_at,
    pickup_address,
    pickup_lat,
    pickup_lng,
    pickup_hours,
    pickup_hours_note,
    delivery_radius_km,
    delivery_hours,
    delivery_note
   FROM farmer_details
  WHERE registration_step = 2;

GRANT SELECT ON public.public_farmer_profiles TO anon, authenticated, service_role;
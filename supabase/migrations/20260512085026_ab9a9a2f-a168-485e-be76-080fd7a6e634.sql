
-- Drop the view created in the previous migration (replaced by column-level grants)
DROP VIEW IF EXISTS public.public_farmer_details;

-- Revoke broad table-level SELECT for anon and authenticated
REVOKE SELECT ON public.farmer_details FROM anon, authenticated;

-- Grant SELECT only on non-sensitive columns
GRANT SELECT (
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
) ON public.farmer_details TO anon, authenticated;

-- Re-add a public read policy so anon/authenticated can list registered farmers
-- (column grants above ensure they only get safe columns)
CREATE POLICY "Public can read registered farmers (safe cols only)"
  ON public.farmer_details
  FOR SELECT
  TO anon, authenticated
  USING (registration_step = 2);

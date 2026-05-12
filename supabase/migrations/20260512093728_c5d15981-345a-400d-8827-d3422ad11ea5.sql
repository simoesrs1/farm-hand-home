-- Column-level lockdown on farmer_details sensitive fields
REVOKE SELECT ON public.farmer_details FROM anon, authenticated;

GRANT SELECT (
  id, user_id, company_name, address, website, description,
  cae_code, registration_step, initial_score, pickup_days,
  created_at, updated_at
) ON public.farmer_details TO anon, authenticated;

-- Owner still needs full access to its own row (RLS already enforces ownership).
-- Provide column SELECT for sensitive cols only to authenticated; RLS policy
-- "Farmers can view own details" restricts to their own row.
GRANT SELECT (company_nif, phone, exploration_number, exploration_id)
  ON public.farmer_details TO authenticated;

-- Revoke direct EXECUTE on SECURITY DEFINER helpers from public roles.
-- RLS policies that reference these functions still work because policies
-- run with the table owner's privileges.
REVOKE EXECUTE ON FUNCTION public.user_owns_farmer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
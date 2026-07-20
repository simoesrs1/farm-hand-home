-- Prevent duplicate company NIFs across farmers (race-safe, DB-level).
CREATE UNIQUE INDEX IF NOT EXISTS farmer_details_company_nif_unique
  ON public.farmer_details (company_nif)
  WHERE company_nif IS NOT NULL AND company_nif <> '';

-- Same rationale as exploration_number_taken: RLS only exposes a farmer's
-- own row, so the client can't see whether another farmer already holds a
-- given NIF. This SECURITY DEFINER function returns only a boolean.
CREATE OR REPLACE FUNCTION public.company_nif_taken(
  p_company_nif TEXT,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farmer_details
    WHERE company_nif = p_company_nif
      AND (p_exclude_id IS NULL OR id <> p_exclude_id)
  );
$$;

REVOKE ALL ON FUNCTION public.company_nif_taken(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_nif_taken(TEXT, UUID) TO authenticated;

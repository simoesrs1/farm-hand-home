-- Prevent duplicate exploration numbers across farmers (race-safe, DB-level).
CREATE UNIQUE INDEX IF NOT EXISTS farmer_details_exploration_number_unique
  ON public.farmer_details (exploration_number)
  WHERE exploration_number IS NOT NULL AND exploration_number <> '';

-- RLS on farmer_details only lets a farmer see their own row (plus a public
-- view of completed profiles), so the client can never see whether another
-- farmer already holds a given exploration_number. This SECURITY DEFINER
-- function performs that check server-side and returns only a boolean,
-- never leaking the other farmer's row.
CREATE OR REPLACE FUNCTION public.exploration_number_taken(
  p_exploration_number TEXT,
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
    WHERE exploration_number = p_exploration_number
      AND (p_exclude_id IS NULL OR id <> p_exclude_id)
  );
$$;

REVOKE ALL ON FUNCTION public.exploration_number_taken(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exploration_number_taken(TEXT, UUID) TO authenticated;

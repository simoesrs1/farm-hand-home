
-- 1. Add verification_status to farmer_details
ALTER TABLE public.farmer_details
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'verified';

-- 2. Helper function for product visibility
CREATE OR REPLACE FUNCTION public.farmer_is_verified(_farmer_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT verification_status = 'verified' FROM public.farmer_details WHERE id = _farmer_id),
    false
  );
$$;

-- 3. Update products SELECT policy
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (
  (active = true AND public.farmer_is_verified(farmer_id))
  OR public.user_owns_farmer(farmer_id)
);

-- 4. Change requests table
CREATE TABLE IF NOT EXISTS public.farmer_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmer_details(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  requested_changes jsonb NOT NULL,
  justification text NOT NULL,
  document_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  review_deadline timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.farmer_change_requests TO authenticated;
GRANT ALL ON public.farmer_change_requests TO service_role;

ALTER TABLE public.farmer_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmer can view own change requests"
ON public.farmer_change_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Farmer can insert own change requests"
ON public.farmer_change_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.user_owns_farmer(farmer_id));

CREATE TRIGGER trg_farmer_change_requests_updated_at
BEFORE UPDATE ON public.farmer_change_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Lock farmer on new change request
CREATE OR REPLACE FUNCTION public.lock_farmer_on_change_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.farmer_details
    SET verification_status = 'pending_review'
  WHERE id = NEW.farmer_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lock_farmer_on_change_request
AFTER INSERT ON public.farmer_change_requests
FOR EACH ROW EXECUTE FUNCTION public.lock_farmer_on_change_request();

-- 6. Storage policies for change-request-docs
CREATE POLICY "Farmer can upload own change-request docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'change-request-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Farmer can view own change-request docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'change-request-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

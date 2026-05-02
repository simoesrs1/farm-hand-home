ALTER TABLE public.farmer_details
  ADD COLUMN IF NOT EXISTS exploration_number TEXT,
  ADD COLUMN IF NOT EXISTS exploration_id TEXT,
  ADD COLUMN IF NOT EXISTS company_nif TEXT;

ALTER TABLE public.farmer_certificates
  ADD COLUMN IF NOT EXISTS certificate_type TEXT;
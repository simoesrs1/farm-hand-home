
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmer_details(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  is_organic boolean NOT NULL DEFAULT false,
  is_lactose_free boolean NOT NULL DEFAULT false,
  has_modifications boolean NOT NULL DEFAULT false,
  modifications_description text,
  unit text NOT NULL DEFAULT 'kg',
  farmer_price numeric(10,2) NOT NULL CHECK (farmer_price >= 0),
  client_price numeric(10,2) NOT NULL CHECK (client_price >= 0),
  media_urls text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (active = true OR public.user_owns_farmer(farmer_id));

CREATE POLICY "Farmer can insert own products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_farmer(farmer_id));

CREATE POLICY "Farmer can update own products"
  ON public.products FOR UPDATE TO authenticated
  USING (public.user_owns_farmer(farmer_id))
  WITH CHECK (public.user_owns_farmer(farmer_id));

CREATE POLICY "Farmer can delete own products"
  ON public.products FOR DELETE TO authenticated
  USING (public.user_owns_farmer(farmer_id));

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX products_farmer_id_idx ON public.products(farmer_id);

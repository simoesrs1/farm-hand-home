CREATE TABLE public.market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text,
  unit text NOT NULL DEFAULT 'kg',
  avg_price numeric NOT NULL CHECK (avg_price > 0),
  sample_size integer NOT NULL DEFAULT 0,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  collected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.market_prices TO anon;
GRANT SELECT ON public.market_prices TO authenticated;
GRANT ALL ON public.market_prices TO service_role;

ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view market prices"
ON public.market_prices FOR SELECT
USING (true);

CREATE TRIGGER market_prices_updated_at
BEFORE UPDATE ON public.market_prices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX market_prices_category_idx ON public.market_prices (category);
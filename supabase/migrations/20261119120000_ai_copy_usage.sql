-- Consumo da IA que escreve descrições (Edge Function generate-product-description).
--
-- Uma linha por geração: serve para o limite diário por agricultor e para acompanhar
-- os custos (tokens). Só a Edge Function (service_role) lê e escreve; os
-- utilizadores não têm acesso. Ver docs/ia-descricoes.md.

CREATE TABLE public.ai_copy_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmer_details(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('product', 'experience', 'stay')),
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_copy_usage_farmer_created ON public.ai_copy_usage (farmer_id, created_at DESC);

ALTER TABLE public.ai_copy_usage ENABLE ROW LEVEL SECURITY;

-- Sem políticas para utilizadores: só a Edge Function, com service_role.
REVOKE ALL ON public.ai_copy_usage FROM anon, authenticated;
GRANT ALL ON public.ai_copy_usage TO service_role;

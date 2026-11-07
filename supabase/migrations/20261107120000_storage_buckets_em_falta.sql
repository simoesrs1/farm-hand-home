-- Buckets que foram criados à mão no Lovable e que nenhuma migração criava.
-- As policies destes buckets já existem nas migrações anteriores
-- (20260618235811, 20260619001146, 20260705134050, 20260722182158).
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('product-media', 'product-media', false),
  ('change-request-docs', 'change-request-docs', false)
ON CONFLICT (id) DO NOTHING;

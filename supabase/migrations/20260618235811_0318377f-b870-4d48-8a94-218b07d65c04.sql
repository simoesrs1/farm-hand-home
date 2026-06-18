
CREATE POLICY "Authenticated can view product media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-media');

CREATE POLICY "Farmer can upload own product media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Farmer can update own product media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Farmer can delete own product media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

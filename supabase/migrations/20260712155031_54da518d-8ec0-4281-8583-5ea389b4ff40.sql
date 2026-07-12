DROP POLICY IF EXISTS "Users manage own avatar metadata" ON public.media;
CREATE POLICY "Users manage own avatar metadata"
ON public.media
FOR ALL
TO authenticated
USING (
  uploaded_by = auth.uid()
  AND file_url LIKE '%/media/avatars/' || auth.uid()::text || '/%'
)
WITH CHECK (
  uploaded_by = auth.uid()
  AND file_url LIKE '%/media/avatars/' || auth.uid()::text || '/%'
);
-- Restringe professores a arquivos próprios no bucket de mídia.
ALTER POLICY "media staff delete" ON storage.objects
USING (
  bucket_id = 'media'::text
  AND (
    private.is_admin_level(auth.uid())
    OR private.has_role(auth.uid(), 'secretary'::public.app_role)
    OR (
      private.has_role(auth.uid(), 'teacher'::public.app_role)
      AND name LIKE auth.uid()::text || '/%'
    )
  )
);

ALTER POLICY "media staff update" ON storage.objects
USING (
  bucket_id = 'media'::text
  AND (
    private.is_admin_level(auth.uid())
    OR private.has_role(auth.uid(), 'secretary'::public.app_role)
    OR (
      private.has_role(auth.uid(), 'teacher'::public.app_role)
      AND name LIKE auth.uid()::text || '/%'
    )
  )
)
WITH CHECK (
  bucket_id = 'media'::text
  AND (
    private.is_admin_level(auth.uid())
    OR private.has_role(auth.uid(), 'secretary'::public.app_role)
    OR (
      private.has_role(auth.uid(), 'teacher'::public.app_role)
      AND name LIKE auth.uid()::text || '/%'
    )
  )
);

ALTER POLICY "media staff write" ON storage.objects
WITH CHECK (
  bucket_id = 'media'::text
  AND (
    private.is_admin_level(auth.uid())
    OR private.has_role(auth.uid(), 'secretary'::public.app_role)
    OR (
      private.has_role(auth.uid(), 'teacher'::public.app_role)
      AND name LIKE auth.uid()::text || '/%'
    )
  )
);
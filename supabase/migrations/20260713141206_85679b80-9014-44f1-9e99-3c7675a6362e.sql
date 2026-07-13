
-- Ensure clean, consistent RLS for profile avatar uploads under avatars/{auth.uid()}/...
DROP POLICY IF EXISTS "Users upload own profile avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users update own profile avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own profile avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users view own profile avatars" ON storage.objects;

CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'media' AND name LIKE 'avatars/%');

CREATE POLICY "avatars_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND name LIKE ('avatars/' || auth.uid()::text || '/%')
);

CREATE POLICY "avatars_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND name LIKE ('avatars/' || auth.uid()::text || '/%')
)
WITH CHECK (
  bucket_id = 'media'
  AND name LIKE ('avatars/' || auth.uid()::text || '/%')
);

CREATE POLICY "avatars_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND name LIKE ('avatars/' || auth.uid()::text || '/%')
);

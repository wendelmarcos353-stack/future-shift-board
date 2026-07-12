-- Corrige políticas que causam "new row violates row-level security policy" em operações autorizadas.
-- O caso observado no frontend é o upload de foto de perfil, que escreve em storage.objects.
-- As políticas abaixo mantêm isolamento por usuário e preservam acesso administrativo.

-- Profiles: deixa explícita a validação do novo registro em UPDATE.
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Media metadata: usuários podem registrar/remover apenas seus próprios avatares;
-- equipe mantém gerenciamento amplo conforme políticas existentes.
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

-- Storage bucket media: permite que qualquer usuário autenticado gerencie somente o próprio avatar.
DROP POLICY IF EXISTS "Users upload own profile avatars" ON storage.objects;
CREATE POLICY "Users upload own profile avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND name LIKE 'avatars/' || auth.uid()::text || '/%'
);

DROP POLICY IF EXISTS "Users update own profile avatars" ON storage.objects;
CREATE POLICY "Users update own profile avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND name LIKE 'avatars/' || auth.uid()::text || '/%'
)
WITH CHECK (
  bucket_id = 'media'
  AND name LIKE 'avatars/' || auth.uid()::text || '/%'
);

DROP POLICY IF EXISTS "Users delete own profile avatars" ON storage.objects;
CREATE POLICY "Users delete own profile avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND name LIKE 'avatars/' || auth.uid()::text || '/%'
);

-- Horários: secretaria/direção gerenciam tudo; professor altera apenas registros próprios.
DROP POLICY IF EXISTS "schedules teacher update own" ON public.schedules;
CREATE POLICY "schedules teacher manage own"
ON public.schedules
FOR ALL
TO authenticated
USING (
  teacher_id = auth.uid()
  OR is_admin_level(auth.uid())
  OR has_role(auth.uid(), 'secretary'::app_role)
)
WITH CHECK (
  teacher_id = auth.uid()
  OR is_admin_level(auth.uid())
  OR has_role(auth.uid(), 'secretary'::app_role)
);

-- Aulas: professor gerencia apenas aulas próprias/criadas por ele; secretaria/direção mantêm acesso completo.
DROP POLICY IF EXISTS "lessons staff manage" ON public.lessons;
CREATE POLICY "lessons staff and teacher scoped manage"
ON public.lessons
FOR ALL
TO authenticated
USING (
  is_admin_level(auth.uid())
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR teacher_id = auth.uid()
  OR created_by = auth.uid()
)
WITH CHECK (
  is_admin_level(auth.uid())
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR teacher_id = auth.uid()
  OR created_by = auth.uid()
);

-- Conteúdos: professor gerencia apenas conteúdo próprio; secretaria/direção gerenciam tudo.
DROP POLICY IF EXISTS "Staff manage contents" ON public.contents;
CREATE POLICY "contents staff and author manage"
ON public.contents
FOR ALL
TO authenticated
USING (
  is_admin_level(auth.uid())
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR author_id = auth.uid()
)
WITH CHECK (
  is_admin_level(auth.uid())
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR author_id = auth.uid()
);

-- Provas/eventos: professor gerencia apenas provas vinculadas a ele ou criadas por ele.
DROP POLICY IF EXISTS "exams staff manage" ON public.exams;
CREATE POLICY "exams staff and teacher scoped manage"
ON public.exams
FOR ALL
TO authenticated
USING (
  is_admin_level(auth.uid())
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR teacher_id = auth.uid()
  OR created_by = auth.uid()
)
WITH CHECK (
  is_admin_level(auth.uid())
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR teacher_id = auth.uid()
  OR created_by = auth.uid()
);

-- Defaults seguros para campos de autoria usados pelas políticas.
ALTER TABLE public.contents ALTER COLUMN author_id SET DEFAULT auth.uid();
ALTER TABLE public.media ALTER COLUMN uploaded_by SET DEFAULT auth.uid();
-- Move helpers de cargo para um schema interno e remove execução direta pelo cliente.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION private.is_admin_level(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('master'::public.app_role, 'admin'::public.app_role)
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_any_role(uuid, public.app_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin_level(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_any_role(uuid, public.app_role[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin_level(uuid) TO anon, authenticated, service_role;

-- public.announcements
ALTER POLICY "ann manage" ON public.announcements
USING (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role))
WITH CHECK (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role));
ALTER POLICY "ann public read" ON public.announcements
USING ((active = true) OR private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role));

-- public.categories
ALTER POLICY "Staff manage categories" ON public.categories
USING (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role))
WITH CHECK (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role));

-- public.classes
ALTER POLICY "classes admin manage" ON public.classes
USING (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role))
WITH CHECK (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role));

-- public.contents
ALTER POLICY "Published contents public" ON public.contents
USING ((status = 'published'::text) OR private.is_admin_level(auth.uid()) OR author_id = auth.uid());
ALTER POLICY "contents staff and author manage" ON public.contents
USING (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR author_id = auth.uid())
WITH CHECK (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR author_id = auth.uid());

-- public.exams
ALTER POLICY "exams staff and teacher scoped manage" ON public.exams
USING (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR teacher_id = auth.uid() OR created_by = auth.uid())
WITH CHECK (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR teacher_id = auth.uid() OR created_by = auth.uid());

-- public.lessons
ALTER POLICY "lessons staff and teacher scoped manage" ON public.lessons
USING (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR teacher_id = auth.uid() OR created_by = auth.uid())
WITH CHECK (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR teacher_id = auth.uid() OR created_by = auth.uid());

-- public.media
ALTER POLICY "Staff manage media" ON public.media
USING (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR (private.has_role(auth.uid(), 'teacher'::public.app_role) AND uploaded_by = auth.uid()))
WITH CHECK (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR (private.has_role(auth.uid(), 'teacher'::public.app_role) AND uploaded_by = auth.uid()));
ALTER POLICY "Staff read media" ON public.media
USING (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR (private.has_role(auth.uid(), 'teacher'::public.app_role) AND uploaded_by = auth.uid()));

-- public.menu_pages
ALTER POLICY "menu_pages admin manage" ON public.menu_pages
USING (private.is_admin_level(auth.uid()))
WITH CHECK (private.is_admin_level(auth.uid()));

-- public.permissions
ALTER POLICY "perm_master_write" ON public.permissions
USING (private.has_role(auth.uid(), 'master'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'master'::public.app_role));
ALTER POLICY "perm_read_admin" ON public.permissions
USING (private.is_admin_level(auth.uid()));

-- public.profiles
ALTER POLICY "profiles_admin_select" ON public.profiles
USING (private.is_admin_level(auth.uid()));
ALTER POLICY "profiles_master_all" ON public.profiles
USING (private.has_role(auth.uid(), 'master'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'master'::public.app_role));

-- public.schedules
ALTER POLICY "schedules sec manage" ON public.schedules
USING (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role))
WITH CHECK (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role));
ALTER POLICY "schedules teacher manage own" ON public.schedules
USING (teacher_id = auth.uid() OR private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role))
WITH CHECK (teacher_id = auth.uid() OR private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role));

-- public.site_settings
ALTER POLICY "Staff manage settings" ON public.site_settings
USING (private.is_admin_level(auth.uid()))
WITH CHECK (private.is_admin_level(auth.uid()));

-- public.student_classes
ALTER POLICY "student_classes admin manage" ON public.student_classes
USING (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role))
WITH CHECK (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role));
ALTER POLICY "student_classes own read" ON public.student_classes
USING (user_id = auth.uid() OR private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role));

-- public.teacher_classes
ALTER POLICY "teacher_classes admin manage" ON public.teacher_classes
USING (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role))
WITH CHECK (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role));
ALTER POLICY "teacher_classes read scoped" ON public.teacher_classes
USING (private.has_any_role(auth.uid(), ARRAY['master'::public.app_role, 'admin'::public.app_role, 'secretary'::public.app_role]) OR user_id = auth.uid());

-- public.teachers
ALTER POLICY "teachers admin manage" ON public.teachers
USING (private.is_admin_level(auth.uid()))
WITH CHECK (private.is_admin_level(auth.uid()));

-- public.tv_settings
ALTER POLICY "tv admin manage" ON public.tv_settings
USING (private.is_admin_level(auth.uid()))
WITH CHECK (private.is_admin_level(auth.uid()));

-- public.user_roles
ALTER POLICY "Admins manage roles" ON public.user_roles
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "roles_master_all" ON public.user_roles
USING (private.has_role(auth.uid(), 'master'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'master'::public.app_role));
ALTER POLICY "user_roles restrict writes to admins" ON public.user_roles
USING (private.is_admin_level(auth.uid()))
WITH CHECK (private.is_admin_level(auth.uid()));

-- storage.objects: remove políticas antigas redundantes só para admin e atualiza as amplas para helper interno.
DROP POLICY IF EXISTS "Admins delete media" ON storage.objects;
DROP POLICY IF EXISTS "Admins update media" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload media" ON storage.objects;
ALTER POLICY "media staff delete" ON storage.objects
USING ((bucket_id = 'media'::text) AND (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR private.has_role(auth.uid(), 'teacher'::public.app_role)));
ALTER POLICY "media staff update" ON storage.objects
USING ((bucket_id = 'media'::text) AND (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR private.has_role(auth.uid(), 'teacher'::public.app_role)))
WITH CHECK ((bucket_id = 'media'::text) AND (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR private.has_role(auth.uid(), 'teacher'::public.app_role)));
ALTER POLICY "media staff write" ON storage.objects
WITH CHECK ((bucket_id = 'media'::text) AND (private.is_admin_level(auth.uid()) OR private.has_role(auth.uid(), 'secretary'::public.app_role) OR private.has_role(auth.uid(), 'teacher'::public.app_role)));

-- Remove a chamada direta dos helpers antigos no schema público.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_level(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_level(uuid) TO service_role;
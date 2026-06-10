-- 1) Fix SECURITY DEFINER view
DROP VIEW IF EXISTS public.teacher_directory;
CREATE VIEW public.teacher_directory
WITH (security_invoker = on) AS
SELECT id, display_name FROM public.profiles WHERE active = true;
GRANT SELECT ON public.teacher_directory TO anon, authenticated;

-- 2) Remove direct user INSERT into audit_logs (only triggers/service role write)
DROP POLICY IF EXISTS "audit auth insert" ON public.audit_logs;

-- 3) Restrictive policy on user_roles to block self-privilege escalation
CREATE POLICY "user_roles restrict writes to admins"
ON public.user_roles AS RESTRICTIVE
FOR ALL TO authenticated
USING (public.is_admin_level(auth.uid()))
WITH CHECK (public.is_admin_level(auth.uid()));

-- 4) Trigger-only SECURITY DEFINER functions: revoke from anon/authenticated
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_table_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 5) Storage: drop broad public SELECT so bucket files can't be listed.
-- Public-URL access (`/storage/v1/object/public/...`) bypasses RLS and still works.
DROP POLICY IF EXISTS "media public read" ON storage.objects;
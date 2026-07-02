
-- Restrict permissions table SELECT to admin-level only
DROP POLICY IF EXISTS perm_read_auth ON public.permissions;
CREATE POLICY perm_read_admin ON public.permissions FOR SELECT TO authenticated USING (public.is_admin_level(auth.uid()));

-- Allow admin-level to SELECT all profiles
CREATE POLICY profiles_admin_select ON public.profiles FOR SELECT TO authenticated USING (public.is_admin_level(auth.uid()));

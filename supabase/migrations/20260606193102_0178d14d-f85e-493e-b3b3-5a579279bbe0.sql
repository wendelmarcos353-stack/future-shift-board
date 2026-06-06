
-- 1. Permissions table (matrix per role)
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL UNIQUE,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_manage_users boolean NOT NULL DEFAULT false,
  can_manage_tv boolean NOT NULL DEFAULT false,
  can_manage_classes boolean NOT NULL DEFAULT false,
  can_manage_schedules boolean NOT NULL DEFAULT false,
  can_manage_content boolean NOT NULL DEFAULT false,
  can_manage_pages boolean NOT NULL DEFAULT false,
  can_manage_menu boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perm_read_auth" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "perm_master_write" ON public.permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));
CREATE TRIGGER trg_permissions_updated BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.permissions (role, can_create, can_edit, can_delete, can_manage_users, can_manage_tv, can_manage_classes, can_manage_schedules, can_manage_content, can_manage_pages, can_manage_menu) VALUES
  ('master',    true, true, true, true, true, true, true, true, true, true),
  ('admin',     true, true, true, false, true, true, true, true, true, true),
  ('secretary', true, true, false, false, false, true, true, true, false, false),
  ('teacher',   true, true, false, false, false, false, false, true, false, false),
  ('student',   false, false, false, false, false, false, false, false, false, false),
  ('user',      false, false, false, false, false, false, false, false, false, false),
  ('visitor',   false, false, false, false, false, false, false, false, false, false)
ON CONFLICT (role) DO NOTHING;

-- 2. Profiles: add blocking + email mirror
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS blocked_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;

-- backfill emails from auth.users
UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id AND p.email IS NULL;

-- update handle_new_user to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

-- 3. Generic audit trigger
CREATE OR REPLACE FUNCTION public.audit_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_id text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW); v_id := (NEW).id::text;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_id := (NEW).id::text;
  ELSIF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD); v_id := (OLD).id::text;
  END IF;
  INSERT INTO public.audit_logs(user_id, action, module, record_id, old_value, new_value)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, v_id, v_old, v_new);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach audit triggers to key tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['classes','schedules','announcements','menu_pages','tv_settings','user_roles','profiles','permissions']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_table_change()', t, t);
  END LOOP;
END$$;

-- 4. Block check on profile read (used by client to enforce signout)
-- (frontend will check blocked_until)

-- 5. Allow masters to manage all user_roles & profiles
DROP POLICY IF EXISTS "roles_master_all" ON public.user_roles;
CREATE POLICY "roles_master_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "profiles_master_all" ON public.profiles;
CREATE POLICY "profiles_master_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));

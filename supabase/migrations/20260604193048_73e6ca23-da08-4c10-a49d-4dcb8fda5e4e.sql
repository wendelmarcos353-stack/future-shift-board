-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS phone text;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION public.is_admin_level(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('master'::app_role,'admin'::app_role))
$$;

CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  grade int NOT NULL,
  active boolean NOT NULL DEFAULT true,
  order_position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classes public read" ON public.classes FOR SELECT USING (true);
CREATE POLICY "classes admin manage" ON public.classes FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'::app_role))
  WITH CHECK (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'::app_role));
CREATE TRIGGER classes_updated BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.teachers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teachers read auth" ON public.teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "teachers admin manage" ON public.teachers FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid())) WITH CHECK (public.is_admin_level(auth.uid()));

CREATE TABLE IF NOT EXISTS public.student_classes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, class_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_classes TO authenticated;
GRANT ALL ON public.student_classes TO service_role;
ALTER TABLE public.student_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_classes own read" ON public.student_classes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'::app_role));
CREATE POLICY "student_classes admin manage" ON public.student_classes FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'::app_role))
  WITH CHECK (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'::app_role));

CREATE TABLE IF NOT EXISTS public.teacher_classes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, class_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_classes TO authenticated;
GRANT ALL ON public.teacher_classes TO service_role;
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_classes read auth" ON public.teacher_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "teacher_classes admin manage" ON public.teacher_classes FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'::app_role))
  WITH CHECK (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'::app_role));

CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  room text,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  content_taught text,
  notes text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.schedules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules TO authenticated;
GRANT ALL ON public.schedules TO service_role;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedules public read" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "schedules sec manage" ON public.schedules FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'::app_role))
  WITH CHECK (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'::app_role));
CREATE POLICY "schedules teacher update own" ON public.schedules FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER schedules_updated BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal',
  target_scope jsonb NOT NULL DEFAULT '{"type":"all"}'::jsonb,
  start_date timestamptz,
  end_date timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann public read" ON public.announcements FOR SELECT
  USING (active = true OR public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'::app_role));
CREATE POLICY "ann manage" ON public.announcements FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'::app_role))
  WITH CHECK (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'::app_role));
CREATE TRIGGER ann_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.menu_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  color text,
  order_position int NOT NULL DEFAULT 0,
  visibility jsonb NOT NULL DEFAULT '{"roles":["visitor","student","teacher","secretary","admin","master"]}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_pages TO authenticated;
GRANT ALL ON public.menu_pages TO service_role;
ALTER TABLE public.menu_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_pages public read" ON public.menu_pages FOR SELECT USING (true);
CREATE POLICY "menu_pages admin manage" ON public.menu_pages FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid())) WITH CHECK (public.is_admin_level(auth.uid()));
CREATE TRIGGER menu_pages_updated BEFORE UPDATE ON public.menu_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.tv_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_seconds int NOT NULL DEFAULT 30,
  theme text DEFAULT 'cyberpunk',
  logo_url text,
  background_url text,
  show_clock boolean NOT NULL DEFAULT true,
  show_news boolean NOT NULL DEFAULT true,
  show_announcements boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tv_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_settings TO authenticated;
GRANT ALL ON public.tv_settings TO service_role;
ALTER TABLE public.tv_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv public read" ON public.tv_settings FOR SELECT USING (true);
CREATE POLICY "tv admin manage" ON public.tv_settings FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid())) WITH CHECK (public.is_admin_level(auth.uid()));
CREATE TRIGGER tv_settings_updated BEFORE UPDATE ON public.tv_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  module text NOT NULL,
  record_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit admin read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin_level(auth.uid()));
CREATE POLICY "audit auth insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;

INSERT INTO public.classes (name, grade, order_position) VALUES
 ('1A',1,1),('1B',1,2),('1C',1,3),('1D',1,4),
 ('2A',2,5),('2B',2,6),('2C',2,7),('2D',2,8),
 ('3A',3,9),('3B',3,10),('3C',3,11),('3D',3,12)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.tv_settings (rotation_seconds) SELECT 30
WHERE NOT EXISTS (SELECT 1 FROM public.tv_settings);

INSERT INTO public.menu_pages (title, slug, icon, color, order_position) VALUES
  ('Início','/','Home','cyan',1),
  ('Horários','/horarios','Calendar','purple',2),
  ('Avisos','/avisos','Bell','pink',3),
  ('Modo TV','/tv','Tv','cyan',4)
ON CONFLICT (slug) DO NOTHING;
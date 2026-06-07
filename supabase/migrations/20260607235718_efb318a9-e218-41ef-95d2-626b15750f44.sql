
-- ============ Fix RLS: allow master/admin/secretary to manage shared resources ============
DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Staff manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'))
  WITH CHECK (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'));

DROP POLICY IF EXISTS "Admins manage media" ON public.media;
DROP POLICY IF EXISTS "Admins read media" ON public.media;
CREATE POLICY "Staff manage media" ON public.media
  FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'teacher'))
  WITH CHECK (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "Staff read media" ON public.media
  FOR SELECT TO authenticated
  USING (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'teacher'));

DROP POLICY IF EXISTS "Admins manage contents" ON public.contents;
CREATE POLICY "Staff manage contents" ON public.contents
  FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'))
  WITH CHECK (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary'));

DROP POLICY IF EXISTS "Admins manage settings" ON public.site_settings;
CREATE POLICY "Staff manage settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid()))
  WITH CHECK (public.is_admin_level(auth.uid()));

-- Storage policies for 'media' bucket
DROP POLICY IF EXISTS "media public read" ON storage.objects;
DROP POLICY IF EXISTS "media staff write" ON storage.objects;
DROP POLICY IF EXISTS "media staff update" ON storage.objects;
DROP POLICY IF EXISTS "media staff delete" ON storage.objects;
CREATE POLICY "media public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "media staff write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id='media' AND (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'teacher')));
CREATE POLICY "media staff update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id='media' AND (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'teacher')));
CREATE POLICY "media staff delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id='media' AND (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'teacher')));

-- ============ Seed missing class 2D + ensure 1A..3D categories exist ============
INSERT INTO public.classes (name, grade, order_position, active)
VALUES ('2D', 2, 8, true)
ON CONFLICT (name) DO NOTHING;

-- Re-number order_position to canonical 1A..3D
UPDATE public.classes SET order_position = CASE name
  WHEN '1A' THEN 1 WHEN '1B' THEN 2 WHEN '1C' THEN 3 WHEN '1D' THEN 4
  WHEN '2A' THEN 5 WHEN '2B' THEN 6 WHEN '2C' THEN 7 WHEN '2D' THEN 8
  WHEN '3A' THEN 9 WHEN '3B' THEN 10 WHEN '3C' THEN 11 WHEN '3D' THEN 12
  ELSE order_position END;

INSERT INTO public.categories (name, color) VALUES
  ('1º Ano','#3b82f6'),('1A','#3b82f6'),('1B','#3b82f6'),('1C','#3b82f6'),('1D','#3b82f6'),
  ('2º Ano','#8b5cf6'),('2A','#8b5cf6'),('2B','#8b5cf6'),('2C','#8b5cf6'),('2D','#8b5cf6'),
  ('3º Ano','#ec4899'),('3A','#ec4899'),('3B','#ec4899'),('3C','#ec4899'),('3D','#ec4899')
ON CONFLICT DO NOTHING;

-- ============ LESSONS ============
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  room text,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6),
  lesson_date date,
  start_time time NOT NULL,
  end_time time NOT NULL,
  content text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons public read" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "lessons staff manage" ON public.lessons
  FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary') OR teacher_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary') OR teacher_id = auth.uid() OR created_by = auth.uid());

CREATE TRIGGER lessons_updated BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_audit_lessons AFTER INSERT OR UPDATE OR DELETE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();
ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;

-- ============ EXAMS ============
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject text NOT NULL,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  room text,
  exam_date date NOT NULL,
  start_time time,
  end_time time,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exams public read" ON public.exams FOR SELECT USING (true);
CREATE POLICY "exams staff manage" ON public.exams
  FOR ALL TO authenticated
  USING (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'teacher'))
  WITH CHECK (public.is_admin_level(auth.uid()) OR public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'teacher'));

CREATE TRIGGER exams_updated BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_audit_exams AFTER INSERT OR UPDATE OR DELETE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();
ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;

-- ============ Ensure categories realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;

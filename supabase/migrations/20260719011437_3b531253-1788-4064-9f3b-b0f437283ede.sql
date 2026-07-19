
CREATE TABLE public.teacher_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  subject text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject)
);

GRANT SELECT ON public.teacher_subjects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teacher_subjects TO authenticated;
GRANT ALL ON public.teacher_subjects TO service_role;

ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_subjects_read_all" ON public.teacher_subjects FOR SELECT USING (true);
CREATE POLICY "teacher_subjects_staff_write" ON public.teacher_subjects
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['master','admin','secretary']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['master','admin','secretary']::app_role[]));

CREATE TRIGGER trg_teacher_subjects_updated_at
  BEFORE UPDATE ON public.teacher_subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_teacher_subjects_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.teacher_subjects
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

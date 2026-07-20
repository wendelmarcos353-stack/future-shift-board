
DROP POLICY IF EXISTS teacher_subjects_staff_write ON public.teacher_subjects;
DROP POLICY IF EXISTS teacher_subjects_read_all ON public.teacher_subjects;

CREATE POLICY "teacher_subjects_read_all" ON public.teacher_subjects
  FOR SELECT TO public USING (true);

CREATE POLICY "teacher_subjects_auth_insert" ON public.teacher_subjects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "teacher_subjects_auth_update" ON public.teacher_subjects
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "teacher_subjects_auth_delete" ON public.teacher_subjects
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_subjects TO authenticated;
GRANT SELECT ON public.teacher_subjects TO anon;

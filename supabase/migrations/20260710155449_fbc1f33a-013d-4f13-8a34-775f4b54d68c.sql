DROP POLICY IF EXISTS "teacher_classes read auth" ON public.teacher_classes;
CREATE POLICY "teacher_classes read scoped" ON public.teacher_classes
FOR SELECT TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['master','admin','secretary']::app_role[])
  OR user_id = auth.uid()
);
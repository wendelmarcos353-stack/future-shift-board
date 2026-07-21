
-- 1) teacher_subjects: restrict writes to staff or the owning teacher
DROP POLICY IF EXISTS teacher_subjects_auth_insert ON public.teacher_subjects;
DROP POLICY IF EXISTS teacher_subjects_auth_update ON public.teacher_subjects;
DROP POLICY IF EXISTS teacher_subjects_auth_delete ON public.teacher_subjects;

CREATE POLICY teacher_subjects_staff_or_owner_insert
ON public.teacher_subjects
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_admin_level(auth.uid())
  OR private.has_role(auth.uid(), 'secretary'::app_role)
  OR teacher_id = auth.uid()
);

CREATE POLICY teacher_subjects_staff_or_owner_update
ON public.teacher_subjects
FOR UPDATE
TO authenticated
USING (
  private.is_admin_level(auth.uid())
  OR private.has_role(auth.uid(), 'secretary'::app_role)
  OR teacher_id = auth.uid()
)
WITH CHECK (
  private.is_admin_level(auth.uid())
  OR private.has_role(auth.uid(), 'secretary'::app_role)
  OR teacher_id = auth.uid()
);

CREATE POLICY teacher_subjects_staff_or_owner_delete
ON public.teacher_subjects
FOR DELETE
TO authenticated
USING (
  private.is_admin_level(auth.uid())
  OR private.has_role(auth.uid(), 'secretary'::app_role)
  OR teacher_id = auth.uid()
);

-- 2) user_roles: prevent admins from granting 'master' or modifying their own role rows
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

-- Admins can manage non-master role rows for OTHER users only.
CREATE POLICY user_roles_admins_manage_non_master
ON public.user_roles
FOR ALL
TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'master'::app_role
  AND user_id <> auth.uid()
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'master'::app_role
  AND user_id <> auth.uid()
);

-- Master policy (roles_master_all) already exists and remains: master can do everything.

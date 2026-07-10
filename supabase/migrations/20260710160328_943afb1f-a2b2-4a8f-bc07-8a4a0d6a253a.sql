
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS birth_date date;

DROP VIEW IF EXISTS public.teacher_directory;
CREATE VIEW public.teacher_directory
WITH (security_invoker = true)
AS
SELECT id, display_name, avatar_url
FROM public.profiles
WHERE active = true;

GRANT SELECT ON public.teacher_directory TO anon, authenticated;

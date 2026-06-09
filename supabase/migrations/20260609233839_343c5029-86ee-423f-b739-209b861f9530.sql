CREATE OR REPLACE VIEW public.teacher_directory AS
SELECT p.id, p.display_name
FROM public.profiles p
WHERE p.active = true;

GRANT SELECT ON public.teacher_directory TO anon, authenticated;
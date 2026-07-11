-- Defaults created_by = auth.uid() on tables where the column is nullable,
-- so client inserts never fail RLS just because the column was missing.
ALTER TABLE public.announcements ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.exams ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.lessons ALTER COLUMN created_by SET DEFAULT auth.uid();

-- contents may or may not have created_by; guard with DO block
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='contents' AND column_name='created_by'
  ) THEN
    EXECUTE 'ALTER TABLE public.contents ALTER COLUMN created_by SET DEFAULT auth.uid()';
  END IF;
END $$;
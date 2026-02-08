
-- Add richer academic data columns to student_performance
ALTER TABLE public.student_performance 
  ADD COLUMN IF NOT EXISTS assignment_score numeric,
  ADD COLUMN IF NOT EXISTS assignment_total numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS mid_exam_score numeric,
  ADD COLUMN IF NOT EXISTS mid_exam_total numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS semester_score numeric,
  ADD COLUMN IF NOT EXISTS semester_total numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS lab_score numeric,
  ADD COLUMN IF NOT EXISTS lab_total numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS internal_marks numeric,
  ADD COLUMN IF NOT EXISTS internal_total numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS student_name text;

-- Make some existing columns more flexible
ALTER TABLE public.student_performance ALTER COLUMN marks DROP NOT NULL;
ALTER TABLE public.student_performance ALTER COLUMN subject SET NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_college text,
  ADD COLUMN IF NOT EXISTS exam_date date;
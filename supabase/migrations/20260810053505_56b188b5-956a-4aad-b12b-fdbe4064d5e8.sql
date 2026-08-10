
ALTER TABLE public.mock_papers ADD COLUMN IF NOT EXISTS pattern_key text NOT NULL DEFAULT 'topic';
ALTER TABLE public.mock_questions ADD COLUMN IF NOT EXISTS qtype text NOT NULL DEFAULT 'mcq';
ALTER TABLE public.mock_questions ADD COLUMN IF NOT EXISTS answer_text text;
ALTER TABLE public.mock_questions ALTER COLUMN options DROP NOT NULL;
ALTER TABLE public.mock_questions ALTER COLUMN correct_index DROP NOT NULL;

DELETE FROM public.mock_questions WHERE paper_id IN (SELECT id FROM public.mock_papers WHERE kind <> 'topic');

UPDATE public.mock_papers SET pattern_key = 'indore', duration_min = 120, question_count = 105
  WHERE kind <> 'topic' AND exam IN ('IPMAT Indore','IPM Ranchi');
UPDATE public.mock_papers SET pattern_key = 'rohtak', duration_min = 120, question_count = 120
  WHERE kind <> 'topic' AND exam = 'IPMAT Rohtak';
UPDATE public.mock_papers SET pattern_key = 'jipmat', duration_min = 150, question_count = 100
  WHERE kind <> 'topic' AND exam IN ('JIPMAT','IPM Jammu','IPM Bodh Gaya','IPM Amritsar');

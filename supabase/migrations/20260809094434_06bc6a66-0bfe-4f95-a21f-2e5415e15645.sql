
UPDATE public.mock_papers SET question_count = 45, duration_min = 90, section = 'FULL' WHERE kind = 'pyq';

INSERT INTO public.mock_papers (kind, exam, year, title, section, duration_min, question_count, sort_order)
SELECT 'pyq', e.exam, y.year, e.exam || ' ' || y.year || ' — Full Length Paper', 'FULL', 90, 45, y.year
FROM (VALUES ('IPM Jammu'), ('IPM Bodh Gaya'), ('IPM Ranchi'), ('IPM Amritsar')) AS e(exam)
CROSS JOIN (VALUES (2021),(2022),(2023),(2024),(2025)) AS y(year)
WHERE NOT EXISTS (
  SELECT 1 FROM public.mock_papers p WHERE p.kind = 'pyq' AND p.exam = e.exam AND p.year = y.year
);

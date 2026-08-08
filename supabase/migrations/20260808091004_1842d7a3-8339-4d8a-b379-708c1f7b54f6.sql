
CREATE TABLE public.mock_papers (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'pyq' check (kind in ('pyq','topic','full')),
  exam text not null,
  year int,
  title text not null,
  section text not null default 'MIXED',
  topic_slug text,
  topic_name text,
  duration_min int not null default 30,
  question_count int not null default 20,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.mock_papers TO authenticated;
GRANT ALL ON public.mock_papers TO service_role;
ALTER TABLE public.mock_papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read mock papers" ON public.mock_papers FOR SELECT TO authenticated USING (true);

CREATE TABLE public.mock_questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.mock_papers(id) on delete cascade,
  position int not null default 0,
  section text not null default 'QA',
  topic text,
  passage text,
  prompt text not null,
  options jsonb not null,
  correct_index int not null,
  solution text not null,
  trick text,
  common_mistake text,
  created_at timestamptz not null default now()
);
CREATE INDEX mock_questions_paper_idx ON public.mock_questions(paper_id, position);
GRANT SELECT ON public.mock_questions TO authenticated;
GRANT ALL ON public.mock_questions TO service_role;
ALTER TABLE public.mock_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read mock questions" ON public.mock_questions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references public.mock_papers(id) on delete cascade,
  score int not null default 0,
  total int not null default 0,
  seconds int not null default 0,
  created_at timestamptz not null default now()
);
CREATE INDEX mock_attempts_user_idx ON public.mock_attempts(user_id, created_at desc);
GRANT SELECT, INSERT ON public.mock_attempts TO authenticated;
GRANT ALL ON public.mock_attempts TO service_role;
ALTER TABLE public.mock_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own mock attempts" ON public.mock_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mock attempts" ON public.mock_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

INSERT INTO public.mock_papers (kind, exam, year, title, section, duration_min, question_count, sort_order)
SELECT 'pyq', e.exam, y.year, e.exam || ' ' || y.year || ' — Full Paper', 'MIXED', e.dur, e.qc, y.year
FROM (VALUES
  ('IPMAT Indore', 40, 24),
  ('IPMAT Rohtak', 40, 24),
  ('JIPMAT', 40, 24)
) AS e(exam, dur, qc)
CROSS JOIN (VALUES (2025),(2024),(2023),(2022),(2021),(2020),(2019)) AS y(year)
WHERE NOT (e.exam = 'JIPMAT' AND y.year < 2021);

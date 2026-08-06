CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_slug text NOT NULL UNIQUE,
  section text NOT NULL,
  chapter text NOT NULL,
  topic text NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read lessons" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed in users can cache lessons" ON public.lessons FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.topic_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  topic_slug text NOT NULL,
  status text NOT NULL DEFAULT 'learning',
  practice_correct int NOT NULL DEFAULT 0,
  practice_total int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_progress TO authenticated;
GRANT ALL ON public.topic_progress TO service_role;
ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own topic progress" ON public.topic_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.vocab_words
  ADD COLUMN IF NOT EXISTS part_of_speech text,
  ADD COLUMN IF NOT EXISTS examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS other_meanings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS antonyms text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS enriched boolean NOT NULL DEFAULT false;
GRANT UPDATE ON public.vocab_words TO authenticated;
CREATE POLICY "Signed in users can enrich words" ON public.vocab_words FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
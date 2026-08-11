
CREATE TABLE IF NOT EXISTS public.video_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_slug text NOT NULL UNIQUE,
  chapter_name text NOT NULL DEFAULT '',
  topic_name text NOT NULL DEFAULT '',
  section text NOT NULL DEFAULT 'QA',
  title text NOT NULL DEFAULT '',
  script jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.video_lessons TO authenticated;
GRANT ALL ON public.video_lessons TO service_role;

ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in students can read video lessons"
  ON public.video_lessons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Signed-in students can play lesson audio"
  ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'lesson-audio');

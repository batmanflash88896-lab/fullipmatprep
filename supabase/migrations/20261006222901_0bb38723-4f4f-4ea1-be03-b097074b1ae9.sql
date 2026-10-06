-- Restrict profile reads to the signed-in owner; the leaderboard uses a narrow server-side projection.
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Shared study content is available only through authenticated server functions.
DROP POLICY IF EXISTS "questions_read" ON public.questions;
REVOKE SELECT ON public.questions FROM authenticated;
GRANT SELECT ON public.questions TO service_role;

DROP POLICY IF EXISTS "Anyone signed in can read mock papers" ON public.mock_papers;
REVOKE SELECT ON public.mock_papers FROM authenticated;
GRANT SELECT ON public.mock_papers TO service_role;

DROP POLICY IF EXISTS "Anyone signed in can read mock questions" ON public.mock_questions;
REVOKE SELECT ON public.mock_questions FROM authenticated;
GRANT SELECT ON public.mock_questions TO service_role;

DROP POLICY IF EXISTS "vocab_words_read" ON public.vocab_words;
DROP POLICY IF EXISTS "Signed in users can enrich words" ON public.vocab_words;
REVOKE SELECT, UPDATE ON public.vocab_words FROM authenticated;
GRANT SELECT, UPDATE ON public.vocab_words TO service_role;

DROP POLICY IF EXISTS "Anyone signed in can read lessons" ON public.lessons;
DROP POLICY IF EXISTS "Signed in users can cache lessons" ON public.lessons;
REVOKE SELECT, INSERT, UPDATE ON public.lessons FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lessons TO service_role;

DROP POLICY IF EXISTS "Signed-in students can read video lessons" ON public.video_lessons;
REVOKE SELECT ON public.video_lessons FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.video_lessons TO service_role;

-- Audio remains playable through server-generated short-lived signed URLs.
DROP POLICY IF EXISTS "Signed-in students can play lesson audio" ON storage.objects;
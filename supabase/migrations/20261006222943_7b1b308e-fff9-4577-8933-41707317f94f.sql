CREATE POLICY "Authenticated direct reads are disabled" ON public.questions FOR SELECT TO authenticated USING (false);
CREATE POLICY "Authenticated direct reads are disabled" ON public.mock_papers FOR SELECT TO authenticated USING (false);
CREATE POLICY "Authenticated direct reads are disabled" ON public.mock_questions FOR SELECT TO authenticated USING (false);
CREATE POLICY "Authenticated direct reads are disabled" ON public.vocab_words FOR SELECT TO authenticated USING (false);
CREATE POLICY "Authenticated direct updates are disabled" ON public.vocab_words FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Authenticated direct reads are disabled" ON public.lessons FOR SELECT TO authenticated USING (false);
CREATE POLICY "Authenticated direct inserts are disabled" ON public.lessons FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Authenticated direct reads are disabled" ON public.video_lessons FOR SELECT TO authenticated USING (false);
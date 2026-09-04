DELETE FROM public.mock_questions a
USING public.mock_questions b
WHERE a.paper_id = b.paper_id
  AND a.position = b.position
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS mock_questions_paper_position_uidx
  ON public.mock_questions (paper_id, position);

DELETE FROM public.mock_papers a
USING public.mock_papers b
WHERE a.kind = 'topic'
  AND b.kind = 'topic'
  AND a.topic_slug = b.topic_slug
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS mock_papers_topic_slug_uidx
  ON public.mock_papers (topic_slug)
  WHERE kind = 'topic' AND topic_slug IS NOT NULL;
CREATE OR REPLACE FUNCTION public.replace_mock_questions(p_paper_id uuid, p_rows jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'Mock question replacement requires a non-empty array';
  END IF;

  PERFORM 1 FROM public.mock_papers WHERE id = p_paper_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mock paper not found';
  END IF;

  DELETE FROM public.mock_questions WHERE paper_id = p_paper_id;

  INSERT INTO public.mock_questions (
    paper_id, position, section, qtype, topic, passage, prompt, options,
    correct_index, answer_text, solution, trick, common_mistake
  )
  SELECT
    p_paper_id, q.position, q.section, q.qtype, q.topic, q.passage, q.prompt,
    q.options, q.correct_index, q.answer_text, q.solution, q.trick, q.common_mistake
  FROM jsonb_to_recordset(p_rows) AS q(
    position integer,
    section text,
    qtype text,
    topic text,
    passage text,
    prompt text,
    options jsonb,
    correct_index integer,
    answer_text text,
    solution text,
    trick text,
    common_mistake text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.replace_mock_questions(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_mock_questions(uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.replace_mock_questions(uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replace_mock_questions(uuid, jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.record_mock_attempt(
  p_attempt_id uuid,
  p_user_id uuid,
  p_paper_id uuid,
  p_score integer,
  p_total integer,
  p_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_rows integer;
BEGIN
  IF p_score < 0 OR p_total <= 0 OR p_score > p_total OR p_seconds < 0 THEN
    RAISE EXCEPTION 'Invalid mock attempt values';
  END IF;

  INSERT INTO public.mock_attempts (id, user_id, paper_id, score, total, seconds)
  VALUES (p_attempt_id, p_user_id, p_paper_id, p_score, p_total, p_seconds)
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;

  IF inserted_rows = 0 THEN
    IF EXISTS (
      SELECT 1
      FROM public.mock_attempts
      WHERE id = p_attempt_id
        AND user_id = p_user_id
        AND paper_id = p_paper_id
        AND score = p_score
        AND total = p_total
        AND seconds = p_seconds
    ) THEN
      RETURN false;
    END IF;
    RAISE EXCEPTION 'Mock attempt ID is already used for a different result';
  END IF;

  UPDATE public.profiles
  SET xp = xp + (p_score * 12) + 25
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_mock_attempt(uuid, uuid, uuid, integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_mock_attempt(uuid, uuid, uuid, integer, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.record_mock_attempt(uuid, uuid, uuid, integer, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_mock_attempt(uuid, uuid, uuid, integer, integer, integer) TO service_role;

REVOKE INSERT ON public.mock_attempts FROM authenticated;
DROP POLICY IF EXISTS "Users insert own mock attempts" ON public.mock_attempts;
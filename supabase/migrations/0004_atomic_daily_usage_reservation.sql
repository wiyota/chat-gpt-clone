-- Atomically reserve estimated usage so concurrent requests cannot bypass the
-- daily budget by observing the same pre-request total.
CREATE OR REPLACE FUNCTION public.reserve_daily_usage(
    p_user_id UUID,
    p_estimated_tokens INTEGER,
    p_daily_budget INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    reservation_id UUID;
    today_start TIMESTAMPTZ;
    current_usage BIGINT;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    IF p_estimated_tokens < 0 OR p_daily_budget < 0 THEN
        RAISE EXCEPTION 'invalid usage values';
    END IF;

    today_start := date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc';
    PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));

    SELECT COALESCE(SUM(total_tokens), 0)
      INTO current_usage
      FROM public.usage
     WHERE user_id = p_user_id
       AND created_at >= today_start;

    IF current_usage + p_estimated_tokens > p_daily_budget THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.usage (
        user_id, model, prompt_tokens, completion_tokens, total_tokens
    ) VALUES (
        p_user_id, '__reservation__', p_estimated_tokens, 0, p_estimated_tokens
    ) RETURNING id INTO reservation_id;

    RETURN reservation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_daily_usage(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_daily_usage(UUID, INTEGER, INTEGER) TO authenticated;

-- Shared per-user request limiter. The advisory lock makes the check and
-- increment atomic across all server instances.
CREATE TABLE IF NOT EXISTS public.chat_rate_limits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    window_started_at TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count >= 0)
);

ALTER TABLE public.chat_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.chat_rate_limits FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.consume_chat_rate_limit(
    p_user_id UUID,
    p_window_seconds INTEGER,
    p_max_requests INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_window_started_at TIMESTAMPTZ;
    current_request_count INTEGER;
    now_at TIMESTAMPTZ := clock_timestamp();
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    IF p_window_seconds <= 0 OR p_max_requests <= 0 THEN
        RAISE EXCEPTION 'invalid rate limit values';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 1));

    SELECT window_started_at, request_count
      INTO current_window_started_at, current_request_count
      FROM public.chat_rate_limits
     WHERE user_id = p_user_id;

    IF NOT FOUND OR now_at >= current_window_started_at + make_interval(secs => p_window_seconds) THEN
        INSERT INTO public.chat_rate_limits (user_id, window_started_at, request_count)
        VALUES (p_user_id, now_at, 1)
        ON CONFLICT (user_id) DO UPDATE
          SET window_started_at = EXCLUDED.window_started_at,
              request_count = EXCLUDED.request_count;
        RETURN TRUE;
    END IF;

    IF current_request_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;

    UPDATE public.chat_rate_limits
       SET request_count = request_count + 1
     WHERE user_id = p_user_id;
    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_chat_rate_limit(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_chat_rate_limit(UUID, INTEGER, INTEGER) TO authenticated;

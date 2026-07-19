import { env } from "../env.js";
import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

export async function consumeChatRequest(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  if (env.E2E || process.env.NODE_ENV === "development") return true;

  const { data, error } = await supabase.rpc("consume_chat_rate_limit", {
    p_user_id: userId,
    p_window_seconds: WINDOW_MS / 1000,
    p_max_requests: MAX_REQUESTS_PER_WINDOW,
  });

  if (error) {
    // Do not fail open when the shared limiter is unavailable. This also makes
    // a missing migration immediately visible instead of silently removing
    // abuse protection.
    console.error("consumeChatRequest error:", error);
    return false;
  }

  return data === true;
}

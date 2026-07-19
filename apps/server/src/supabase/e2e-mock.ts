import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env.js";

export function createE2EMockClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

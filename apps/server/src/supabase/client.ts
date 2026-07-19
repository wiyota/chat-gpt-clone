import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env.js";
import { createE2EMockClient } from "./e2e-mock.js";

export function createAdminClient(): SupabaseClient {
  if (env.E2E) return createE2EMockClient();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createUserClient(token: string): SupabaseClient {
  if (env.E2E) return createE2EMockClient();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

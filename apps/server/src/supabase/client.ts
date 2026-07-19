import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env.js";
import { createE2EMockClient } from "./e2e-mock.js";

export function createAdminClient(): SupabaseClient {
  if (env.E2E) return createE2EMockClient();
  // The admin client uses the service-role key for operations that must bypass
  // RLS, such as inserting usage rows that do not belong to the requesting
  // user. Keep this key strictly server-side.
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createUserClient(token: string): SupabaseClient {
  if (env.E2E) return createE2EMockClient();
  // Use the publishable (anon) key together with the user's JWT so that
  // Postgres Row-Level Security policies are evaluated for the authenticated
  // user. This gives a defense-in-depth layer in addition to the server's
  // ownership checks.
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
      },
    },
  });
}

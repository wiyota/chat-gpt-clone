import type { SupabaseClient } from "@supabase/supabase-js";

const notImplemented = () => {
  throw new Error("E2E mock client method not implemented");
};

function emptyResponse() {
  return Promise.resolve({ data: [], error: null });
}

function nullResponse() {
  return Promise.resolve({ data: null, error: null });
}

export function createE2EMockClient(): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => emptyResponse(),
          limit: () => emptyResponse(),
          single: () => nullResponse(),
          maybeSingle: () => nullResponse(),
        }),
        order: () => ({
          limit: () => emptyResponse(),
          single: () => nullResponse(),
        }),
        single: () => nullResponse(),
      }),
      insert: () => ({
        select: () => ({
          single: () => nullResponse(),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => nullResponse(),
          }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => nullResponse(),
            }),
          }),
        }),
      }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: new Error("E2E mock") }),
      getSession: () => Promise.resolve({ data: { session: null }, error: new Error("E2E mock") }),
      signOut: () => Promise.resolve({ error: null }),
      signInWithOAuth: () => Promise.resolve({ data: { url: "" }, error: new Error("E2E mock") }),
      admin: {
        deleteUser: () => Promise.resolve({ data: { user: null }, error: new Error("E2E mock") }),
        getUserById: () => Promise.resolve({ data: { user: null }, error: new Error("E2E mock") }),
      },
      mfa: {} as never,
      onAuthStateChange: notImplemented,
      resend: notImplemented,
      resetPasswordForEmail: notImplemented,
      signInAnonymously: notImplemented,
      signInWithIdToken: notImplemented,
      signInWithOtp: notImplemented,
      signInWithPassword: notImplemented,
      signInWithSSO: notImplemented,
      signUp: notImplemented,
      updateUser: notImplemented,
      verifyOtp: notImplemented,
      linkIdentity: notImplemented,
      unlinkIdentity: notImplemented,
      exchangeCodeForSession: notImplemented,
    },
    channel: notImplemented,
    removeChannel: notImplemented,
    removeAllChannels: notImplemented,
    realtime: { setAuth: notImplemented } as never,
    storage: { from: notImplemented } as never,
    functions: { invoke: notImplemented } as never,
    rpc: notImplemented,
  } as unknown as SupabaseClient;
}

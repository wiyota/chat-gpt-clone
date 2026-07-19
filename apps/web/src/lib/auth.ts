import { createQuery, createMutation, useQueryClient } from "@tanstack/solid-query";
import { createRoot, createSignal } from "solid-js";
import { supabase } from "./supabase.js";

export const TEST_AUTH_TOKEN_KEY = "__test_auth_token";
export const TEST_USER_KEY = "__test_user";

export function readTestAuthFromStorage() {
  if (import.meta.env.PROD) return null;
  if (!import.meta.env.DEV) return null;
  if (window.localStorage.getItem("__test_auth_enabled") !== "true") return null;
  const token = window.localStorage.getItem(TEST_AUTH_TOKEN_KEY);
  const rawUser = window.localStorage.getItem(TEST_USER_KEY);
  if (!token || !rawUser) return null;
  try {
    const user = JSON.parse(rawUser) as { id: string; email?: string };
    return { user, token };
  } catch {
    return null;
  }
}

const { testUserOverride } = createRoot(() => {
  const initialTestAuth = readTestAuthFromStorage();
  const [testUserOverride, setTestUserOverride] = createSignal<{
    id: string;
    email?: string;
    access_token: string;
  } | null>(
    initialTestAuth
      ? {
          id: initialTestAuth.user.id,
          email: initialTestAuth.user.email,
          access_token: initialTestAuth.token,
        }
      : null,
  );

  if (import.meta.env.DEV) {
    window.addEventListener("storage", () => {
      const next = readTestAuthFromStorage();
      setTestUserOverride(
        next ? { id: next.user.id, email: next.user.email, access_token: next.token } : null,
      );
    });

    const win = window as unknown as {
      __testSetUser?: (user: { id: string; email?: string; access_token: string } | null) => void;
    };
    win.__testSetUser = (user) => {
      if (user) {
        window.localStorage.setItem(TEST_AUTH_TOKEN_KEY, user.access_token);
        window.localStorage.setItem(
          TEST_USER_KEY,
          JSON.stringify({ id: user.id, email: user.email }),
        );
      } else {
        window.localStorage.removeItem(TEST_AUTH_TOKEN_KEY);
        window.localStorage.removeItem(TEST_USER_KEY);
      }
      setTestUserOverride(user);
      window.dispatchEvent(new StorageEvent("storage"));
    };
  }

  return { testUserOverride };
});

export { testUserOverride };

export function useAuth() {
  return createQuery(() => ({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      const override = testUserOverride();
      if (override) {
        return { access_token: override.access_token, token_type: "bearer" } as const;
      }
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    staleTime: 1000 * 60 * 5,
  }));
}

export function useUser() {
  return createQuery(() => ({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const override = testUserOverride();
      if (override) {
        return { id: override.id, email: override.email ?? "test@example.com" };
      }
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
    staleTime: 1000 * 60 * 5,
  }));
}

export function useSignInWithGoogle() {
  return createMutation(() => ({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      return data;
    },
  }));
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return createMutation(() => ({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  }));
}

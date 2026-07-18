import { createQuery, createMutation, useQueryClient } from "@tanstack/solid-query";
import { supabase } from "./supabase.js";

export function useAuth() {
  return createQuery(() => ({
    queryKey: ["auth", "session"],
    queryFn: async () => {
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

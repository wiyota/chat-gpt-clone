import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import type { Message } from "@chat/shared";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await import("./supabase.js").then((m) => m.supabase.auth.getSession());
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useConversations() {
  return createQuery(() => ({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/conversations`, {
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to load conversations: ${res.status}`);
      const json = (await res.json()) as { conversations: Conversation[] };
      return json.conversations;
    },
  }));
}

export function useConversationMessages(conversationId: () => string | undefined) {
  return createQuery(() => ({
    queryKey: ["conversations", conversationId(), "messages"],
    queryFn: async () => {
      const id = conversationId();
      if (!id) return [];
      const res = await fetch(`${apiBase}/api/conversations/${id}/messages`, {
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to load messages: ${res.status}`);
      const json = (await res.json()) as { messages: Message[] };
      return json.messages;
    },
    enabled: !!conversationId(),
  }));
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return createMutation(() => ({
    mutationFn: async (id: string) => {
      const res = await fetch(`${apiBase}/api/conversations/${id}`, {
        method: "DELETE",
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  }));
}

export function useUpdateTitle() {
  const queryClient = useQueryClient();

  return createMutation(() => ({
    mutationFn: async ({ id, title }: { id: string; title?: string }) => {
      const res = await fetch(`${apiBase}/api/conversations/${id}/title`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(`Failed to update title: ${res.status}`);
      const json = (await res.json()) as { title: string };
      return json.title;
    },
    onSuccess: (_title, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.setQueryData(["conversations"], (old: Conversation[] | undefined) => {
        if (!old) return old;
        return old.map((c) =>
          c.id === variables.id ? { ...c, title: variables.title ?? c.title } : c,
        );
      });
    },
  }));
}

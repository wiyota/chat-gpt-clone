import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import type { Message } from "@chat/shared";
import { supabase } from "./supabase.js";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    const override = window.localStorage.getItem("__test_auth_token");
    if (!override) throw new Error("Not authenticated");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${override}`,
    };
  }
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

export async function loadConversations(): Promise<Conversation[]> {
  const res = await fetch(`${apiBase}/api/conversations`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load conversations: ${res.status}`);
  const json = (await res.json()) as { conversations: Conversation[] };
  return json.conversations;
}

export async function loadConversationMessages(conversationId: string): Promise<Message[]> {
  const res = await fetch(`${apiBase}/api/conversations/${conversationId}/messages`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load messages: ${res.status}`);
  const json = (await res.json()) as { messages: Message[] };
  return json.messages;
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${apiBase}/api/conversations/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
}

export async function updateTitle({ id, title }: { id: string; title?: string }): Promise<string> {
  const res = await fetch(`${apiBase}/api/conversations/${id}/title`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to update title: ${res.status}`);
  const json = (await res.json()) as { title: string };
  return json.title;
}

export function useConversations() {
  return createQuery(() => ({
    queryKey: ["conversations"],
    queryFn: loadConversations,
  }));
}

export function useConversationMessages(conversationId: () => string | undefined) {
  return createQuery(() => ({
    queryKey: ["conversations", conversationId(), "messages"],
    queryFn: () => {
      const id = conversationId();
      if (!id) return Promise.resolve([]);
      return loadConversationMessages(id);
    },
    enabled: !!conversationId(),
  }));
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return createMutation(() => ({
    mutationFn: deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  }));
}

export function useUpdateTitle() {
  const queryClient = useQueryClient();

  return createMutation(() => ({
    mutationFn: updateTitle,
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

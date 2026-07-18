import { createSignal, For, Show } from "solid-js";
import { createMutation, createQuery } from "@tanstack/solid-query";
import type { Message } from "@chat/shared";
import { supabase } from "./lib/supabase.js";
import { useSignInWithGoogle, useSignOut, useUser } from "./lib/auth.js";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function postChat(messages: Message[], conversationId?: string, token?: string): Promise<{ content: string; conversationId?: string }> {
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${apiBase}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, conversationId }),
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  return res.json();
}

export function App() {
  const user = useUser();
  const signIn = useSignInWithGoogle();
  const signOut = useSignOut();

  const [messages, setMessages] = createSignal<Message[]>([]);
  const [input, setInput] = createSignal("");
  const [conversationId, setConversationId] = createSignal<string | undefined>();

  const sessionQuery = createQuery(() => ({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    staleTime: 1000 * 60 * 5,
  }));

  const chat = createMutation(() => ({
    mutationFn: async (payload: { messages: Message[]; conversationId?: string }) => {
      const token = sessionQuery.data?.access_token;
      return postChat(payload.messages, payload.conversationId, token);
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      if (data.conversationId) setConversationId(data.conversationId);
    },
  }));

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const text = input().trim();
    if (!text) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    chat.mutate({ messages: [...messages(), userMessage], conversationId: conversationId() });
  };

  return (
    <div class="container">
      <div class="card">
        <div class="header">
          <h1 class="title">ChatGPT Clone</h1>
          <Show when={user.data} fallback={<button class="chat-button" onClick={() => signIn.mutate()}>Sign in with Google</button>}>
            <div class="user-info">
              <span>{user.data?.email}</span>
              <button class="chat-button" onClick={() => signOut.mutate()}>Sign out</button>
            </div>
          </Show>
        </div>

        <Show when={user.data} fallback={<p>Please sign in to start chatting.</p>}>
          <div class="messages">
            <For each={messages()}>
              {(message) => (
                <div class={`message ${message.role}`}>
                  <div class="message-role">{message.role}</div>
                  <div class="message-content">{message.content}</div>
                </div>
              )}
            </For>
          </div>

          <form onSubmit={handleSubmit} class="chat-form">
            <textarea
              value={input()}
              onInput={(e) => setInput(e.currentTarget.value)}
              placeholder="Message..."
              rows={2}
              class="chat-input"
            />
            <button type="submit" disabled={chat.isPending} class="chat-button">
              {chat.isPending ? "..." : "Send"}
            </button>
          </form>
        </Show>
      </div>
    </div>
  );
}

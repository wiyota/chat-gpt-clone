import { createSignal, Show } from "solid-js";
import { createMutation } from "@tanstack/solid-query";
import type { Message } from "@chat/shared";
import { supabase } from "./lib/supabase.js";
import { useSignInWithGoogle, useSignOut, useUser } from "./lib/auth.js";
import {
  useConversations,
  useConversationMessages,
  useDeleteConversation,
} from "./lib/conversations.js";
import { ChatPane } from "./components/ChatPane.js";
import { ConversationSidebar } from "./components/ConversationSidebar.js";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function postChat(
  messages: Message[],
  conversationId: string | undefined,
  token: string
): Promise<{ content: string; conversationId?: string }> {
  const res = await fetch(`${apiBase}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, conversationId }),
  });
  if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);
  return res.json();
}

export function App() {
  const user = useUser();
  const signIn = useSignInWithGoogle();
  const signOut = useSignOut();

  const [activeConversationId, setActiveConversationId] = createSignal<
    string | undefined
  >();
  const [input, setInput] = createSignal("");
  const [pendingMessages, setPendingMessages] = createSignal<Message[]>([]);

  const conversations = useConversations();
  const messagesQuery = useConversationMessages(activeConversationId);
  const deleteConversation = useDeleteConversation();

  const messages = () => {
    const loaded = messagesQuery.data ?? [];
    return activeConversationId() === undefined ? pendingMessages() : loaded;
  };

  const chat = createMutation(() => ({
    mutationFn: async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const text = input().trim();
      if (!text) throw new Error("Empty message");

      const userMessage: Message = { role: "user", content: text };
      const currentMessages = messages();
      const nextMessages = [...currentMessages, userMessage];

      if (activeConversationId() === undefined) {
        setPendingMessages(nextMessages);
      }
      setInput("");

      return postChat(nextMessages, activeConversationId(), token);
    },
    onSuccess: (data) => {
      if (data.conversationId) {
        setActiveConversationId(data.conversationId);
        setPendingMessages([]);
      }
      conversations.refetch();
    },
  }));

  const handleNewChat = () => {
    setActiveConversationId(undefined);
    setPendingMessages([]);
    setInput("");
  };

  const handleSelect = (id: string) => {
    setActiveConversationId(id);
    setPendingMessages([]);
  };

  const handleDelete = (id: string) => {
    deleteConversation.mutate(id);
    if (activeConversationId() === id) {
      setActiveConversationId(undefined);
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    chat.mutate();
  };

  return (
    <Show
      when={user.data}
      fallback={
        <div class="container">
          <div class="card center">
            <h1 class="title">ChatGPT Clone</h1>
            <button class="chat-button" onClick={() => signIn.mutate()}>
              Sign in with Google
            </button>
          </div>
        </div>
      }
    >
      <div class="layout">
        <ConversationSidebar
          conversations={conversations.data ?? []}
          activeId={activeConversationId()}
          onSelect={handleSelect}
          onNew={handleNewChat}
          onDelete={handleDelete}
        />
        <ChatPane
          messages={messages()}
          input={input()}
          isLoading={chat.isPending}
          userEmail={user.data?.email}
          onInput={setInput}
          onSubmit={handleSubmit}
          onSignOut={() => signOut.mutate()}
        />
      </div>
    </Show>
  );
}

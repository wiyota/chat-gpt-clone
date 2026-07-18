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

export function App() {
  const user = useUser();
  const signIn = useSignInWithGoogle();
  const signOut = useSignOut();

  const [activeConversationId, setActiveConversationId] = createSignal<string | undefined>();
  const [input, setInput] = createSignal("");
  const [pendingMessages, setPendingMessages] = createSignal<Message[]>([]);
  const [liveMessages, setLiveMessages] = createSignal<Message[]>([]);
  const [isStreaming, setIsStreaming] = createSignal(false);
  const [abortController, setAbortController] = createSignal<AbortController | null>(null);
  const [quotaError, setQuotaError] = createSignal<string | null>(null);

  const conversations = useConversations();
  const messagesQuery = useConversationMessages(activeConversationId);
  const deleteConversation = useDeleteConversation();

  const messages = () => {
    if (liveMessages().length > 0) return liveMessages();
    if (activeConversationId() === undefined) return pendingMessages();
    return messagesQuery.data ?? [];
  };

  const chat = createMutation(() => ({
    mutationFn: async () => {
      setQuotaError(null);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const text = input().trim();
      if (!text) throw new Error("Empty message");

      const userMessage: Message = { role: "user", content: text };
      const currentMessages = messages();
      const nextMessages = [...currentMessages, userMessage];

      setInput("");
      setPendingMessages([]);
      setLiveMessages(nextMessages);
      setIsStreaming(true);

      const controller = new AbortController();
      setAbortController(controller);

      try {
        return await streamChat(nextMessages, activeConversationId(), token, controller.signal);
      } finally {
        setAbortController(null);
      }
    },
    onSuccess: () => {
      conversations.refetch();
    },
    onError: (err) => {
      setLiveMessages([]);
      setIsStreaming(false);
      setAbortController(null);

      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("quota") || message.includes("429")) {
        setQuotaError("Daily token budget exceeded. Please try again later.");
      }
    },
  }));

  async function streamChat(
    messages: Message[],
    conversationId: string | undefined,
    token: string,
    signal: AbortSignal,
  ) {
    let res: Response;
    try {
      res = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages, conversationId }),
        signal,
      });
    } catch (err) {
      if (signal.aborted) {
        await showPersistedMessages();
        return { aborted: true };
      }
      throw err;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const error = body.error ?? `Chat request failed: ${res.status}`;
      if (res.status === 429 && body.code === "quota_exceeded") {
        setQuotaError(error);
      }
      throw new Error(error);
    }

    // The server may return a direct JSON response when the model answered without streaming.
    const contentType = res.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await res.json()) as { content: string; conversationId?: string };
      setLiveMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, content: body.content };
        } else {
          next.push({ role: "assistant", content: body.content });
        }
        return next;
      });
      if (body.conversationId) {
        setActiveConversationId(body.conversationId);
      }
      await messagesQuery.refetch();
      setLiveMessages([]);
      setIsStreaming(false);
      return { aborted: false };
    }

    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = "";
    let finalConversationId: string | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          if (data === "[DONE]") continue;
          if (data === "[ERROR]") {
            throw new Error("Stream failed on server");
          }
          if (data.startsWith("conversationId:")) {
            finalConversationId = data.slice("conversationId:".length);
            continue;
          }

          assistantContent += data;
          setLiveMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, content: assistantContent };
            } else {
              next.push({ role: "assistant", content: assistantContent });
            }
            return next;
          });
        }
      }
    } catch (err) {
      if (signal.aborted) {
        await showPersistedMessages(finalConversationId);
        return { aborted: true };
      }
      throw err;
    } finally {
      reader.releaseLock();
    }

    if (finalConversationId) {
      setActiveConversationId(finalConversationId);
    }

    await messagesQuery.refetch();
    setLiveMessages([]);
    setIsStreaming(false);
    return { aborted: false };
  }

  async function showPersistedMessages(fallbackId?: string) {
    const id = fallbackId ?? activeConversationId();
    if (id && !activeConversationId()) {
      setActiveConversationId(id);
    }
    await messagesQuery.refetch();
    setLiveMessages([]);
    setIsStreaming(false);
  }

  const handleStop = () => {
    abortController()?.abort();
  };

  const handleNewChat = () => {
    setActiveConversationId(undefined);
    setPendingMessages([]);
    setLiveMessages([]);
    setInput("");
    setQuotaError(null);
  };

  const handleSelect = (id: string) => {
    setActiveConversationId(id);
    setPendingMessages([]);
    setLiveMessages([]);
    setQuotaError(null);
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
          messages={messages}
          input={input()}
          isLoading={chat.isPending || isStreaming()}
          isStreaming={isStreaming()}
          userEmail={user.data?.email}
          quotaError={quotaError()}
          onInput={(value) => {
            setInput(value);
            if (value) setQuotaError(null);
          }}
          onSubmit={handleSubmit}
          onStop={handleStop}
          onSignOut={() => signOut.mutate()}
        />
      </div>
    </Show>
  );
}

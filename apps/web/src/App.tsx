import { batch, createSignal, Show } from "solid-js";
import { createMutation, useQueryClient } from "@tanstack/solid-query";
import type { Message } from "@chat/shared";
import { supabase } from "@/lib/supabase.js";
import { useSignInWithGoogle, useSignOut, useUser } from "@/lib/auth.js";

// The /api/chat schema only accepts user and assistant turns with non-empty
// content. Tool/system turns are generated server-side, so strip them from the
// request payload to avoid 400 validation errors that clear the user's message.
function toChatRequestMessages(messages: Message[]): Message[] {
  return messages.filter(
    (m): m is Message =>
      (m.role === "user" || m.role === "assistant") && m.content.trim().length > 0,
  );
}

function getTestAccessToken(): string | undefined {
  if (!import.meta.env.DEV) return undefined;
  if (typeof window === "undefined" || !window.localStorage) return undefined;
  return window.localStorage.getItem("__test_auth_token") ?? undefined;
}

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) return token;
  const testToken = getTestAccessToken();
  if (testToken) return testToken;
  throw new Error("Not authenticated");
}
import {
  useConversations,
  useConversationMessages,
  useDeleteConversation,
  useUpdateTitle,
} from "@/lib/conversations.js";
import { ChatPane } from "@/components/ChatPane.js";
import { ConversationSidebar } from "@/components/ConversationSidebar.js";
import { Button } from "@/components/ui/button.js";
import { Skeleton } from "@/components/ui/skeleton.js";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export function App() {
  const user = useUser();
  const signIn = useSignInWithGoogle();
  const signOut = useSignOut();

  const [activeConversationId, setActiveConversationId] = createSignal<string | undefined>();
  const [input, setInput] = createSignal("");
  const [pendingMessages, setPendingMessages] = createSignal<Message[]>([]);
  const [liveMessages, setLiveMessages] = createSignal<Message[]>([]);
  const [streamingContent, setStreamingContent] = createSignal("");
  const [isStreaming, setIsStreaming] = createSignal(false);
  const [abortController, setAbortController] = createSignal<AbortController | null>(null);
  const [quotaError, setQuotaError] = createSignal<string | null>(null);

  const [generatingTitleForNewChat, setGeneratingTitleForNewChat] = createSignal(false);
  const [focusInputTrigger, setFocusInputTrigger] = createSignal(0);

  const conversations = useConversations();
  const queryClient = useQueryClient();
  const messagesQuery = useConversationMessages(activeConversationId);
  const deleteConversation = useDeleteConversation();
  const updateTitle = useUpdateTitle();

  const displayConversations = () => {
    return conversations.data ?? [];
  };

  const messages = () => {
    if (isStreaming()) return liveMessages();
    if (liveMessages().length > 0) {
      // Once the persisted query contains the assistant response, prefer it so we
      // don't render the same message twice during the live -> persisted handoff.
      const persisted = messagesQuery.data ?? [];
      if (persisted.some((m) => m.role === "assistant")) {
        return persisted;
      }
      return liveMessages();
    }
    if (activeConversationId() === undefined) return pendingMessages();
    return messagesQuery.data ?? [];
  };

  const chat = createMutation(() => ({
    mutationFn: async () => {
      setQuotaError(null);

      const isNewChat = activeConversationId() === undefined;
      if (isNewChat) {
        setGeneratingTitleForNewChat(true);
      }

      const token = await getAccessToken();

      const text = input().trim();
      if (!text) throw new Error("Empty message");

      const userMessage: Message = { role: "user", content: text };
      const currentMessages = messages();
      // Keep the full message list for rendering, but only send valid turns to
      // the server. The server rebuilds context from the database anyway, so
      // omitting tool/system/empty turns here is safe.
      const nextMessages = [...currentMessages, userMessage];
      const requestMessages = toChatRequestMessages(nextMessages);

      setInput("");
      setPendingMessages([]);
      setLiveMessages(nextMessages);
      setStreamingContent("");
      setIsStreaming(true);

      const controller = new AbortController();
      setAbortController(controller);

      try {
        return await streamChat(requestMessages, activeConversationId(), token, controller.signal);
      } finally {
        setAbortController(null);
      }
    },
    onSuccess: (result) => {
      const conversationId = result?.conversationId;
      if (!conversationId) {
        setGeneratingTitleForNewChat(false);
        return;
      }

      // Optimistically insert the new conversation with a draft title so the
      // sidebar never shows "New conversation" for a freshly started chat.
      queryClient.setQueryData(
        ["conversations"],
        (
          old: { id: string; title: string; created_at: string; updated_at: string }[] | undefined,
        ) => {
          const exists = old?.some((c) => c.id === conversationId);
          if (exists) return old;
          const userMessage = messages().find((m: Message) => m.role === "user");
          const draftTitle = userMessage?.content.slice(0, 40) || "New conversation";
          const now = new Date().toISOString();
          const inserted = [
            {
              id: conversationId,
              title: draftTitle,
              created_at: now,
              updated_at: now,
            },
            ...(old ?? []),
          ];
          return inserted;
        },
      );

      // Once the conversation appears in the list (from cache or refetch), hide
      // the top-level skeleton so we don't render two rows for the same chat.
      setGeneratingTitleForNewChat(false);

      conversations.refetch();

      if (!result?.aborted) {
        updateTitle.mutate({ id: conversationId });
      }
    },
    onError: (err) => {
      setLiveMessages([]);
      setStreamingContent("");
      setIsStreaming(false);
      setAbortController(null);
      setGeneratingTitleForNewChat(false);

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
        return { aborted: true, conversationId };
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

    const contentType = res.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await res.json()) as { content: string; conversationId?: string };
      const text = body.content;
      setStreamingContent(text);
      if (body.conversationId) {
        setActiveConversationId(body.conversationId);
      }
      await messagesQuery.refetch();
      batch(() => {
        setLiveMessages([]);
        setStreamingContent("");
        setIsStreaming(false);
      });
      return { aborted: false, conversationId: body.conversationId };
    }

    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = "";
    let finalConversationId: string | undefined;
    let sseBuffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const messages = sseBuffer.split("\n\n");
        sseBuffer = messages.pop() ?? "";

        for (const message of messages) {
          if (!message.trim()) continue;
          const dataLines = message
            .split("\n")
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.slice(6));
          if (dataLines.length === 0) continue;

          const data = dataLines.join("\n");

          if (data === "[DONE]") continue;
          if (data === "[ERROR]") {
            throw new Error("Stream failed on server");
          }
          if (data.startsWith("conversationId:")) {
            finalConversationId = data.slice("conversationId:".length);
            continue;
          }

          assistantContent += data;
          setStreamingContent(assistantContent);
        }
      }
    } catch (err) {
      if (signal.aborted) {
        await showPersistedMessages(finalConversationId);
        return { aborted: true, conversationId: finalConversationId };
      }
      throw err;
    } finally {
      reader.releaseLock();
    }

    if (finalConversationId) {
      setActiveConversationId(finalConversationId);
    }

    // Keep rendering the streaming message until the persisted query has the
    // assistant response. This avoids a transient duplicate/empty handoff.
    await messagesQuery.refetch();
    batch(() => {
      setLiveMessages([]);
      setStreamingContent("");
      setIsStreaming(false);
    });
    return { aborted: false, conversationId: finalConversationId };
  }

  async function showPersistedMessages(fallbackId?: string) {
    const id = fallbackId ?? activeConversationId();
    if (id && !activeConversationId()) {
      setActiveConversationId(id);
    }
    await messagesQuery.refetch();
    setLiveMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
  }

  const handleStop = () => {
    abortController()?.abort();
  };

  const handleNewChat = () => {
    setActiveConversationId(undefined);
    setPendingMessages([]);
    setLiveMessages([]);
    setStreamingContent("");
    setInput("");
    setQuotaError(null);
    setGeneratingTitleForNewChat(false);
    setFocusInputTrigger((n) => n + 1);
  };

  const handleSelect = (id: string) => {
    setActiveConversationId(id);
    setPendingMessages([]);
    setLiveMessages([]);
    setStreamingContent("");
    setQuotaError(null);
    setGeneratingTitleForNewChat(false);
    setFocusInputTrigger((n) => n + 1);
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
        <div class="flex min-h-screen items-center justify-center bg-background p-4">
          <div class="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
            <Show
              when={!user.isPending}
              fallback={
                <>
                  <Skeleton class="mx-auto mb-4 h-8 w-48 bg-muted-foreground/20" />
                  <Skeleton class="h-10 w-full bg-muted-foreground/20" />
                </>
              }
            >
              <h1 class="mb-4 text-center text-2xl font-semibold">ChatGPT Clone</h1>
              <Button class="w-full" onClick={() => signIn.mutate()} disabled={signIn.isPending}>
                Sign in with Google
              </Button>
            </Show>
          </div>
        </div>
      }
    >
      <div class="flex min-h-screen bg-background">
        <ConversationSidebar
          conversations={displayConversations()}
          activeId={activeConversationId()}
          loadingIds={new Set<string>()}
          showNewChatSkeleton={generatingTitleForNewChat()}
          onSelect={handleSelect}
          onNew={handleNewChat}
          onDelete={handleDelete}
          onRename={(id, title) => updateTitle.mutate({ id, title })}
          userEmail={user.data?.email}
          onSignOut={() => signOut.mutate()}
        />
        <ChatPane
          messages={messages}
          streamingContent={streamingContent()}
          input={input()}
          isLoading={chat.isPending || isStreaming()}
          isStreaming={isStreaming()}
          quotaError={quotaError()}
          onInput={(value) => {
            setInput(value);
            if (value) setQuotaError(null);
          }}
          onSubmit={handleSubmit}
          onStop={handleStop}
          focusTrigger={focusInputTrigger()}
        />
      </div>
    </Show>
  );
}

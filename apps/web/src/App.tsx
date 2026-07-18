import { createSignal, For } from "solid-js";
import { createMutation } from "@tanstack/solid-query";
import type { Message } from "@chat/shared";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function postChat(messages: Message[]): Promise<{ content: string }> {
  const res = await fetch(`${apiBase}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  return res.json();
}

export function App() {
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [input, setInput] = createSignal("");

  const chat = createMutation(() => ({
    mutationFn: postChat,
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    },
  }));

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const text = input().trim();
    if (!text) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    chat.mutate([...messages(), userMessage]);
  };

  return (
    <div class="container">
      <div class="card">
        <h1 class="title">ChatGPT Clone</h1>

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
      </div>
    </div>
  );
}

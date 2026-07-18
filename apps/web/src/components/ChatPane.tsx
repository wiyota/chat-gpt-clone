import { For, Show } from "solid-js";
import type { Message } from "@chat/shared";

interface Props {
  messages: Message[];
  input: string;
  isLoading: boolean;
  userEmail?: string;
  onInput: (value: string) => void;
  onSubmit: (e: Event) => void;
  onSignOut: () => void;
}

export function ChatPane(props: Props) {
  return (
    <div class="chat-pane">
      <div class="header">
        <h1 class="title">ChatGPT Clone</h1>
        <Show when={props.userEmail}>
          <div class="user-info">
            <span>{props.userEmail}</span>
            <button class="chat-button" onClick={props.onSignOut}>Sign out</button>
          </div>
        </Show>
      </div>

      <div class="messages">
        <For each={props.messages}>
          {(message) => (
            <div class={`message ${message.role}`}>
              <div class="message-role">{message.role}</div>
              <div class="message-content">{message.content}</div>
            </div>
          )}
        </For>
      </div>

      <form onSubmit={props.onSubmit} class="chat-form">
        <textarea
          value={props.input}
          onInput={(e) => props.onInput(e.currentTarget.value)}
          placeholder="Message..."
          rows={2}
          class="chat-input"
        />
        <button type="submit" disabled={props.isLoading} class="chat-button">
          {props.isLoading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}

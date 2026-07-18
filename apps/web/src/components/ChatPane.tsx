import { For, Show } from "solid-js";
import type { Message } from "@chat/shared";

interface Props {
  messages: () => Message[];
  input: string;
  isLoading: boolean;
  isStreaming: boolean;
  userEmail?: string;
  quotaError?: string | null;
  onInput: (value: string) => void;
  onSubmit: (e: Event) => void;
  onStop: () => void;
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
            <button class="chat-button" onClick={props.onSignOut}>
              Sign out
            </button>
          </div>
        </Show>
      </div>

      <Show when={props.quotaError}>
        <div class="quota-error">{props.quotaError}</div>
      </Show>

      <div class="messages">
        <For each={props.messages()}>
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
        <Show
          when={props.isStreaming}
          fallback={
            <button
              type="submit"
              disabled={props.isLoading || !!props.quotaError}
              class="chat-button"
            >
              {props.isLoading ? "..." : "Send"}
            </button>
          }
        >
          <button type="button" onClick={props.onStop} class="chat-button stop">
            Stop
          </button>
        </Show>
      </form>
    </div>
  );
}

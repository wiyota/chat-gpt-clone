import { For, Show } from "solid-js";
import type { Message } from "@chat/shared";
import { MarkdownMessage } from "./MarkdownMessage.js";

interface Props {
  messages: () => Message[];
  streamingContent?: string;
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

function StreamingMessage(props: { content: string }) {
  return (
    <div class="message assistant">
      <div class="message-role">assistant</div>
      <div class="message-content">
        <MarkdownMessage content={props.content} />
      </div>
    </div>
  );
}

function ToolMarker(props: { message: Message }) {
  return (
    <Show when={props.message.tool_calls && props.message.tool_calls.length > 0}>
      <div class="tool-calls">
        Used tools:{" "}
        {props.message.tool_calls
          ?.map((call) => {
            const fn = (call as { function?: { name?: string } }).function;
            return fn?.name ?? "tool";
          })
          .join(", ")}
      </div>
    </Show>
  );
}

function shouldRender(message: Message): boolean {
  if (message.role === "tool") return false;
  if (message.role === "assistant" && !message.content && !message.tool_calls?.length) {
    return false;
  }
  return true;
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
            <Show when={shouldRender(message)} fallback={null}>
              <div class={`message ${message.role}`}>
                <div class="message-role">{message.role}</div>
                <ToolMarker message={message} />
                <div class="message-content">
                  <MarkdownMessage content={message.content ?? ""} />
                </div>
              </div>
            </Show>
          )}
        </For>
        <Show when={props.isStreaming}>
          <StreamingMessage content={props.streamingContent ?? ""} />
        </Show>
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

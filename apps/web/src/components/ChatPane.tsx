import { For, Show } from "solid-js";
import type { Message } from "@chat/shared";
import { MarkdownMessage } from "./MarkdownMessage.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { TextField, TextFieldTextArea } from "@/components/ui/text-field.js";

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
    <div class="max-w-[80%]">
      <div class="message-content">
        <MarkdownMessage content={props.content} />
      </div>
    </div>
  );
}

function ToolMarker(props: { message: Message }) {
  return (
    <Show when={props.message.tool_calls && props.message.tool_calls.length > 0}>
      <div class="mb-2 flex flex-wrap gap-1">
        <span class="text-xs text-muted-foreground">Used tools:</span>
        <For each={props.message.tool_calls}>
          {(call) => {
            const fn = (call as { function?: { name?: string } }).function;
            return <Badge variant="outline">{fn?.name ?? "tool"}</Badge>;
          }}
        </For>
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
    <div class="flex h-screen flex-1 flex-col overflow-hidden">
      <header class="shrink-0 flex items-center justify-between border-b px-4 py-3">
        <h1 class="text-lg font-semibold">ChatGPT Clone</h1>
        <Show when={props.userEmail}>
          <div class="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{props.userEmail}</span>
            <Button variant="outline" size="sm" onClick={props.onSignOut}>
              Sign out
            </Button>
          </div>
        </Show>
      </header>

      <Show when={props.quotaError}>
        <div class="shrink-0 mx-4 mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {props.quotaError}
        </div>
      </Show>

      <div class="flex-1 gap-6 overflow-y-auto p-4 [display:flex] [flex-direction:column]">
        <For each={props.messages()}>
          {(message) => (
            <Show when={shouldRender(message)} fallback={null}>
              <Show
                when={message.role === "user"}
                fallback={
                  <div class="max-w-[80%]">
                    <ToolMarker message={message} />
                    <div class="message-content">
                      <MarkdownMessage content={message.content ?? ""} />
                    </div>
                  </div>
                }
              >
                <div class="self-end max-w-[80%] rounded-lg bg-muted-foreground/20 px-4 py-2 text-foreground">
                  <div class="message-content">
                    <MarkdownMessage content={message.content ?? ""} />
                  </div>
                </div>
              </Show>
            </Show>
          )}
        </For>
        <Show when={props.isStreaming}>
          <StreamingMessage content={props.streamingContent ?? ""} />
        </Show>
      </div>

      <form onSubmit={props.onSubmit} class="shrink-0 border-t bg-background px-4 py-4">
        <div class="relative mx-auto max-w-4xl">
          <TextField class="w-full">
            <TextFieldTextArea
              value={props.input}
              onInput={(e) => props.onInput(e.currentTarget.value)}
              placeholder="Message..."
              rows={1}
              class="pr-11"
            />
          </TextField>
          <div class="absolute right-1.5 top-1/2 -translate-y-1/2">
            <Show
              when={props.isStreaming}
              fallback={
                <Button
                  type="submit"
                  disabled={props.isLoading || !!props.quotaError || !props.input.trim()}
                  size="icon"
                  class="size-7 rounded-full disabled:bg-muted-foreground/30 disabled:text-muted-foreground"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="size-4"
                  >
                    <path d="M12 19V5" />
                    <path d="m5 12 7-7 7 7" />
                  </svg>
                </Button>
              }
            >
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={props.onStop}
                class="size-7 rounded-full"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="size-4"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </Button>
            </Show>
          </div>
        </div>
      </form>
    </div>
  );
}

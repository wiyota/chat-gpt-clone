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
    <div class="rounded-lg border bg-muted/50 p-4">
      <div class="mb-1 text-xs font-medium text-muted-foreground uppercase">assistant</div>
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

function messageBg(role: string) {
  switch (role) {
    case "user":
      return "bg-primary text-primary-foreground";
    case "assistant":
      return "border bg-muted/50";
    default:
      return "border bg-card";
  }
}

export function ChatPane(props: Props) {
  return (
    <div class="flex flex-1 flex-col overflow-hidden">
      <header class="flex items-center justify-between border-b px-4 py-3">
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
        <div class="mx-4 mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {props.quotaError}
        </div>
      </Show>

      <div class="flex-1 space-y-4 overflow-y-auto p-4">
        <For each={props.messages()}>
          {(message) => (
            <Show when={shouldRender(message)} fallback={null}>
              <div class={`rounded-lg p-4 ${messageBg(message.role)}`}>
                <div class="mb-1 text-xs font-medium uppercase tracking-wide opacity-80">
                  {message.role}
                </div>
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

      <form onSubmit={props.onSubmit} class="border-t p-4">
        <div class="flex max-w-4xl items-end gap-2 mx-auto">
          <TextField class="flex-1">
            <TextFieldTextArea
              value={props.input}
              onInput={(e) => props.onInput(e.currentTarget.value)}
              placeholder="Message..."
              rows={2}
            />
          </TextField>
          <Show
            when={props.isStreaming}
            fallback={
              <Button type="submit" disabled={props.isLoading || !!props.quotaError} class="h-10">
                {props.isLoading ? "..." : "Send"}
              </Button>
            }
          >
            <Button type="button" variant="destructive" onClick={props.onStop} class="h-10">
              Stop
            </Button>
          </Show>
        </div>
      </form>
    </div>
  );
}

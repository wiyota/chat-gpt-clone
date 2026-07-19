import { For, Show, createEffect, on, onMount } from "solid-js";
import type { Message } from "@chat/shared";
import { MarkdownMessage } from "./MarkdownMessage.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";

interface Props {
  messages: () => Message[];
  streamingContent?: string;
  input: string;
  isLoading: boolean;
  isStreaming: boolean;
  quotaError?: string | null;
  onInput: (value: string) => void;
  onSubmit: (e: Event) => void;
  onStop: () => void;
  focusTrigger?: number;
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

export function shouldRender(message: Message): boolean {
  if (message.role === "tool") return false;
  if (message.role === "assistant" && !message.content && !message.tool_calls?.length) {
    return false;
  }
  return true;
}

export function handleKeyDown(e: KeyboardEvent, onSubmit: (e: Event) => void, disabled: boolean) {
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const isMeta = isMac ? e.metaKey : e.ctrlKey;
  if (e.key === "Enter" && isMeta && !disabled) {
    e.preventDefault();
    onSubmit(e);
  }
}

function ChatPaneInternal(props: Props) {
  const submitDisabled = () => props.isLoading || !!props.quotaError || !props.input.trim();

  let scrollRef: HTMLDivElement;
  let inputRef: HTMLTextAreaElement;

  const scrollToBottom = () => {
    if (scrollRef) {
      scrollRef.scrollTop = scrollRef.scrollHeight;
    }
  };

  createEffect(
    on(
      () => [props.messages().length, props.streamingContent],
      () => {
        queueMicrotask(scrollToBottom);
      },
    ),
  );

  createEffect(
    on(
      () => props.focusTrigger,
      () => {
        inputRef?.focus();
      },
      { defer: true },
    ),
  );

  onMount(() => {
    inputRef?.focus();
  });

  return (
    <div data-testid="chat-pane" class="flex h-screen flex-1 flex-col overflow-hidden">
      <header class="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h1 class="text-lg font-semibold">ChatGPT Clone</h1>
      </header>

      <Show when={props.quotaError}>
        <div class="mx-4 mt-4 shrink-0 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {props.quotaError}
        </div>
      </Show>

      <div
        ref={(el) => {
          scrollRef = el;
        }}
        class="[display:flex] flex-1 [flex-direction:column] gap-6 overflow-y-auto p-6"
      >
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
                <div class="max-w-[80%] self-end rounded-lg bg-muted-foreground/20 px-5 py-2 text-foreground">
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
        <div class="mx-auto flex max-w-4xl items-end gap-1 rounded-[18px] border bg-muted p-1 shadow-xs">
          <textarea
            data-testid="chat-input"
            ref={(el) => {
              inputRef = el;
            }}
            value={props.input}
            onInput={(e) => props.onInput(e.currentTarget.value)}
            onKeyDown={(e) => handleKeyDown(e, props.onSubmit, submitDisabled())}
            placeholder="Message..."
            rows={1}
            class="min-h-0 flex-1 resize-none border-0 bg-transparent px-3 py-1 leading-5 shadow-none outline-none focus-visible:ring-0 focus-visible:outline-none"
          />
          <div class="pb-0">
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
                data-testid="stop-button"
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

export function ChatPane(props: Props) {
  return ChatPaneInternal(props);
}

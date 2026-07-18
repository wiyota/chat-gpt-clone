import { For, Show } from "solid-js";
import type { Conversation } from "@/lib/conversations.js";
import { Button } from "@/components/ui/button.js";
import { Separator } from "@/components/ui/separator.js";

interface Props {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar(props: Props) {
  return (
    <aside class="flex w-64 flex-col gap-3 border-r bg-muted/30 p-3">
      <Button variant="outline" class="w-full justify-start" onClick={props.onNew}>
        <span class="mr-2">+</span> New chat
      </Button>

      <Separator />

      <Show
        when={props.conversations.length > 0}
        fallback={<p class="px-2 text-sm text-muted-foreground">No conversations yet</p>}
      >
        <ul class="flex flex-1 flex-col gap-1 overflow-y-auto">
          <For each={props.conversations}>
            {(conversation) => (
              <li
                class={`group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                  conversation.id === props.activeId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => props.onSelect(conversation.id)}
              >
                <span class="truncate pr-2">{conversation.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onDelete(conversation.id);
                  }}
                >
                  ×
                </Button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </aside>
  );
}

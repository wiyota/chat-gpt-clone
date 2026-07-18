import { For, Show } from "solid-js";
import type { Conversation } from "@/lib/conversations.js";
import { Button } from "@/components/ui/button.js";
import { Separator } from "@/components/ui/separator.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu.js";

interface Props {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  userEmail?: string;
  onSignOut: () => void;
}

export function ConversationSidebar(props: Props) {
  return (
    <aside class="sticky top-0 flex h-screen w-64 flex-col overflow-hidden border-r bg-muted/30">
      <div class="flex shrink-0 flex-col gap-3 p-3">
        <Button variant="outline" class="w-full justify-start shrink-0" onClick={props.onNew}>
          <span class="mr-2">+</span> New chat
        </Button>
      </div>

      <div class="flex-1 overflow-y-auto px-3 border-y p-2">
        <Show
          when={props.conversations.length > 0}
          fallback={<p class="px-2 text-sm text-muted-foreground">No conversations yet</p>}
        >
          <ul class="flex flex-col gap-1 pb-3">
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
                    class="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
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
      </div>

      <div class="shrink-0">
        <DropdownMenu gutter={4}>
          <DropdownMenuTrigger
            as={Button}
            variant="ghost"
            class="w-full justify-start truncate text-sm font-normal text-foreground px-5 py-6"
          >
            <span class="truncate">{props.userEmail ?? "User"}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={props.onSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

import { For, Show } from "solid-js";
import type { Conversation } from "@/lib/conversations.js";
import { createColorMode } from "@/lib/color-mode.js";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu.js";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.js";

const AutoIcon = () => (
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
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const SunIcon = () => (
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
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
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
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

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
  const { preference, setMode } = createColorMode();

  return (
    <aside class="sticky top-0 flex h-screen w-64 flex-col overflow-hidden border-r bg-muted/30">
      <div class="flex shrink-0 flex-col gap-3 p-3">
        <Button variant="outline" class="w-full justify-start shrink-0" onClick={props.onNew}>
          <span class="mr-2">+</span> New chat
        </Button>
      </div>

      <div class="flex-1 overflow-y-auto border-y p-2 px-3">
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
            class="w-full justify-start truncate px-5 py-6 text-sm font-normal text-foreground"
          >
            <span class="truncate">{props.userEmail ?? "User"}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-56">
            <div class="flex cursor-default items-stretch p-1">
              <ToggleGroup
                value={preference()}
                onChange={(value) => setMode(value as "auto" | "light" | "dark")}
                orientation="horizontal"
                class="w-full p-0"
              >
                <ToggleGroupItem value="auto" class="py-2 rounded-r-none">
                  <AutoIcon />
                </ToggleGroupItem>
                <div class="w-px bg-border" />
                <ToggleGroupItem value="light" class="py-2 rounded-none">
                  <SunIcon />
                </ToggleGroupItem>
                <div class="w-px bg-border" />
                <ToggleGroupItem value="dark" class="py-2 rounded-l-none">
                  <MoonIcon />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <DropdownMenuItem onClick={props.onSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

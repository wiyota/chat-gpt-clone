import { For, Show } from "solid-js";
import type { Conversation } from "../lib/conversations.js";

interface Props {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar(props: Props) {
  return (
    <aside class="sidebar">
      <button class="new-chat-button" onClick={props.onNew}>
        + New chat
      </button>
      <Show when={props.conversations.length > 0} fallback={<p class="empty">No conversations yet</p>}>
        <ul class="conversation-list">
          <For each={props.conversations}>
            {(conversation) => (
              <li
                class={`conversation-item ${conversation.id === props.activeId ? "active" : ""}`}
                onClick={() => props.onSelect(conversation.id)}
              >
                <span class="conversation-title">{conversation.title}</span>
                <button
                  class="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onDelete(conversation.id);
                  }}
                >
                  ×
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </aside>
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@chat/shared";

// Keep database work and API responses bounded even when a user has a very
// long-lived conversation. The newest messages are retained for context.
export const MAX_MESSAGES_PER_LOAD = 1_000;

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: Message["role"];
  content: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
  created_at: string;
}

export async function insertMessage(
  supabase: SupabaseClient,
  conversationId: string,
  message: Message,
): Promise<StoredMessage | null> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      tool_calls: message.tool_calls,
      tool_call_id: message.tool_call_id,
    })
    .select()
    .single();

  if (error) {
    console.error("insertMessage error:", error);
    return null;
  }

  return data as StoredMessage;
}

export async function loadMessages(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, tool_calls, tool_call_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MAX_MESSAGES_PER_LOAD);

  if (error) {
    console.error("loadMessages error:", error);
    return [];
  }

  return ((data ?? []) as Message[]).reverse();
}

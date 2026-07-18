import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@chat/shared";

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: Message["role"];
  content: string;
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
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("loadMessages error:", error);
    return [];
  }

  return (data ?? []) as Message[];
}

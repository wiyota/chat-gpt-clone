import type { SupabaseClient } from "@supabase/supabase-js";

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export async function findOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId?: string,
  initialTitle?: string,
): Promise<Conversation | null> {
  if (conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("findOrCreateConversation fetch error:", error);
      return null;
    }

    return data as Conversation;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      title: initialTitle ? initialTitle.slice(0, 50) : "New conversation",
    })
    .select()
    .single();

  if (error) {
    console.error("findOrCreateConversation insert error:", error);
    return null;
  }

  return data as Conversation;
}

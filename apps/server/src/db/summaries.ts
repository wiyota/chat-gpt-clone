import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConversationSummary {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
}

export async function loadSummary(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<ConversationSummary | null> {
  const { data, error } = await supabase
    .from("summaries")
    .select("id, conversation_id, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "PGRST116"
    ) {
      return null; // no rows
    }
    console.error("loadSummary error:", error);
    return null;
  }

  return data as ConversationSummary;
}

export async function insertSummary(
  supabase: SupabaseClient,
  conversationId: string,
  content: string,
): Promise<ConversationSummary | null> {
  const { data, error } = await supabase
    .from("summaries")
    .insert({ conversation_id: conversationId, content })
    .select()
    .single();

  if (error) {
    console.error("insertSummary error:", error);
    return null;
  }

  return data as ConversationSummary;
}

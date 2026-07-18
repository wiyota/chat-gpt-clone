import type { SupabaseClient } from "@supabase/supabase-js";
import type { LLMAdapter } from "../llm/provider.js";
import { loadMessages } from "./messages.js";

const DEFAULT_TITLE = "New conversation";
const MAX_TITLE_LENGTH = 50;

const TITLE_SYSTEM_PROMPT = `You are a helpful assistant. Generate a short, concise title (max 50 characters) for a conversation based on the user's first message. Respond with only the title, no quotes, no explanations.`;

export async function generateTitle(
  provider: LLMAdapter,
  supabase: SupabaseClient,
  conversationId: string,
): Promise<string | null> {
  const messages = await loadMessages(supabase, conversationId);
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage?.content) {
    return null;
  }

  try {
    const response = await provider.chat([
      { role: "system", content: TITLE_SYSTEM_PROMPT },
      { role: "user", content: firstUserMessage.content },
    ]);

    const rawTitle = response.content.trim();
    if (!rawTitle) {
      return null;
    }

    return sanitizeTitle(rawTitle);
  } catch (err) {
    console.error("generateTitle error:", err);
    return null;
  }
}

export function sanitizeTitle(raw: string): string {
  let title = raw
    .replace(/^["'"'\s]+|["'"'\s]+$/g, "")
    .replace(/\n+/g, " ")
    .trim();

  if (title.length > MAX_TITLE_LENGTH) {
    title = title.slice(0, MAX_TITLE_LENGTH).trim();
  }

  return title || DEFAULT_TITLE;
}

export async function updateConversationTitle(
  supabase: SupabaseClient,
  conversationId: string,
  title: string,
): Promise<boolean> {
  const { error } = await supabase.from("conversations").update({ title }).eq("id", conversationId);

  if (error) {
    console.error("updateConversationTitle error:", error);
    return false;
  }

  return true;
}

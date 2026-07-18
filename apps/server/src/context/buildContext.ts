import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@chat/shared";
import { loadMessages } from "../db/messages.js";
import { insertSummary, loadSummary } from "../db/summaries.js";
import { createLLMProvider } from "../llm/index.js";
import { env } from "../env.js";

export async function buildContext(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Message[]> {
  const allMessages = await loadMessages(supabase, conversationId);
  const provider = createLLMProvider();
  const budget = env.CONTEXT_WINDOW_TOKENS;
  const keepRecent = env.RECENT_MESSAGES_TO_KEEP;

  const totalTokens = provider.countTokens(allMessages);
  if (totalTokens <= budget) {
    return allMessages;
  }

  // Keep the most recent turns verbatim; summarize everything before them.
  const recentMessages = allMessages.slice(-keepRecent);
  const olderMessages = allMessages.slice(0, -keepRecent);

  if (olderMessages.length === 0) {
    return allMessages;
  }

  let summary = await loadSummary(supabase, conversationId);
  if (!summary) {
    const response = await provider.chat([
      {
        role: "system",
        content:
          "Summarize the following conversation concisely. Preserve key facts, decisions, and user intent. Do not add greetings or commentary.",
      },
      ...olderMessages,
    ]);

    summary = await insertSummary(supabase, conversationId, response.content);
  }

  const context: Message[] = [];
  if (summary?.content) {
    context.push({
      role: "system",
      content: `Summary of earlier conversation:\n${summary.content}`,
    });
  }
  context.push(...recentMessages);
  return context;
}

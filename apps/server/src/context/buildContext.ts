import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@chat/shared";
import { loadMessages } from "../db/messages.js";
import { insertSummary, loadSummary } from "../db/summaries.js";
import { loadMemories } from "../db/memories.js";
import type { LLMAdapter } from "../llm/provider.js";
import { env } from "../env.js";

const BASE_SYSTEM_PROMPT = "You are a helpful assistant. Answer concisely and clearly.";

export async function buildContext(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  provider: LLMAdapter,
): Promise<Message[]> {
  const allMessages = await loadMessages(supabase, conversationId);
  const budget = env.CONTEXT_WINDOW_TOKENS;
  const keepRecent = env.RECENT_MESSAGES_TO_KEEP;

  const memories = await loadMemories(supabase, userId, env.MEMORY_MAX_FACTS);

  const context: Message[] = [{ role: "system", content: BASE_SYSTEM_PROMPT }];

  const memoryMessage = buildMemoryMessage(memories);
  if (memoryMessage) {
    context.push(memoryMessage);
  }

  const totalTokens = provider.countTokens(allMessages);
  if (totalTokens <= budget) {
    context.push(...allMessages);
    return context;
  }

  // Keep the most recent turns verbatim; summarize everything before them.
  const recentMessages = allMessages.slice(-keepRecent);
  const olderMessages = allMessages.slice(0, -keepRecent);

  if (olderMessages.length === 0) {
    context.push(...allMessages);
    return context;
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

  if (summary?.content) {
    context.push({
      role: "system",
      content: `Summary of earlier conversation:\n${summary.content}`,
    });
  }

  context.push(...recentMessages);
  return context;
}

function buildMemoryMessage(memories: { fact: string }[]): Message | null {
  if (memories.length === 0) return null;

  const memoryText = memories.map((m) => `- ${m.fact}`).join("\n");
  return {
    role: "system",
    content: `You know the following about the user:\n${memoryText}`,
  };
}

import { getEncoding, type TiktokenEncoding } from "js-tiktoken";
import type { Message } from "@chat/shared";

const encodingCache = new Map<string, ReturnType<typeof getEncoding>>();

export function getTokenizer(model: string) {
  const encodingName = modelToEncoding(model);
  const cached = encodingCache.get(encodingName);
  if (cached) return cached;

  const encoding = getEncoding(encodingName as TiktokenEncoding);
  encodingCache.set(encodingName, encoding);
  return encoding;
}

export function countMessagesTokens(messages: Message[], model: string): number {
  const enc = getTokenizer(model);
  let tokens = 0;
  for (const message of messages) {
    tokens += enc.encode(message.content).length;
    // Approximate overhead per message for chat formats (role/name/tool delimiters).
    tokens += 4;
  }
  tokens += 2; // reply priming
  return tokens;
}

function modelToEncoding(model: string): string {
  // tiktoken encoding names used by js-tiktoken.
  if (model.startsWith("gpt-4o") || model.startsWith("o1") || model.startsWith("o3")) {
    return "o200k_base";
  }
  if (model.startsWith("gpt-4") || model.startsWith("text-embedding-3")) {
    return "cl100k_base";
  }
  if (model.startsWith("gpt-3.5")) {
    return "cl100k_base";
  }
  // Default to the most common modern encoding.
  return "cl100k_base";
}

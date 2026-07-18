import type { LLMAdapter } from "../llm/provider.js";

const EXTRACTION_PROMPT =
  "Extract any durable facts about the user from the following message. Return one fact per line. If there is nothing worth remembering, return an empty response. Keep each fact short.";

export async function extractFacts(provider: LLMAdapter, userText: string): Promise<string[]> {
  if (!userText.trim()) return [];

  const response = await provider.chat([
    { role: "system", content: EXTRACTION_PROMPT },
    { role: "user", content: userText },
  ]);

  return response.content
    .split("\n")
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter((line) => line.length > 0);
}

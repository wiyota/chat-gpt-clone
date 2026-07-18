import { env } from "../env.js";
import { OpenAIAdapter } from "./openai.js";
import type { LLMAdapter } from "./provider.js";

export function createLLMProvider(): LLMAdapter {
  if (env.LLM_PROVIDER === "openai") {
    return new OpenAIAdapter(env.OPENAI_API_KEY);
  }

  throw new Error(`Unsupported LLM provider: ${env.LLM_PROVIDER}`);
}

export type { LLMAdapter };

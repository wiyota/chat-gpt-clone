import type { Message, StreamChunk } from "@chat/shared";

export interface ChatResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
}

export interface LLMAdapter {
  chat(messages: Message[]): Promise<ChatResponse>;
  chatStream(messages: Message[], signal?: AbortSignal): AsyncIterable<StreamChunk>;
  countTokens(messages: Message[]): number;
}

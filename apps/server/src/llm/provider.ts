import type { Message, StreamChunk } from "@chat/shared";

export interface LLMAdapter {
  chat(messages: Message[]): Promise<string>;
  chatStream(messages: Message[]): AsyncIterable<StreamChunk>;
}

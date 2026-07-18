import type { Message, StreamChunk } from "@chat/shared";
import type { ChatResponse, LLMAdapter, ToolTurnResponse } from "./provider.js";
import type { ToolDefinition } from "../tools/definitions.js";

export interface MockLLMProviderOptions {
  response?: string;
  streamChunks?: string[];
  toolTurns?: ToolTurnResponse[];
}

export function createMockLLMProvider(options: MockLLMProviderOptions = {}): LLMAdapter {
  return {
    async chat(messages: Message[]): Promise<ChatResponse> {
      return {
        content: options.response ?? "Mock response",
        promptTokens: countTokens(messages),
        completionTokens: countTokens([
          { role: "assistant", content: options.response ?? "Mock response" },
        ]),
      };
    },

    async *chatStream(_messages: Message[]): AsyncIterable<StreamChunk> {
      const chunks = options.streamChunks ?? [options.response ?? "Mock response"];
      for (const chunk of chunks) {
        yield { content: chunk, done: false };
      }
      yield { content: "", done: true };
    },

    async chatWithTools(messages: Message[], _tools: ToolDefinition[]): Promise<ToolTurnResponse> {
      const turn = options.toolTurns?.shift();
      if (turn) {
        return turn;
      }
      return {
        kind: "message",
        content: options.response ?? "Mock response",
        promptTokens: countTokens(messages),
        completionTokens: countTokens([
          { role: "assistant", content: options.response ?? "Mock response" },
        ]),
      };
    },

    countTokens(messages: Message[]): number {
      return countTokens(messages);
    },
  };
}

function countTokens(messages: Message[]): number {
  return messages.reduce((sum, message) => sum + message.content.length, 0);
}

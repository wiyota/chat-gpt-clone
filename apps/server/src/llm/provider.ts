import type { Message, StreamChunk } from "@chat/shared";
import type { ToolDefinition } from "../tools/definitions.js";

export interface ChatResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
}

export interface ToolCallRequest {
  role: "assistant";
  content: string;
  tool_calls: ToolCallSpec[];
}

export interface ToolCallSpec {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type ToolTurnResponse =
  | { kind: "message"; content: string; promptTokens: number; completionTokens: number }
  | { kind: "tool_calls"; message: ToolCallRequest };

export interface LLMAdapter {
  chat(messages: Message[]): Promise<ChatResponse>;
  chatStream(messages: Message[], signal?: AbortSignal): AsyncIterable<StreamChunk>;
  chatWithTools(messages: Message[], tools: ToolDefinition[]): Promise<ToolTurnResponse>;
  countTokens(messages: Message[]): number;
}

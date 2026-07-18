export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface Message {
  role: MessageRole;
  content: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export interface ChatRequest {
  messages: Message[];
}

export interface ChatResponse {
  content: string;
}

export interface StreamChunk {
  content: string;
  done?: boolean;
}

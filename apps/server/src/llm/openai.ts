import OpenAI from "openai";
import type { Message, StreamChunk } from "@chat/shared";
import type { LLMAdapter } from "./provider.js";

export class OpenAIAdapter implements LLMAdapter {
  private client: OpenAI;
  private model = "gpt-4o-mini";

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(messages: Message[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(toOpenAIMessage),
    });

    const content = response.choices[0]?.message?.content ?? "";
    return content;
  }

  async *chatStream(messages: Message[]): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(toOpenAIMessage),
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content ?? "";
      yield { content, done: false };
    }

    yield { content: "", done: true };
  }
}

function toOpenAIMessage(message: Message): OpenAI.Chat.ChatCompletionMessageParam {
  if (message.role === "tool") {
    return {
      role: "tool",
      content: message.content,
      tool_call_id: message.tool_call_id ?? "",
    };
  }

  if (message.role === "assistant" && message.tool_calls) {
    return {
      role: "assistant",
      content: message.content,
      tool_calls: message.tool_calls as OpenAI.Chat.ChatCompletionMessageToolCall[],
    };
  }

  return {
    role: message.role as "system" | "user" | "assistant",
    content: message.content,
  };
}

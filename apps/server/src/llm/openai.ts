import { env } from "../env.js";
import OpenAI from "openai";
import type { Message, StreamChunk } from "@chat/shared";
import type { ChatResponse, LLMAdapter, ToolCallRequest, ToolTurnResponse } from "./provider.js";
import type { ToolDefinition } from "../tools/definitions.js";
import { countMessagesTokens } from "./tokenizer.js";

export class OpenAIAdapter implements LLMAdapter {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
    this.model = env.OPENAI_MODEL as string;
  }

  async chat(messages: Message[]): Promise<ChatResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(toOpenAIMessage),
    });

    const content = response.choices[0]?.message?.content ?? "";
    const usage = response.usage;
    return {
      content,
      promptTokens: usage?.prompt_tokens ?? this.countTokens(messages),
      completionTokens:
        usage?.completion_tokens ?? this.countTokens([{ role: "assistant", content }]),
    };
  }

  async chatWithTools(messages: Message[], tools: ToolDefinition[]): Promise<ToolTurnResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(toOpenAIMessage),
      tools: tools.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        },
      })),
    });

    const message = response.choices[0]?.message;
    const functionCalls = message?.tool_calls?.filter(
      (call): call is OpenAI.Chat.ChatCompletionMessageFunctionToolCall => call.type === "function",
    );
    if (functionCalls && functionCalls.length > 0) {
      const toolCallRequest: ToolCallRequest = {
        role: "assistant",
        content: message.content ?? "",
        tool_calls: functionCalls.map((call) => ({
          id: call.id,
          type: "function" as const,
          function: {
            name: call.function.name,
            arguments: call.function.arguments,
          },
        })),
      };
      return { kind: "tool_calls", message: toolCallRequest };
    }

    const usage = response.usage;
    return {
      kind: "message",
      content: message?.content ?? "",
      promptTokens: usage?.prompt_tokens ?? this.countTokens(messages),
      completionTokens:
        usage?.completion_tokens ??
        this.countTokens([{ role: "assistant", content: message?.content ?? "" }]),
    };
  }

  async *chatStream(
    messages: Message[],
    signal?: AbortSignal,
    tools?: ToolDefinition[],
  ): AsyncIterable<StreamChunk> {
    const requestTools = tools?.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      },
    }));

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(toOpenAIMessage),
      stream: true,
      stream_options: { include_usage: true },
      ...(requestTools ? { tools: requestTools } : {}),
    });

    const activeToolCalls = new Map<
      number,
      { id: string; type: "function"; function: { name: string; arguments: string } }
    >();

    for await (const chunk of stream) {
      if (signal?.aborted) break;

      const choice = chunk.choices[0];
      const delta = choice?.delta;
      const content = delta?.content ?? "";

      if (content) {
        console.log("[OpenAI chunk]", JSON.stringify(content));
        yield { content };
      }

      const deltaToolCalls = delta?.tool_calls;
      if (deltaToolCalls && deltaToolCalls.length > 0) {
        for (const deltaCall of deltaToolCalls) {
          const index = deltaCall.index;
          const existing = activeToolCalls.get(index);
          const fn = deltaCall.function;
          if (existing) {
            existing.id = deltaCall.id ?? existing.id;
            existing.function.name = fn?.name ?? existing.function.name;
            existing.function.arguments += fn?.arguments ?? "";
          } else {
            activeToolCalls.set(index, {
              id: deltaCall.id ?? "",
              type: "function",
              function: {
                name: fn?.name ?? "",
                arguments: fn?.arguments ?? "",
              },
            });
          }
        }
      }

      const finishReason = choice?.finish_reason;
      if (finishReason === "tool_calls" || finishReason === "function_call") {
        const toolCalls = Array.from(activeToolCalls.entries())
          .sort(([a], [b]) => a - b)
          .map(([, call]) => call);
        if (toolCalls.length > 0) {
          yield { tool_calls: toolCalls };
        }
        return;
      }
    }

    yield { content: "", done: true };
  }

  countTokens(messages: Message[]): number {
    return countMessagesTokens(messages, this.model);
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

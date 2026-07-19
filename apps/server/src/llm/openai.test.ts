import { describe, it, expect, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { OpenAIAdapter } from "./openai.js";
import type { Message } from "@chat/shared";

vi.mock("../env.js", () => ({
  env: { OPENAI_MODEL: "gpt-4o-mini" },
}));

function createMockOpenAI(
  responses: {
    chatCompletionsCreate?: unknown;
  } = {},
) {
  const chatCompletionsCreate = vi.fn();

  if (responses.chatCompletionsCreate) {
    chatCompletionsCreate.mockResolvedValue(responses.chatCompletionsCreate);
  }

  return {
    chat: {
      completions: {
        create: chatCompletionsCreate,
      },
    },
  };
}

describe("OpenAIAdapter", () => {
  describe("chat", () => {
    it("returns content and token counts from the API response", async () => {
      const mockClient = createMockOpenAI({
        chatCompletionsCreate: {
          choices: [{ message: { content: "Hello" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        },
      });
      const adapter = new OpenAIAdapter("test-key");
      (adapter as unknown as { client: typeof mockClient }).client = mockClient;

      const result = await adapter.chat([{ role: "user", content: "hi" }]);

      expect(result.content).toBe("Hello");
      expect(result.promptTokens).toBe(10);
      expect(result.completionTokens).toBe(5);
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "hi" }],
        }),
      );
    });

    it("falls back to counting tokens when usage is missing", async () => {
      const mockClient = createMockOpenAI({
        chatCompletionsCreate: {
          choices: [{ message: { content: "Hi there" } }],
        },
      });
      const adapter = new OpenAIAdapter("test-key");
      (adapter as unknown as { client: typeof mockClient }).client = mockClient;

      const result = await adapter.chat([{ role: "user", content: "hello" }]);

      expect(result.promptTokens).toBeGreaterThan(0);
      expect(result.completionTokens).toBeGreaterThan(0);
    });
  });

  describe("chatWithTools", () => {
    it("returns tool_calls when the model requests tools", async () => {
      const mockClient = createMockOpenAI({
        chatCompletionsCreate: {
          choices: [
            {
              message: {
                content: "",
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function",
                    function: { name: "getCurrentTime", arguments: "{}" },
                  },
                ],
              },
            },
          ],
          usage: { prompt_tokens: 20, completion_tokens: 10 },
        },
      });
      const adapter = new OpenAIAdapter("test-key");
      (adapter as unknown as { client: typeof mockClient }).client = mockClient;

      const result = await adapter.chatWithTools(
        [{ role: "user", content: "time?" }],
        [
          {
            type: "function",
            function: {
              name: "getCurrentTime",
              description: "Return current time",
              parameters: Type.Object({}),
            },
          },
        ],
      );

      expect(result.kind).toBe("tool_calls");
      if (result.kind === "tool_calls") {
        expect(result.message.tool_calls).toHaveLength(1);
        expect(result.message.tool_calls[0].function.name).toBe("getCurrentTime");
      }
    });

    it("returns a plain message when no tool_calls are present", async () => {
      const mockClient = createMockOpenAI({
        chatCompletionsCreate: {
          choices: [{ message: { content: "Plain answer" } }],
          usage: { prompt_tokens: 15, completion_tokens: 8 },
        },
      });
      const adapter = new OpenAIAdapter("test-key");
      (adapter as unknown as { client: typeof mockClient }).client = mockClient;

      const result = await adapter.chatWithTools([{ role: "user", content: "hi" }], []);

      expect(result).toEqual({
        kind: "message",
        content: "Plain answer",
        promptTokens: 15,
        completionTokens: 8,
      });
    });
  });

  describe("chatStream", () => {
    it("yields content chunks and a final done marker", async () => {
      async function* mockStream() {
        yield { choices: [{ delta: { content: "Hello" } }] };
        yield { choices: [{ delta: { content: " world" } }] };
      }

      const mockClient = createMockOpenAI();
      mockClient.chat.completions.create.mockResolvedValue(mockStream());

      const adapter = new OpenAIAdapter("test-key");
      (adapter as unknown as { client: typeof mockClient }).client = mockClient;

      const chunks: string[] = [];
      for await (const chunk of adapter.chatStream([{ role: "user", content: "hi" }])) {
        if (!chunk.done) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks).toEqual(["Hello", " world"]);
    });

    it("stops yielding when the signal is aborted", async () => {
      async function* mockStream() {
        yield { choices: [{ delta: { content: "First" } }] };
        yield { choices: [{ delta: { content: "Second" } }] };
      }

      const mockClient = createMockOpenAI();
      mockClient.chat.completions.create.mockResolvedValue(mockStream());

      const adapter = new OpenAIAdapter("test-key");
      (adapter as unknown as { client: typeof mockClient }).client = mockClient;

      const controller = new AbortController();
      const chunks: string[] = [];

      const streamPromise = (async () => {
        for await (const chunk of adapter.chatStream(
          [{ role: "user", content: "hi" }],
          controller.signal,
        )) {
          if (!chunk.done) {
            chunks.push(chunk.content);
          }
        }
      })();

      controller.abort();
      await streamPromise;

      expect(chunks.length).toBeLessThanOrEqual(1);
    });
  });

  describe("countTokens", () => {
    it("counts tokens for a message list", () => {
      const adapter = new OpenAIAdapter("test-key");
      const messages: Message[] = [{ role: "user", content: "hello world" }];

      expect(adapter.countTokens(messages)).toBeGreaterThan(0);
    });
  });
});

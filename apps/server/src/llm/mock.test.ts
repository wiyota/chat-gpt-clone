import { describe, it, expect } from "vitest";
import { createMockLLMProvider } from "./mock.js";
import type { Message } from "@chat/shared";

describe("createMockLLMProvider", () => {
  describe("chat", () => {
    it("returns the configured response", async () => {
      const provider = createMockLLMProvider({ response: "Custom answer" });
      const result = await provider.chat([{ role: "user", content: "hi" }]);

      expect(result.content).toBe("Custom answer");
      expect(result.promptTokens).toBeGreaterThanOrEqual(0);
      expect(result.completionTokens).toBeGreaterThanOrEqual(0);
    });

    it("falls back to a default response", async () => {
      const provider = createMockLLMProvider();
      const result = await provider.chat([{ role: "user", content: "hi" }]);

      expect(result.content).toBe("Mock response");
    });

    it("counts tokens from message content lengths", async () => {
      const provider = createMockLLMProvider({ response: "OK" });
      const messages: Message[] = [
        { role: "system", content: "abc" },
        { role: "user", content: "hello" },
      ];
      const result = await provider.chat(messages);

      expect(result.promptTokens).toBe(8);
      expect(result.completionTokens).toBe(2);
    });
  });

  describe("chatStream", () => {
    it("yields configured stream chunks", async () => {
      const provider = createMockLLMProvider({ streamChunks: ["One", "Two", "Three"] });
      const chunks: string[] = [];

      for await (const chunk of provider.chatStream([{ role: "user", content: "hi" }])) {
        if (!chunk.done) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks).toEqual(["One", "Two", "Three"]);
    });

    it("falls back to the response as a single chunk", async () => {
      const provider = createMockLLMProvider({ response: "Fallback" });
      const chunks: string[] = [];

      for await (const chunk of provider.chatStream([{ role: "user", content: "hi" }])) {
        if (!chunk.done) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks).toEqual(["Fallback"]);
    });

    it("yields a done marker last", async () => {
      const provider = createMockLLMProvider();
      const messages = await collectStream(provider.chatStream([{ role: "user", content: "hi" }]));

      expect(messages[messages.length - 1]).toEqual({ content: "", done: true });
    });
  });

  describe("chatWithTools", () => {
    it("returns a configured tool call turn", async () => {
      const provider = createMockLLMProvider({
        toolTurns: [
          {
            kind: "tool_calls",
            message: {
              role: "assistant",
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
      });

      const result = await provider.chatWithTools([{ role: "user", content: "time?" }], []);

      expect(result.kind).toBe("tool_calls");
      if (result.kind === "tool_calls") {
        expect(result.message.tool_calls[0].function.name).toBe("getCurrentTime");
      }
    });

    it("falls back to a message response when no tool turns remain", async () => {
      const provider = createMockLLMProvider({ response: "Final answer" });
      const result = await provider.chatWithTools([{ role: "user", content: "hi" }], []);

      expect(result).toEqual({
        kind: "message",
        content: "Final answer",
        promptTokens: 2,
        completionTokens: 12,
      });
    });

    it("consumes queued tool turns in order", async () => {
      const provider = createMockLLMProvider({
        toolTurns: [
          {
            kind: "tool_calls",
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: { name: "calculator", arguments: '{"expression":"1+1"}' },
                },
              ],
            },
          },
          {
            kind: "tool_calls",
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: "call_2",
                  type: "function",
                  function: { name: "getCurrentTime", arguments: "{}" },
                },
              ],
            },
          },
        ],
      });

      const first = await provider.chatWithTools([{ role: "user", content: "calc" }], []);
      const second = await provider.chatWithTools([{ role: "user", content: "time" }], []);

      expect(first.kind).toBe("tool_calls");
      expect(second.kind).toBe("tool_calls");
      if (first.kind === "tool_calls" && second.kind === "tool_calls") {
        expect(first.message.tool_calls[0].function.name).toBe("calculator");
        expect(second.message.tool_calls[0].function.name).toBe("getCurrentTime");
      }
    });
  });

  describe("countTokens", () => {
    it("sums content lengths", () => {
      const provider = createMockLLMProvider();
      const messages: Message[] = [
        { role: "system", content: "abc" },
        { role: "user", content: "defgh" },
      ];

      expect(provider.countTokens(messages)).toBe(8);
    });
  });
});

async function collectStream(stream: AsyncIterable<{ content: string; done: boolean }>) {
  const chunks: { content: string; done: boolean }[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
}

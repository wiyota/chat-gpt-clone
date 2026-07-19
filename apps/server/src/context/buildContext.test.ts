import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@chat/shared";
import type { LLMAdapter } from "../llm/provider.js";
import { buildContext } from "./buildContext.js";

vi.mock("../db/messages.js", () => ({
  loadMessages: vi.fn(),
}));

vi.mock("../db/summaries.js", () => ({
  loadSummary: vi.fn(),
  insertSummary: vi.fn(),
}));

vi.mock("../db/memories.js", () => ({
  loadMemories: vi.fn(),
}));

import { loadMessages } from "../db/messages.js";
import { loadSummary, insertSummary } from "../db/summaries.js";
import { loadMemories } from "../db/memories.js";

function createMockProvider(): LLMAdapter {
  return {
    chat: vi.fn(async () => ({ content: "Summary text", promptTokens: 0, completionTokens: 0 })),
    chatStream: async function* () {},
    chatWithTools: vi.fn(),
    countTokens: vi.fn((messages) => messages.reduce((sum, m) => sum + m.content.length, 0)),
  };
}

function createMockSupabase() {
  return {} as unknown as SupabaseClient;
}

describe("buildContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes the base system prompt and all messages when within budget", async () => {
    const messages: Message[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ];
    vi.mocked(loadMessages).mockResolvedValue(messages);
    vi.mocked(loadMemories).mockResolvedValue([]);

    const context = await buildContext(
      createMockSupabase(),
      "conv-1",
      "user-1",
      createMockProvider(),
    );

    expect(context[0]).toEqual({
      role: "system",
      content: "You are a helpful assistant. Answer concisely and clearly.",
    });
    expect(context.slice(1)).toEqual(messages);
  });

  it("includes memories as a system message", async () => {
    vi.mocked(loadMessages).mockResolvedValue([]);
    vi.mocked(loadMemories).mockResolvedValue([
      { id: "m1", user_id: "user-1", fact: "likes coffee", created_at: "" },
      { id: "m2", user_id: "user-1", fact: "lives in Tokyo", created_at: "" },
    ]);

    const context = await buildContext(
      createMockSupabase(),
      "conv-1",
      "user-1",
      createMockProvider(),
    );

    expect(context).toContainEqual({
      role: "system",
      content: "You know the following about the user:\n- likes coffee\n- lives in Tokyo",
    });
  });

  it("summarizes older messages when the token budget is exceeded", async () => {
    const messages: Message[] = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "message ".repeat(50),
    }));
    vi.mocked(loadMessages).mockResolvedValue(messages);
    vi.mocked(loadMemories).mockResolvedValue([]);
    vi.mocked(loadSummary).mockResolvedValue(null);
    vi.mocked(insertSummary).mockResolvedValue({
      id: "sum-1",
      conversation_id: "conv-1",
      content: "Summary of older discussion",
      created_at: "",
    });

    const provider = createMockProvider();
    const context = await buildContext(createMockSupabase(), "conv-1", "user-1", provider);

    expect(provider.chat).toHaveBeenCalled();
    expect(context).toContainEqual({
      role: "system",
      content: "Summary of earlier conversation:\nSummary of older discussion",
    });

    const recentMessages = context.filter((m) => m.role === "user" || m.role === "assistant");
    expect(recentMessages.length).toBe(6);
  });

  it("reuses an existing summary instead of regenerating one", async () => {
    const messages: Message[] = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "message ".repeat(50),
    }));
    vi.mocked(loadMessages).mockResolvedValue(messages);
    vi.mocked(loadMemories).mockResolvedValue([]);
    vi.mocked(loadSummary).mockResolvedValue({
      id: "sum-1",
      conversation_id: "conv-1",
      content: "Cached summary",
      created_at: "",
    });

    const provider = createMockProvider();
    await buildContext(createMockSupabase(), "conv-1", "user-1", provider);

    expect(provider.chat).not.toHaveBeenCalled();
    expect(insertSummary).not.toHaveBeenCalled();
  });

  it("falls back to all messages when there are not enough older messages", async () => {
    const messages: Message[] = [
      { role: "user", content: "short" },
      { role: "assistant", content: "reply" },
    ];
    vi.mocked(loadMessages).mockResolvedValue(messages);
    vi.mocked(loadMemories).mockResolvedValue([]);

    // Make tokens over budget by making content long.
    const provider = createMockProvider();
    vi.mocked(provider.countTokens).mockReturnValue(999_999);

    const context = await buildContext(createMockSupabase(), "conv-1", "user-1", provider);

    expect(context.slice(1)).toEqual(messages);
    expect(provider.chat).not.toHaveBeenCalled();
  });
});

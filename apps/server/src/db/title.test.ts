import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LLMAdapter } from "../llm/provider.js";
import { generateTitle, sanitizeTitle } from "./title.js";

vi.mock("./messages.js", () => ({
  loadMessages: vi.fn(),
}));

import { loadMessages } from "./messages.js";

function createMockProvider(response: string, shouldThrow = false): LLMAdapter {
  return {
    chat: vi.fn(async () => {
      if (shouldThrow) throw new Error("llm error");
      return { content: response, promptTokens: 0, completionTokens: 0 };
    }),
    chatStream: async function* () {},
    chatWithTools: vi.fn(),
    countTokens: () => 0,
  };
}

function createMockSupabase() {
  return {} as unknown as SupabaseClient;
}

describe("generateTitle", () => {
  it("returns a sanitized title from the first user message", async () => {
    vi.mocked(loadMessages).mockResolvedValue([
      { role: "user", content: '  "My favorite topic"  ' },
      { role: "assistant", content: "Interesting" },
    ]);

    const provider = createMockProvider("Generated Title");
    const result = await generateTitle(provider, createMockSupabase(), "conv-1");

    expect(result).toBe("Generated Title");
    expect(provider.chat).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: "user", content: '  "My favorite topic"  ' }),
      ]),
    );
  });

  it("returns null when there are no user messages", async () => {
    vi.mocked(loadMessages).mockResolvedValue([
      { role: "system", content: "prompt" },
      { role: "assistant", content: "hi" },
    ]);

    const result = await generateTitle(createMockProvider("Title"), createMockSupabase(), "conv-1");

    expect(result).toBeNull();
  });

  it("returns null when the LLM response is empty", async () => {
    vi.mocked(loadMessages).mockResolvedValue([{ role: "user", content: "hi" }]);

    const result = await generateTitle(createMockProvider("   "), createMockSupabase(), "conv-1");

    expect(result).toBeNull();
  });

  it("returns null when the LLM throws", async () => {
    vi.mocked(loadMessages).mockResolvedValue([{ role: "user", content: "hi" }]);

    const result = await generateTitle(
      createMockProvider("Title", true),
      createMockSupabase(),
      "conv-1",
    );

    expect(result).toBeNull();
  });
});

describe("sanitizeTitle", () => {
  it("trims whitespace and surrounding quotes", () => {
    expect(sanitizeTitle(`  "Hello world"  `)).toBe("Hello world");
  });

  it("replaces newlines with spaces", () => {
    expect(sanitizeTitle("Line 1\nLine 2")).toBe("Line 1 Line 2");
  });

  it("truncates to 50 characters", () => {
    const long = "a".repeat(100);
    expect(sanitizeTitle(long)).toBe("a".repeat(50));
  });

  it("returns default title when result is empty", () => {
    expect(sanitizeTitle('"""')).toBe("New conversation");
  });

  it("returns default title for whitespace-only input", () => {
    expect(sanitizeTitle("   \n   ")).toBe("New conversation");
  });
});

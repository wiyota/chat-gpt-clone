import { describe, it, expect } from "vitest";
import { extractFacts } from "./extractFacts.js";
import type { LLMAdapter } from "../llm/provider.js";

function createMockProvider(response: string): LLMAdapter {
  return {
    chat: async () => ({ content: response, promptTokens: 0, completionTokens: 0 }),
    chatStream: async function* () {},
    chatWithTools: async () => ({
      kind: "message",
      content: "",
      promptTokens: 0,
      completionTokens: 0,
    }),
    countTokens: () => 0,
  };
}

describe("extractFacts", () => {
  it("returns an empty array for empty input", async () => {
    expect(await extractFacts(createMockProvider("fact"), "")).toEqual([]);
    expect(await extractFacts(createMockProvider("fact"), "   ")).toEqual([]);
  });

  it("strips bullets and blank lines", async () => {
    const facts = await extractFacts(
      createMockProvider("- lives in Tokyo\n* likes coffee\n\n• reads books"),
      "sample",
    );
    expect(facts).toEqual(["lives in Tokyo", "likes coffee", "reads books"]);
  });

  it("returns an empty array when the response is only whitespace", async () => {
    expect(await extractFacts(createMockProvider("   \n  "), "sample")).toEqual([]);
  });

  it("keeps facts without bullets", async () => {
    expect(await extractFacts(createMockProvider("works remotely"), "sample")).toEqual([
      "works remotely",
    ]);
  });
});

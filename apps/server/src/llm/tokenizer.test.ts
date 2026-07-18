import { describe, it, expect } from "vitest";
import { countMessagesTokens, getTokenizer } from "./tokenizer.js";

describe("countMessagesTokens", () => {
  it("adds 4 tokens per message and 2 reply priming tokens", () => {
    const messages = [
      { role: "system" as const, content: "" },
      { role: "user" as const, content: "" },
    ];
    expect(countMessagesTokens(messages, "gpt-4o-mini")).toBe(10);
  });

  it("counts content tokens on top of overhead", () => {
    const messages = [{ role: "user" as const, content: "hello" }];
    expect(countMessagesTokens(messages, "gpt-4o-mini")).toBeGreaterThan(5);
  });
});

describe("getTokenizer", () => {
  it("selects o200k_base for gpt-4o models", () => {
    const tokenizer = getTokenizer("gpt-4o-mini");
    expect(tokenizer.encode("hello").length).toBeGreaterThan(0);
  });

  it("selects cl100k_base for gpt-4 models", () => {
    const tokenizer = getTokenizer("gpt-4-turbo");
    expect(tokenizer.encode("hello").length).toBeGreaterThan(0);
  });

  it("selects cl100k_base for gpt-3.5 models", () => {
    const tokenizer = getTokenizer("gpt-3.5-turbo");
    expect(tokenizer.encode("hello").length).toBeGreaterThan(0);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { consumeChatRequest, resetChatRateLimits } from "./rateLimit.js";

describe("chat rate limit", () => {
  afterEach(() => resetChatRateLimits());

  it("allows 20 requests and rejects the next request in a window", () => {
    for (let i = 0; i < 20; i++) {
      expect(consumeChatRequest("user-1", 1_000)).toBe(true);
    }
    expect(consumeChatRequest("user-1", 1_000)).toBe(false);
  });

  it("resets after the window expires", () => {
    for (let i = 0; i < 20; i++) consumeChatRequest("user-1", 1_000);
    expect(consumeChatRequest("user-1", 61_001)).toBe(true);
  });
});

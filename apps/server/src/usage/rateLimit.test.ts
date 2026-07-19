import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeChatRequest } from "./rateLimit.js";

function createClient(results: boolean[]): SupabaseClient {
  const rpc = vi.fn(async () => ({ data: results.shift() ?? false, error: null }));
  return { rpc } as unknown as SupabaseClient;
}

describe("chat rate limit", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("uses the shared atomic limiter result", async () => {
    const client = createClient([true, false]);
    expect(await consumeChatRequest(client, "user-1")).toBe(true);
    expect(await consumeChatRequest(client, "user-1")).toBe(false);
  });

  it("fails closed when the shared limiter is unavailable", async () => {
    const client = {
      rpc: vi.fn(async () => ({ data: null, error: new Error("migration missing") })),
    } as unknown as SupabaseClient;
    expect(await consumeChatRequest(client, "user-1")).toBe(false);
  });
});

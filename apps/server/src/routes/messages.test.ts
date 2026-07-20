import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { messagesRoute } from "./messages.js";

vi.mock("../supabase/client.js", () => ({
  createUserClient: vi.fn(),
}));

import { createUserClient } from "../supabase/client.js";

function createMockClient(
  options: { data?: unknown[]; error?: Error | null; owned?: boolean } = {},
) {
  const conversationsBuilder = {
    select: vi.fn(() => conversationsBuilder),
    eq: vi.fn(() => conversationsBuilder),
    maybeSingle: vi.fn(() =>
      Promise.resolve({
        data: options.owned !== false ? { id: "conv-1" } : null,
        error: null,
      }),
    ),
  };

  const messagesBuilder = {
    select: vi.fn(() => messagesBuilder),
    eq: vi.fn(() => messagesBuilder),
    order: vi.fn(() => ({
      limit: vi.fn(() =>
        Promise.resolve({ data: options.data ?? [], error: options.error ?? null }),
      ),
    })),
  };

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: {
            id: "user-1",
            email: "test@example.com",
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString(),
          } as User,
        },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "conversations") return conversationsBuilder;
      return messagesBuilder;
    }),
  } as unknown as ReturnType<typeof createUserClient>;
}

describe("messagesRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockClient(options: { data?: unknown[]; error?: Error | null; owned?: boolean } = {}) {
    vi.mocked(createUserClient).mockReturnValue(createMockClient(options));
  }

  it("returns messages for a conversation", async () => {
    mockClient({
      data: [
        { role: "assistant", content: "hello", created_at: "t2" },
        { role: "user", content: "hi", created_at: "t1" },
      ],
    });
    const res = await messagesRoute.request("/", {
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      messages: [
        { role: "user", content: "hi", created_at: "t1" },
        { role: "assistant", content: "hello", created_at: "t2" },
      ],
    });
  });

  it("only returns user and assistant messages with non-empty content", async () => {
    mockClient({
      data: [
        { role: "assistant", content: "hello", created_at: "t4" },
        { role: "assistant", content: "", created_at: "t3" },
        { role: "tool", content: "result", created_at: "t2" },
        { role: "user", content: "hi", created_at: "t1" },
      ],
    });
    const res = await messagesRoute.request("/", {
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      messages: [
        { role: "user", content: "hi", created_at: "t1" },
        { role: "assistant", content: "hello", created_at: "t4" },
      ],
    });
  });

  it("returns an empty list when no messages exist", async () => {
    mockClient({ data: [] });
    const res = await messagesRoute.request("/", {
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ messages: [] });
  });

  it("returns 404 when the conversation does not belong to the user", async () => {
    mockClient({ owned: false });
    const res = await messagesRoute.request("/", {
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 500 when loading messages fails", async () => {
    mockClient({ error: new Error("db error") });
    const res = await messagesRoute.request("/", {
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to load messages" });
  });
});

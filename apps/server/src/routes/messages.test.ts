import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { messagesRoute } from "./messages.js";

vi.mock("../supabase/client.js", () => ({
  createUserClient: vi.fn(),
}));

import { createUserClient } from "../supabase/client.js";

describe("messagesRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockClient({ data, error }: { data?: unknown[]; error?: Error | null }) {
    const mockedCreateUserClient = vi.mocked(createUserClient);
    mockedCreateUserClient.mockReturnValue({
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
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data, error })),
          })),
        })),
      })) as unknown as ReturnType<typeof createUserClient>["from"],
    } as unknown as ReturnType<typeof createUserClient>);
  }

  it("returns messages for a conversation", async () => {
    mockClient({
      data: [
        { role: "user", content: "hi", created_at: "t1" },
        { role: "assistant", content: "hello", created_at: "t2" },
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

  it("returns an empty list when no messages exist", async () => {
    mockClient({ data: [] });
    const res = await messagesRoute.request("/", {
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ messages: [] });
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

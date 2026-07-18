import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { conversationsRoute } from "./conversations.js";

vi.mock("../supabase/client.js", () => ({
  createUserClient: vi.fn(),
}));

import { createUserClient } from "../supabase/client.js";

describe("conversationsRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockClient({ listData, listError, deleteError }: MockClientOptions) {
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
      from: vi.fn((_table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: listData, error: listError })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: deleteError })),
          })),
        })),
      })) as unknown as ReturnType<typeof createUserClient>["from"],
    } as unknown as ReturnType<typeof createUserClient>);
  }

  it("lists conversations for the authenticated user", async () => {
    mockClient({
      listData: [{ id: "1", title: "Chat", created_at: "", updated_at: "" }],
    });
    const res = await conversationsRoute.request("/", {
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      conversations: [{ id: "1", title: "Chat", created_at: "", updated_at: "" }],
    });
  });

  it("returns an empty list when no conversations exist", async () => {
    mockClient({ listData: [] });
    const res = await conversationsRoute.request("/", {
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ conversations: [] });
  });

  it("returns 500 when listing conversations fails", async () => {
    mockClient({ listError: new Error("db error") });
    const res = await conversationsRoute.request("/", {
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to load conversations" });
  });

  it("deletes a conversation", async () => {
    mockClient({});
    const res = await conversationsRoute.request("/1", {
      method: "DELETE",
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("returns 500 when deleting a conversation fails", async () => {
    mockClient({ deleteError: new Error("db error") });
    const res = await conversationsRoute.request("/1", {
      method: "DELETE",
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to delete conversation" });
  });
});

interface MockClientOptions {
  listData?: unknown[];
  listError?: Error | null;
  deleteError?: Error | null;
}

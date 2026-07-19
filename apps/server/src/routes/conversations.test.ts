import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { conversationsRoute } from "./conversations.js";

vi.mock("../supabase/client.js", () => ({
  createUserClient: vi.fn(),
}));

import { createUserClient } from "../supabase/client.js";

function createMockClient(options: MockClientOptions = {}) {
  const conversationsBuilder = {
    select: vi.fn(() => conversationsBuilder),
    eq: vi.fn(() => conversationsBuilder),
    order: vi.fn(() =>
      Promise.resolve({ data: options.listData ?? [], error: options.listError ?? null }),
    ),
    maybeSingle: vi.fn(() =>
      Promise.resolve({
        data: options.ownedConversationId ? { id: options.ownedConversationId } : null,
        error: null,
      }),
    ),
    delete: vi.fn(() => conversationsBuilder),
    // oxlint-disable-next-line unicorn/no-thenable
    then: vi.fn((onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, error: options.deleteError ?? null }).then(onFulfilled),
    ),
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
      return conversationsBuilder;
    }),
  } as unknown as ReturnType<typeof createUserClient>;
}

describe("conversationsRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockClient(options: MockClientOptions = {}) {
    vi.mocked(createUserClient).mockReturnValue(createMockClient(options));
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
    mockClient({ ownedConversationId: "1" });
    const res = await conversationsRoute.request("/1", {
      method: "DELETE",
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("returns 404 when deleting a conversation that does not belong to the user", async () => {
    mockClient({ ownedConversationId: null });
    const res = await conversationsRoute.request("/1", {
      method: "DELETE",
      headers: { Authorization: "Bearer token" },
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Conversation not found or access denied" });
  });

  it("returns 500 when deleting a conversation fails", async () => {
    mockClient({ ownedConversationId: "1", deleteError: new Error("db error") });
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
  ownedConversationId?: string | null;
}

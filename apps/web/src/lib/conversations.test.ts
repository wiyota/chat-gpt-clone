import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  authHeaders,
  loadConversations,
  loadConversationMessages,
  deleteConversation,
  updateTitle,
} from "./conversations";
import { supabase } from "./supabase.js";

vi.mock("./supabase.js", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

const mockedGetSession = vi.mocked(supabase.auth.getSession);

function mockFetch(json: unknown, status: number, ok: boolean) {
  globalThis.fetch = vi.fn(
    async () =>
      ({
        ok,
        status,
        json: async () => json,
        text: async () => "",
      }) as Response,
  );
}

describe("authHeaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem("__test_auth_token");
  });

  it("uses the Supabase session token when available", async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: { access_token: "session-token" } as never },
      error: null,
    });
    const headers = await authHeaders();
    expect(headers.Authorization).toBe("Bearer session-token");
  });

  it("falls back to the localStorage test token when no session exists", async () => {
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null });
    window.localStorage.setItem("__test_auth_token", "test-token");
    const headers = await authHeaders();
    expect(headers.Authorization).toBe("Bearer test-token");
  });

  it("throws when neither session nor test token is available", async () => {
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(authHeaders()).rejects.toThrow("Not authenticated");
  });
});

describe("loadConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem("__test_auth_token", "test-token");
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("returns conversations on success", async () => {
    const conversations = [{ id: "1", title: "Hello", created_at: "", updated_at: "" }];
    mockFetch({ conversations }, 200, true);
    const result = await loadConversations();
    expect(result).toEqual(conversations);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/conversations"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch({}, 500, false);
    await expect(loadConversations()).rejects.toThrow("Failed to load conversations: 500");
  });
});

describe("loadConversationMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem("__test_auth_token", "test-token");
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("returns messages on success", async () => {
    const messages = [{ id: "m1", role: "user", content: "hi", conversation_id: "c1" }];
    mockFetch({ messages }, 200, true);
    const result = await loadConversationMessages("c1");
    expect(result).toEqual(messages);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/conversations/c1/messages"),
      expect.any(Object),
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch({}, 404, false);
    await expect(loadConversationMessages("c1")).rejects.toThrow("Failed to load messages: 404");
  });
});

describe("deleteConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem("__test_auth_token", "test-token");
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("resolves on successful delete", async () => {
    mockFetch({}, 204, true);
    await expect(deleteConversation("c1")).resolves.toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/conversations/c1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch({}, 500, false);
    await expect(deleteConversation("c1")).rejects.toThrow("Failed to delete conversation: 500");
  });
});

describe("updateTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem("__test_auth_token", "test-token");
    mockedGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("returns the updated title", async () => {
    mockFetch({ title: "New title" }, 200, true);
    const result = await updateTitle({ id: "c1", title: "New title" });
    expect(result).toBe("New title");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/conversations/c1/title"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "New title" }),
      }),
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch({}, 500, false);
    await expect(updateTitle({ id: "c1" })).rejects.toThrow("Failed to update title: 500");
  });
});

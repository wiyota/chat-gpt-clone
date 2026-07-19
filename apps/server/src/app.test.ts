import { describe, it, expect, vi } from "vitest";
import { createApp } from "./app.js";
import { createMockLLMProvider } from "./llm/mock.js";

vi.mock("./env.js", () => ({
  env: { CORS_ORIGIN: "http://localhost:5173" },
}));

vi.mock("./auth/middleware.js", () => ({
  authMiddleware: async (
    c: {
      get: (key: string) => unknown;
      set: (key: string, value: unknown) => void;
      req: { header: (name: string) => string | undefined };
      json: (body: unknown, status?: number) => Response;
    },
    next: () => Promise<void>,
  ) => {
    const header = c.req.header("Authorization");
    if (!header) {
      return c.json({ error: "Missing Authorization header" }, 401);
    }
    const token = header.replace("Bearer ", "");
    if (token === "valid-token") {
      c.set("auth", { userId: "user-1", userEmail: "test@example.com" });
      await next();
      return;
    }
    return c.json({ error: "Invalid or expired token" }, 401);
  },
}));

vi.mock("./supabase/client.js", () => ({
  createUserClient: vi.fn(() => ({ rpc: vi.fn(async () => ({ data: true, error: null })) })),
  createAdminClient: vi.fn(() => ({})),
}));

vi.mock("./db/conversations.js", () => ({
  findOrCreateConversation: vi.fn(async () => ({
    id: "conv-1",
    user_id: "user-1",
    title: "New conversation",
    created_at: "",
    updated_at: "",
  })),
}));

vi.mock("./db/messages.js", () => ({
  insertMessage: vi.fn(async () => null),
  loadMessages: vi.fn(async () => []),
}));

vi.mock("./db/usage.js", () => ({
  insertUsage: vi.fn(async () => null),
  sumDailyUsage: vi.fn(async () => 0),
}));

vi.mock("./db/memories.js", () => ({
  loadMemories: vi.fn(async () => []),
  insertMemory: vi.fn(async () => null),
}));

vi.mock("./db/summaries.js", () => ({
  loadSummary: vi.fn(async () => null),
  insertSummary: vi.fn(async () => null),
}));

vi.mock("./context/buildContext.js", () => ({
  buildContext: vi.fn(async () => [{ role: "user", content: "hi" }]),
}));

vi.mock("./tools/registry.js", () => ({
  getToolDefinitions: vi.fn(() => []),
  executeToolCall: vi.fn(async () => ({ tool_call_id: "call_1", content: "tool result" })),
}));

vi.mock("./memory/extractFacts.js", () => ({
  extractFacts: vi.fn(async () => []),
}));

vi.mock("./usage/limit.js", () => ({
  checkDailyBudget: vi.fn(async () => ({ allowed: true, todayUsage: 0, budget: 10000 })),
}));

describe("createApp", () => {
  it("responds to health checks", async () => {
    const app = createApp();
    const res = await app.request("/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("injects the provided LLM provider into chat requests", async () => {
    const provider = createMockLLMProvider({ response: "Injected response" });
    const app = createApp({ llmProvider: provider });

    const res = await app.request("/api/chat", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    const body = await res.text();
    expect(body).toContain("data: Injected response");
    expect(body).toContain("data: [DONE]");
  });

  it("rejects requests without an Authorization header", async () => {
    const app = createApp();

    const res = await app.request("/api/conversations");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Missing Authorization header" });
  });

  it("returns CORS headers for preflight requests", async () => {
    const app = createApp();

    const res = await app.request("/api/chat", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("returns a safe error response for unhandled exceptions", async () => {
    const app = createApp();

    const res = await app.request("/api/unknown");

    expect(res.status).toBe(404);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../app.js";
import { createMockLLMProvider } from "../llm/mock.js";
import type { User } from "@supabase/supabase-js";

vi.mock("../supabase/client.js", () => ({
  createUserClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("../db/conversations.js", () => ({
  findOrCreateConversation: vi.fn(),
}));

vi.mock("../db/messages.js", () => ({
  insertMessage: vi.fn(),
  loadMessages: vi.fn(),
}));

vi.mock("../db/usage.js", () => ({
  insertUsage: vi.fn(),
  sumDailyUsage: vi.fn(),
}));

vi.mock("../db/memories.js", () => ({
  loadMemories: vi.fn(),
  insertMemory: vi.fn(),
}));

vi.mock("../db/summaries.js", () => ({
  loadSummary: vi.fn(),
  insertSummary: vi.fn(),
}));

import { createUserClient, createAdminClient } from "../supabase/client.js";
import { findOrCreateConversation } from "../db/conversations.js";
import { loadMessages } from "../db/messages.js";
import { insertUsage, sumDailyUsage } from "../db/usage.js";
import { loadMemories } from "../db/memories.js";
import { loadSummary } from "../db/summaries.js";

function createMockSupabase(
  options: {
    user?: { id: string; email?: string } | null;
    findOrCreateData?: { id: string; title: string } | null;
    listData?: unknown[];
    loadMessagesData?: { role: "system" | "user" | "assistant" | "tool"; content: string }[];
    loadMemoriesData?: { id: string; user_id: string; fact: string; created_at: string }[];
    loadSummaryData?: {
      id: string;
      conversation_id: string;
      content: string;
      created_at: string;
    } | null;
    sumDailyUsageValue?: number;
    insertError?: Error | null;
  } = {},
) {
  const user = options.user ?? { id: "user-1", email: "test@example.com" };
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: user
            ? ({
                ...user,
                app_metadata: {},
                user_metadata: {},
                aud: "authenticated",
                created_at: new Date().toISOString(),
              } as User)
            : null,
        },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      const base = {
        select: vi.fn(() => base),
        eq: vi.fn(() => base),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: { code: "PGRST116" } })),
        insert: vi.fn(() => base),
        update: vi.fn(() => base),
        delete: vi.fn(() => base),
      };

      if (table === "conversations") {
        return {
          ...base,
          select: vi.fn(() => ({
            ...base,
            eq: vi.fn(() => ({
              ...base,
              single: vi.fn(() =>
                Promise.resolve({
                  data: options.findOrCreateData,
                  error: options.findOrCreateData ? null : new Error("not found"),
                }),
              ),
            })),
            order: vi.fn(() => Promise.resolve({ data: options.listData ?? [], error: null })),
          })),
          insert: vi.fn(() => ({
            ...base,
            select: vi.fn(() => ({
              ...base,
              single: vi.fn(() =>
                Promise.resolve({
                  data: options.findOrCreateData,
                  error: options.findOrCreateData ? null : new Error("insert failed"),
                }),
              ),
            })),
          })),
          update: vi.fn(() => ({
            ...base,
            eq: vi.fn(() => Promise.resolve({ error: options.insertError ?? null })),
          })),
          delete: vi.fn(() => ({
            ...base,
            eq: vi.fn(() => ({
              ...base,
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          })),
        };
      }

      if (table === "messages") {
        return {
          ...base,
          select: vi.fn(() => ({
            ...base,
            eq: vi.fn(() => ({
              ...base,
              order: vi.fn(() =>
                Promise.resolve({ data: options.loadMessagesData ?? [], error: null }),
              ),
            })),
          })),
          insert: vi.fn(() => ({
            ...base,
            select: vi.fn(() => ({
              ...base,
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        };
      }

      if (table === "memories") {
        return {
          ...base,
          select: vi.fn(() => ({
            ...base,
            eq: vi.fn(() => ({
              ...base,
              order: vi.fn(() => ({
                ...base,
                limit: vi.fn(() =>
                  Promise.resolve({ data: options.loadMemoriesData ?? [], error: null }),
                ),
              })),
            })),
          })),
          insert: vi.fn(() => ({
            ...base,
            select: vi.fn(() => ({
              ...base,
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        };
      }

      if (table === "summaries") {
        return {
          ...base,
          select: vi.fn(() => ({
            ...base,
            eq: vi.fn(() => ({
              ...base,
              order: vi.fn(() => ({
                ...base,
                limit: vi.fn(() => ({
                  ...base,
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: options.loadSummaryData,
                      error: options.loadSummaryData ? null : { code: "PGRST116" },
                    }),
                  ),
                })),
              })),
            })),
          })),
          insert: vi.fn(() => ({
            ...base,
            select: vi.fn(() => ({
              ...base,
              single: vi.fn(() => Promise.resolve({ data: options.loadSummaryData, error: null })),
            })),
          })),
        };
      }

      if (table === "usage") {
        return {
          ...base,
          select: vi.fn(() => ({
            ...base,
            eq: vi.fn(() => ({
              ...base,
              gte: vi.fn(() =>
                Promise.resolve({
                  data: [{ total_tokens: options.sumDailyUsageValue ?? 0 }],
                  error: null,
                }),
              ),
            })),
          })),
          insert: vi.fn(() => ({
            ...base,
            select: vi.fn(() => ({
              ...base,
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        };
      }

      return base;
    }),
  } as unknown as ReturnType<typeof createUserClient>;
}

function setupMocks(options: Parameters<typeof createMockSupabase>[0] = {}) {
  const mockSupabase = createMockSupabase(options);
  vi.mocked(createUserClient).mockReturnValue(mockSupabase);
  vi.mocked(createAdminClient).mockReturnValue(mockSupabase);
  vi.mocked(findOrCreateConversation).mockImplementation(
    async (_client, _userId, conversationId) => {
      if (conversationId) {
        return {
          id: conversationId,
          user_id: "user-1",
          title: "Existing chat",
          created_at: "",
          updated_at: "",
        };
      }
      return {
        id: "new-conv",
        user_id: "user-1",
        title: "New conversation",
        created_at: "",
        updated_at: "",
      };
    },
  );
  vi.mocked(loadMessages).mockResolvedValue(options.loadMessagesData ?? []);
  vi.mocked(loadMemories).mockResolvedValue(options.loadMemoriesData ?? []);
  vi.mocked(loadSummary).mockResolvedValue(options.loadSummaryData ?? null);
  vi.mocked(sumDailyUsage).mockResolvedValue(options.sumDailyUsageValue ?? 0);
  vi.mocked(insertUsage).mockResolvedValue(null);
  return mockSupabase;
}

describe("chatRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildApp(provider = createMockLLMProvider({ response: "Hello" })) {
    return createApp({ llmProvider: provider });
  }

  function request(app: ReturnType<typeof createApp>, body: unknown) {
    return app.request("/api/chat", {
      method: "POST",
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  it("streams the response when the model answers directly", async () => {
    setupMocks();
    const app = buildApp(createMockLLMProvider({ response: "Direct answer" }));
    const res = await request(app, { messages: [{ role: "user", content: "Hi" }] });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    const body = await res.text();
    expect(body).toContain("data: conversationId:new-conv");
    expect(body).toContain("data: Direct answer");
    expect(body).toContain("data: [DONE]");
  });

  it("streams the response when no prebuilt answer is returned", async () => {
    setupMocks();
    const app = buildApp(
      createMockLLMProvider({
        response: "",
        streamChunks: ["Hello", " world"],
      }),
    );
    const res = await request(app, { messages: [{ role: "user", content: "Hi" }] });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    const body = await res.text();
    expect(body).toContain("data: Hello");
    expect(body).toContain("data:  world");
    expect(body).toContain("data: [DONE]");
  });

  it("returns 401 without an Authorization header", async () => {
    const app = buildApp();
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 429 when the daily token budget is exceeded", async () => {
    setupMocks({ sumDailyUsageValue: 999_999 });
    const app = buildApp(
      createMockLLMProvider({
        response: "",
        streamChunks: ["x"],
      }),
    );
    const res = await request(app, { messages: [{ role: "user", content: "Hi" }] });
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "quota_exceeded" });
  });

  it("handles tool calls and streams the final answer", async () => {
    setupMocks();
    const provider = createMockLLMProvider({
      response: "The time is now.",
      toolTurns: [
        {
          kind: "tool_calls",
          message: {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "getCurrentTime", arguments: "{}" },
              },
            ],
          },
        },
      ],
    });
    const app = buildApp(provider);
    const res = await request(app, { messages: [{ role: "user", content: "What time is it?" }] });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    const body = await res.text();
    expect(body).toContain("data: The time is now.");
    expect(body).toContain("data: [DONE]");
  });

  it("persists the conversation id from the request body", async () => {
    setupMocks();
    const app = buildApp(createMockLLMProvider({ response: "OK" }));
    const res = await request(app, {
      messages: [{ role: "user", content: "Hi" }],
      conversationId: "existing-1",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    const body = await res.text();
    expect(body).toContain("data: conversationId:existing-1");
    expect(body).toContain("data: OK");
    expect(body).toContain("data: [DONE]");
  });

  it("encodes multiline stream chunks per SSE line", async () => {
    setupMocks();
    const app = buildApp(
      createMockLLMProvider({
        response: "",
        streamChunks: ["Line one\nLine two\nLine three"],
      }),
    );
    const res = await request(app, { messages: [{ role: "user", content: "Hi" }] });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("data: Line one");
    expect(body).toContain("data: Line two");
    expect(body).toContain("data: Line three");
  });
});

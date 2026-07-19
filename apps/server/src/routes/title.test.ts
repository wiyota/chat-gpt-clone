import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { titleRoute } from "./title.js";

vi.mock("../supabase/client.js", () => ({
  createUserClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("../db/messages.js", () => ({
  loadMessages: vi.fn(async () => [{ role: "user", content: "Hello" }]),
}));

vi.mock("../usage/limit.js", () => ({
  checkDailyBudget: vi.fn(async () => ({
    allowed: true,
    todayUsage: 0,
    budget: 10_000,
    reservationId: "reservation-1",
  })),
}));

vi.mock("../db/usage.js", () => ({
  finalizeUsage: vi.fn(async () => true),
}));

vi.mock("../db/title.js", () => ({
  generateTitle: vi.fn(),
  updateConversationTitle: vi.fn(),
}));

vi.mock("../llm/index.js", () => ({
  createLLMProvider: vi.fn(),
}));

import { createUserClient, createAdminClient } from "../supabase/client.js";
import { createLLMProvider } from "../llm/index.js";
import { generateTitle, updateConversationTitle } from "../db/title.js";
import type { User } from "@supabase/supabase-js";

function createMockClient(ownedConversationId: string | null = "conv-1") {
  const conversationsBuilder = {
    select: vi.fn(() => conversationsBuilder),
    eq: vi.fn(() => conversationsBuilder),
    maybeSingle: vi.fn(() =>
      Promise.resolve({
        data: ownedConversationId ? { id: ownedConversationId } : null,
        error: null,
      }),
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
    from: vi.fn(() => conversationsBuilder),
  } as unknown as ReturnType<typeof createUserClient>;
}

describe("titleRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createUserClient).mockReturnValue(createMockClient());
    vi.mocked(createAdminClient).mockReturnValue({} as ReturnType<typeof createUserClient>);
    vi.mocked(createLLMProvider).mockReturnValue({
      countTokens: vi.fn((messages: { content: string }[]) =>
        messages.reduce((sum, message) => sum + message.content.length, 0),
      ),
      chat: vi.fn(),
      chatStream: async function* () {},
      chatWithTools: vi.fn(),
    });
  });

  function buildApp() {
    return new Hono().route("/api/conversations/:id/title", titleRoute);
  }

  function request(id: string, body: unknown) {
    return buildApp().request(`/api/conversations/${id}/title`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  it("updates the title manually", async () => {
    vi.mocked(updateConversationTitle).mockResolvedValue(true);
    const res = await request("conv-1", { title: "Custom title" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ title: "Custom title" });
    expect(updateConversationTitle).toHaveBeenCalledWith(
      expect.anything(),
      "conv-1",
      "Custom title",
    );
  });

  it("falls back to default title when an empty title is provided", async () => {
    vi.mocked(updateConversationTitle).mockResolvedValue(true);
    const res = await request("conv-1", { title: "   " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ title: "New conversation" });
    expect(updateConversationTitle).not.toHaveBeenCalled();
  });

  it("generates and updates a title when none is provided", async () => {
    vi.mocked(generateTitle).mockResolvedValue("Generated title");
    vi.mocked(updateConversationTitle).mockResolvedValue(true);
    const res = await request("conv-1", {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ title: "Generated title" });
  });

  it("falls back to default title when generation returns nothing", async () => {
    vi.mocked(generateTitle).mockResolvedValue(null);
    vi.mocked(updateConversationTitle).mockResolvedValue(true);
    const res = await request("conv-1", {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ title: "New conversation" });
  });

  it("returns 404 when the conversation does not belong to the user", async () => {
    vi.mocked(createUserClient).mockReturnValue(createMockClient(null));
    vi.mocked(updateConversationTitle).mockResolvedValue(true);
    const res = await request("conv-1", { title: "Custom title" });
    expect(res.status).toBe(404);
    expect(updateConversationTitle).not.toHaveBeenCalled();
  });

  it("returns 500 when the title update fails", async () => {
    vi.mocked(updateConversationTitle).mockResolvedValue(false);
    const res = await request("conv-1", { title: "Custom title" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to update title" });
  });
});

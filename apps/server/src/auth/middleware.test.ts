import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { authMiddleware } from "./middleware.js";

vi.mock("../supabase/client.js", () => ({
  createUserClient: vi.fn(),
}));

import { createUserClient } from "../supabase/client.js";
import type { UserResponse, User } from "@supabase/supabase-js";

describe("authMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildApp() {
    return new Hono().use(authMiddleware).get("/", (c) => c.json(c.get("auth")));
  }

  function mockUser(user: { id: string; email?: string } | null, error: Error | null = null) {
    const mockedCreateUserClient = vi.mocked(createUserClient);
    mockedCreateUserClient.mockReturnValue({
      auth: {
        getUser: vi.fn(
          async () =>
            ({
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
              error,
            }) as UserResponse,
        ),
      },
    } as unknown as ReturnType<typeof createUserClient>);
  }

  it("returns 401 when Authorization header is missing", async () => {
    const res = await buildApp().request("/");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Missing Authorization header" });
  });

  it("returns 401 for an invalid header format", async () => {
    const res = await buildApp().request("/", {
      headers: { Authorization: "Basic token" },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid Authorization header" });
  });

  it("returns 401 when token validation fails", async () => {
    mockUser(null, new Error("invalid token"));
    const res = await buildApp().request("/", {
      headers: { Authorization: "Bearer badtoken" },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid or expired token" });
  });

  it("bypasses Supabase entirely for the e2e-token", async () => {
    const res = await buildApp().request("/", {
      headers: { Authorization: "Bearer e2e-token" },
    });
    expect(vi.mocked(createUserClient)).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "e2e-user", userEmail: "e2e@example.com" });
  });
});

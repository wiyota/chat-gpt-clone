import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {},
    from: vi.fn(),
  })),
}));

import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";
import { createAdminClient, createUserClient } from "./client.js";

describe("supabase client factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an admin client with the secret key", () => {
    const client = createAdminClient();

    expect(client).toBeDefined();
    expect(createClient).toHaveBeenCalledWith(
      env.SUPABASE_URL,
      env.SUPABASE_SECRET_KEY,
      expect.objectContaining({
        auth: { autoRefreshToken: false, persistSession: false },
      }),
    );
  });

  it("creates a user client with the publishable key and user JWT", () => {
    const client = createUserClient("user-token");

    expect(client).toBeDefined();
    expect(createClient).toHaveBeenCalledWith(
      env.SUPABASE_URL,
      env.SUPABASE_PUBLISHABLE_KEY,
      expect.objectContaining({
        auth: { autoRefreshToken: false, persistSession: false },
        global: {
          headers: {
            Authorization: "Bearer user-token",
            apikey: env.SUPABASE_PUBLISHABLE_KEY,
          },
        },
      }),
    );
  });

  it("creates distinct user client instances for different tokens", () => {
    const clientA = createUserClient("token-a");
    const clientB = createUserClient("token-b");

    expect(clientA).not.toBe(clientB);
  });
});

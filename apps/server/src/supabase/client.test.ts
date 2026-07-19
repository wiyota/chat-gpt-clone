import { describe, it, expect } from "vitest";
import { createAdminClient, createUserClient } from "./client.js";

describe("supabase client factory", () => {
  it("creates an admin client", () => {
    const client = createAdminClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.from).toBeDefined();
  });

  it("creates a user client with the provided token", () => {
    const client = createUserClient("user-token");
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.from).toBeDefined();
  });

  it("creates distinct clients for different tokens", () => {
    const clientA = createUserClient("token-a");
    const clientB = createUserClient("token-b");
    expect(clientA).not.toBe(clientB);
  });

  it("creates distinct admin and user clients", () => {
    const admin = createAdminClient();
    const user = createUserClient("user-token");
    expect(admin).not.toBe(user);
  });
});

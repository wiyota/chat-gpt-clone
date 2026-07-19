import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("env schema", () => {
  const originalEnv = { ...process.env };

  async function loadEnv() {
    // ESM modules are cached; reset them so each test re-evaluates the schema.
    vi.resetModules();
    return import("./env.js");
  }

  beforeEach(() => {
    // Reset to a minimal valid environment before each test.
    process.env = {
      ...originalEnv,
      SUPABASE_URL: "http://localhost:54321",
      SUPABASE_SECRET_KEY: "test-secret",
      SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      OPENAI_API_KEY: "test-key",
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("loads with required variables present", async () => {
    const { env } = await loadEnv();
    expect(env.SUPABASE_URL).toBe("http://localhost:54321");
    expect(env.SUPABASE_SECRET_KEY).toBe("test-secret");
    expect(env.SUPABASE_PUBLISHABLE_KEY).toBe("test-publishable-key");
    expect(env.OPENAI_API_KEY).toBe("test-key");
  });

  it("uses default values for optional variables", async () => {
    delete process.env.OPENAI_MODEL;
    delete process.env.LLM_PROVIDER;
    delete process.env.CORS_ORIGIN;

    const { env } = await loadEnv();
    expect(env.OPENAI_MODEL).toBe("gpt-4o-mini");
    expect(env.LLM_PROVIDER).toBe("openai");
    expect(env.CORS_ORIGIN).toBe("http://localhost:5173");
  });

  it("parses numeric variables with defaults", async () => {
    process.env.CONTEXT_WINDOW_TOKENS = "8000";
    process.env.RECENT_MESSAGES_TO_KEEP = "10";
    process.env.DAILY_TOKEN_BUDGET = "5000";
    process.env.MEMORY_MAX_FACTS = "20";
    process.env.MAX_COMPLETION_TOKENS = "4096";

    const { env } = await loadEnv();
    expect(env.CONTEXT_WINDOW_TOKENS).toBe(8000);
    expect(env.RECENT_MESSAGES_TO_KEEP).toBe(10);
    expect(env.DAILY_TOKEN_BUDGET).toBe(5000);
    expect(env.MEMORY_MAX_FACTS).toBe(20);
    expect(env.MAX_COMPLETION_TOKENS).toBe(4096);
  });

  it("throws when SUPABASE_URL is missing", async () => {
    delete process.env.SUPABASE_URL;

    await expect(loadEnv()).rejects.toThrow();
  });

  it("throws when SUPABASE_SECRET_KEY is missing", async () => {
    delete process.env.SUPABASE_SECRET_KEY;

    await expect(loadEnv()).rejects.toThrow();
  });

  it("throws when SUPABASE_PUBLISHABLE_KEY is missing", async () => {
    delete process.env.SUPABASE_PUBLISHABLE_KEY;

    await expect(loadEnv()).rejects.toThrow();
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(loadEnv()).rejects.toThrow();
  });

  it("throws when SUPABASE_URL is not a valid URI", async () => {
    process.env.SUPABASE_URL = "not-a-url";

    await expect(loadEnv()).rejects.toThrow();
  });

  it("rejects unsafe numeric configuration", async () => {
    process.env.DAILY_TOKEN_BUDGET = "-1";
    await expect(loadEnv()).rejects.toThrow();
  });

  it("rejects unsafe flags in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.E2E = "true";
    const { assertProductionSecurity } = await loadEnv();
    expect(() => assertProductionSecurity()).toThrow(/E2E/);
  });
});

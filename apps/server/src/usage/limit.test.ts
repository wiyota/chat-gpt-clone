import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkDailyBudget } from "./limit.js";

vi.mock("../db/usage.js", () => ({
  reserveDailyUsage: vi.fn(),
  sumDailyUsage: vi.fn(),
}));

vi.mock("../env.js", () => ({
  env: { DAILY_TOKEN_BUDGET: 10_000, E2E: false },
}));

import { reserveDailyUsage, sumDailyUsage } from "../db/usage.js";

describe("checkDailyBudget", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reserveDailyUsage).mockResolvedValue("reservation-1");
    delete process.env.NODE_ENV;
    delete process.env.SKIP_BUDGET;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("allows requests that stay within the daily budget", async () => {
    vi.mocked(sumDailyUsage).mockResolvedValue(100);

    const result = await checkDailyBudget({} as SupabaseClient, "user-1", 500);

    expect(result).toEqual({
      allowed: true,
      todayUsage: 100,
      budget: 10_000,
      reservationId: "reservation-1",
    });
  });

  it("denies requests that exceed the daily budget", async () => {
    vi.mocked(sumDailyUsage).mockResolvedValue(9_500);
    vi.mocked(reserveDailyUsage).mockResolvedValue(null);

    const result = await checkDailyBudget({} as SupabaseClient, "user-1", 600);

    expect(result).toEqual({ allowed: false, todayUsage: 9_500, budget: 10_000 });
  });

  it("allows requests at the exact budget limit", async () => {
    vi.mocked(sumDailyUsage).mockResolvedValue(9_000);

    const result = await checkDailyBudget({} as SupabaseClient, "user-1", 1_000);

    expect(result.allowed).toBe(true);
  });

  it("denies requests that are one token over the budget", async () => {
    vi.mocked(sumDailyUsage).mockResolvedValue(9_000);
    vi.mocked(reserveDailyUsage).mockResolvedValue(null);

    const result = await checkDailyBudget({} as SupabaseClient, "user-1", 1_001);

    expect(result.allowed).toBe(false);
  });

  it("uses a default budget of 10_000 tokens", async () => {
    vi.mocked(sumDailyUsage).mockResolvedValue(0);

    const result = await checkDailyBudget({} as SupabaseClient, "user-1", 10_000);

    expect(result.budget).toBe(10_000);
    expect(result.allowed).toBe(true);
  });

  it("bypasses the budget check in development", async () => {
    process.env.NODE_ENV = "development";
    vi.mocked(sumDailyUsage).mockResolvedValue(100_000);

    const result = await checkDailyBudget({} as SupabaseClient, "user-1", 1_000);

    expect(result).toEqual({ allowed: true, todayUsage: 100_000, budget: 10_000 });
  });

  it("bypasses the budget check when SKIP_BUDGET is set", async () => {
    process.env.SKIP_BUDGET = "true";
    vi.mocked(sumDailyUsage).mockResolvedValue(100_000);

    const result = await checkDailyBudget({} as SupabaseClient, "user-1", 1_000);

    expect(result).toEqual({ allowed: true, todayUsage: 100_000, budget: 10_000 });
  });
});

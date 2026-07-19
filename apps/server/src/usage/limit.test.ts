import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkDailyBudget } from "./limit.js";

vi.mock("../db/usage.js", () => ({
  sumDailyUsage: vi.fn(),
}));

import { sumDailyUsage } from "../db/usage.js";

describe("checkDailyBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows requests that stay within the daily budget", async () => {
    vi.mocked(sumDailyUsage).mockResolvedValue(100);

    const result = await checkDailyBudget({} as SupabaseClient, "user-1", 500);

    expect(result).toEqual({ allowed: true, todayUsage: 100, budget: 10_000 });
  });

  it("denies requests that exceed the daily budget", async () => {
    vi.mocked(sumDailyUsage).mockResolvedValue(9_500);

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

    const result = await checkDailyBudget({} as SupabaseClient, "user-1", 1_001);

    expect(result.allowed).toBe(false);
  });

  it("uses a default budget of 10_000 tokens", async () => {
    vi.mocked(sumDailyUsage).mockResolvedValue(0);

    const result = await checkDailyBudget({} as SupabaseClient, "user-1", 10_000);

    expect(result.budget).toBe(10_000);
    expect(result.allowed).toBe(true);
  });
});

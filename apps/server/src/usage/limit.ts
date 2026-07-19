import type { SupabaseClient } from "@supabase/supabase-js";
import { sumDailyUsage } from "../db/usage.js";
import { env } from "../env.js";

export interface BudgetCheck {
  allowed: boolean;
  todayUsage: number;
  budget: number;
}

export async function checkDailyBudget(
  supabase: SupabaseClient,
  userId: string,
  estimatedTokens: number,
): Promise<BudgetCheck> {
  const todayUsage = await sumDailyUsage(supabase, userId);
  const budget = env.DAILY_TOKEN_BUDGET;
  // In development/E2E, disable the daily budget guard so engineers can iterate
  // without worrying about usage limits. Requires explicit NODE_ENV=development
  // or E2E/SKIP_BUDGET flags; default behavior (no NODE_ENV set) treats the
  // environment as production and enforces the budget.
  const bypassBudget =
    process.env.NODE_ENV === "development" || env.E2E || process.env.SKIP_BUDGET === "true";
  if (bypassBudget) {
    return { allowed: true, todayUsage, budget };
  }
  return {
    allowed: todayUsage + estimatedTokens <= budget,
    todayUsage,
    budget,
  };
}

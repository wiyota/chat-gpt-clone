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
  // In development, disable the daily budget guard so engineers can iterate
  // without worrying about usage limits. `tsx watch` does not always set
  // NODE_ENV, so also check the absence of typical production signals.
  const isDevelopment =
    process.env.NODE_ENV === "development" || env.E2E || process.env.SKIP_BUDGET === "true";
  if (isDevelopment) {
    return { allowed: true, todayUsage, budget };
  }
  return {
    allowed: todayUsage + estimatedTokens <= budget,
    todayUsage,
    budget,
  };
}

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
  return {
    allowed: todayUsage + estimatedTokens <= budget,
    todayUsage,
    budget,
  };
}

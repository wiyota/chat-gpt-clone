import type { SupabaseClient } from "@supabase/supabase-js";

export interface UsageRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  created_at: string;
}

export async function reserveDailyUsage(
  supabase: SupabaseClient,
  userId: string,
  estimatedTokens: number,
  budget: number,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("reserve_daily_usage", {
    p_user_id: userId,
    p_estimated_tokens: estimatedTokens,
    p_daily_budget: budget,
  });

  if (error) {
    console.error("reserveDailyUsage error:", error);
    return null;
  }

  return typeof data === "string" ? data : null;
}

export async function finalizeUsage(
  supabase: SupabaseClient,
  reservationId: string,
  options: {
    model: string;
    promptTokens: number;
    completionTokens: number;
  },
): Promise<boolean> {
  const totalTokens = options.promptTokens + options.completionTokens;
  const { error } = await supabase
    .from("usage")
    .update({
      model: options.model,
      prompt_tokens: options.promptTokens,
      completion_tokens: options.completionTokens,
      total_tokens: totalTokens,
    })
    .eq("id", reservationId);

  if (error) {
    console.error("finalizeUsage error:", error);
    return false;
  }

  return true;
}

export async function insertUsage(
  supabase: SupabaseClient,
  options: {
    userId: string;
    conversationId?: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
  },
): Promise<UsageRow | null> {
  const totalTokens = options.promptTokens + options.completionTokens;
  const { data, error } = await supabase
    .from("usage")
    .insert({
      user_id: options.userId,
      conversation_id: options.conversationId ?? null,
      model: options.model,
      prompt_tokens: options.promptTokens,
      completion_tokens: options.completionTokens,
      total_tokens: totalTokens,
    })
    .select()
    .single();

  if (error) {
    console.error("insertUsage error:", error);
    return null;
  }

  return data as UsageRow;
}

export async function sumDailyUsage(supabase: SupabaseClient, userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("usage")
    .select("total_tokens")
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString());

  if (error) {
    console.error("sumDailyUsage error:", error);
    return 0;
  }

  return (data ?? []).reduce((sum, row) => sum + (row.total_tokens ?? 0), 0);
}

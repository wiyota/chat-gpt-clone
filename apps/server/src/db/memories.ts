import type { SupabaseClient } from "@supabase/supabase-js";

export interface Memory {
  id: string;
  user_id: string;
  fact: string;
  created_at: string;
}

export async function loadMemories(
  supabase: SupabaseClient,
  userId: string,
  limit: number,
): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("memories")
    .select("id, user_id, fact, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("loadMemories error:", error);
    return [];
  }

  return (data ?? []) as Memory[];
}

export async function insertMemory(
  supabase: SupabaseClient,
  userId: string,
  fact: string,
): Promise<Memory | null> {
  const { data, error } = await supabase
    .from("memories")
    .insert({ user_id: userId, fact })
    .select()
    .single();

  if (error) {
    console.error("insertMemory error:", error);
    return null;
  }

  return data as Memory;
}

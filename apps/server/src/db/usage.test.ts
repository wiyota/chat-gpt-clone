import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { insertUsage, sumDailyUsage } from "./usage.js";

function createMockSupabase(
  options: {
    usageData?: { total_tokens: number }[];
    usageError?: { message?: string } | null;
    insertData?: { id: string; total_tokens: number } | null;
    insertError?: { message?: string } | null;
  } = {},
) {
  return {
    from: vi.fn((table: string) => {
      const base = {
        select: vi.fn(() => base),
        eq: vi.fn(() => base),
        gte: vi.fn(() => base),
        order: vi.fn(() => base),
        limit: vi.fn(() => base),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        insert: vi.fn(() => base),
      };

      if (table === "usage") {
        return {
          ...base,
          select: vi.fn(() => ({
            ...base,
            eq: vi.fn(() => ({
              ...base,
              gte: vi.fn(() =>
                Promise.resolve({
                  data: options.usageData ?? [],
                  error: options.usageError ?? null,
                }),
              ),
            })),
          })),
          insert: vi.fn(() => ({
            ...base,
            select: vi.fn(() => ({
              ...base,
              single: vi.fn(() =>
                Promise.resolve({
                  data: options.insertData ?? null,
                  error: options.insertError ?? null,
                }),
              ),
            })),
          })),
        };
      }

      return base;
    }),
  } as unknown as SupabaseClient;
}

describe("insertUsage", () => {
  it("inserts a usage row with the computed total tokens", async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: "usage-1",
              user_id: "user-1",
              conversation_id: "conv-1",
              model: "gpt-4o-mini",
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
              created_at: "2024-01-01T00:00:00Z",
            },
            error: null,
          }),
        ),
      })),
    }));

    const supabase = {
      from: vi.fn(() => ({
        insert,
      })),
    } as unknown as SupabaseClient;

    const result = await insertUsage(supabase, {
      userId: "user-1",
      conversationId: "conv-1",
      model: "gpt-4o-mini",
      promptTokens: 10,
      completionTokens: 5,
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      conversation_id: "conv-1",
      model: "gpt-4o-mini",
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    });
    expect(result).not.toBeNull();
    expect(result?.total_tokens).toBe(15);
  });

  it("returns null when the insert fails", async () => {
    const supabase = createMockSupabase({ insertError: { message: "db error" } });

    const result = await insertUsage(supabase, {
      userId: "user-1",
      model: "gpt-4o-mini",
      promptTokens: 1,
      completionTokens: 1,
    });

    expect(result).toBeNull();
  });
});

describe("sumDailyUsage", () => {
  it("sums total tokens for today", async () => {
    const supabase = createMockSupabase({
      usageData: [{ total_tokens: 10 }, { total_tokens: 20 }, { total_tokens: 5 }],
    });

    const result = await sumDailyUsage(supabase, "user-1");

    expect(result).toBe(35);
  });

  it("returns 0 when there is no usage today", async () => {
    const supabase = createMockSupabase({ usageData: [] });

    const result = await sumDailyUsage(supabase, "user-1");

    expect(result).toBe(0);
  });

  it("returns 0 when the query fails", async () => {
    const supabase = createMockSupabase({ usageError: { message: "db error" } });

    const result = await sumDailyUsage(supabase, "user-1");

    expect(result).toBe(0);
  });

  it("filters by start of today in UTC", async () => {
    const gte = vi.fn((_column: string, _value: string) =>
      Promise.resolve({
        data: [{ total_tokens: 100 }],
        error: null,
      }),
    );

    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte,
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    await sumDailyUsage(supabase, "user-1");

    const [column, value] = gte.mock.calls[0] as [string, string];
    expect(column).toBe("created_at");

    const date = new Date(value);
    const now = new Date();
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCSeconds()).toBe(0);
    expect(date.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);

    if (now.getUTCHours() < 12) {
      expect(date.getUTCDate()).toBe(now.getUTCDate());
    }
  });
});

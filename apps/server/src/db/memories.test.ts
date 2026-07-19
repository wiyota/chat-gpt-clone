import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { insertMemory, loadMemories, type Memory } from "./memories.js";

function createMockSupabase(
  options: {
    memoriesData?: Memory[];
    memoriesError?: { message?: string } | null;
    insertData?: Memory | null;
    insertError?: { message?: string } | null;
  } = {},
) {
  return {
    from: vi.fn((table: string) => {
      const base = {
        select: vi.fn(() => base),
        eq: vi.fn(() => base),
        order: vi.fn(() => base),
        limit: vi.fn(() => base),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        insert: vi.fn(() => base),
      };

      if (table === "memories") {
        return {
          ...base,
          select: vi.fn(() => ({
            ...base,
            eq: vi.fn(() => ({
              ...base,
              order: vi.fn(() => ({
                ...base,
                limit: vi.fn(() =>
                  Promise.resolve({
                    data: options.memoriesData ?? [],
                    error: options.memoriesError ?? null,
                  }),
                ),
              })),
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

describe("loadMemories", () => {
  it("returns the most recent memories for a user", async () => {
    const supabase = createMockSupabase({
      memoriesData: [
        {
          id: "mem-1",
          user_id: "user-1",
          fact: "likes coffee",
          created_at: "2024-01-02T00:00:00Z",
        },
        {
          id: "mem-2",
          user_id: "user-1",
          fact: "lives in Tokyo",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
    });

    const result = await loadMemories(supabase, "user-1", 10);

    expect(result).toHaveLength(2);
    expect(result[0].fact).toBe("likes coffee");
  });

  it("respects the limit", async () => {
    const limit = vi.fn(() =>
      Promise.resolve({
        data: [
          {
            id: "mem-1",
            user_id: "user-1",
            fact: "only one",
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
        error: null,
      }),
    );

    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit,
            })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    await loadMemories(supabase, "user-1", 1);

    expect(limit).toHaveBeenCalledWith(1);
  });

  it("returns an empty array when the query fails", async () => {
    const supabase = createMockSupabase({ memoriesError: { message: "db error" } });

    const result = await loadMemories(supabase, "user-1", 10);

    expect(result).toEqual([]);
  });
});

describe("insertMemory", () => {
  it("inserts a memory and returns the stored row", async () => {
    const supabase = createMockSupabase({
      insertData: {
        id: "mem-1",
        user_id: "user-1",
        fact: "likes tea",
        created_at: "2024-01-01T00:00:00Z",
      },
    });

    const result = await insertMemory(supabase, "user-1", "likes tea");

    expect(result).toEqual({
      id: "mem-1",
      user_id: "user-1",
      fact: "likes tea",
      created_at: "2024-01-01T00:00:00Z",
    });
  });

  it("returns null when the insert fails", async () => {
    const supabase = createMockSupabase({ insertError: { message: "db error" } });

    const result = await insertMemory(supabase, "user-1", "likes tea");

    expect(result).toBeNull();
  });
});

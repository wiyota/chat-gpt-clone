import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { insertSummary, loadSummary, type ConversationSummary } from "./summaries.js";

function createMockSupabase(
  options: {
    summaryData?: ConversationSummary | null;
    summaryError?: { code?: string; message?: string } | null;
    insertData?: ConversationSummary | null;
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

      if (table === "summaries") {
        return {
          ...base,
          select: vi.fn(() => ({
            ...base,
            eq: vi.fn(() => ({
              ...base,
              order: vi.fn(() => ({
                ...base,
                limit: vi.fn(() => ({
                  ...base,
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: options.summaryData ?? null,
                      error: options.summaryError ?? null,
                    }),
                  ),
                })),
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

describe("loadSummary", () => {
  it("returns the latest summary when one exists", async () => {
    const supabase = createMockSupabase({
      summaryData: {
        id: "sum-1",
        conversation_id: "conv-1",
        content: "Earlier discussion",
        created_at: "2024-01-01T00:00:00Z",
      },
    });

    const result = await loadSummary(supabase, "conv-1");

    expect(result).toEqual({
      id: "sum-1",
      conversation_id: "conv-1",
      content: "Earlier discussion",
      created_at: "2024-01-01T00:00:00Z",
    });
  });

  it("returns null when no summary exists", async () => {
    const supabase = createMockSupabase({
      summaryData: null,
      summaryError: { code: "PGRST116" },
    });

    const result = await loadSummary(supabase, "conv-1");

    expect(result).toBeNull();
  });

  it("returns null on unexpected errors", async () => {
    const supabase = createMockSupabase({
      summaryData: null,
      summaryError: { message: "db error" },
    });

    const result = await loadSummary(supabase, "conv-1");

    expect(result).toBeNull();
  });
});

describe("insertSummary", () => {
  it("inserts a summary and returns the stored row", async () => {
    const supabase = createMockSupabase({
      insertData: {
        id: "sum-1",
        conversation_id: "conv-1",
        content: "Summary text",
        created_at: "2024-01-01T00:00:00Z",
      },
    });

    const result = await insertSummary(supabase, "conv-1", "Summary text");

    expect(result).toEqual({
      id: "sum-1",
      conversation_id: "conv-1",
      content: "Summary text",
      created_at: "2024-01-01T00:00:00Z",
    });
  });

  it("returns null when the insert fails", async () => {
    const supabase = createMockSupabase({ insertError: { message: "db error" } });

    const result = await insertSummary(supabase, "conv-1", "Summary text");

    expect(result).toBeNull();
  });
});

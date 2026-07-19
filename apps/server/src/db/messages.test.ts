import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@chat/shared";
import { insertMessage, loadMessages } from "./messages.js";

function createMockSupabase(
  options: {
    messagesData?: Message[];
    messagesError?: { message?: string } | null;
    insertData?: { role: string; content: string; id: string } | null;
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

      if (table === "messages") {
        return {
          ...base,
          select: vi.fn(() => ({
            ...base,
            eq: vi.fn(() => ({
              ...base,
              order: vi.fn(() =>
                Promise.resolve({
                  data: options.messagesData ?? [],
                  error: options.messagesError ?? null,
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

describe("insertMessage", () => {
  it("inserts a message and returns the stored row", async () => {
    const supabase = createMockSupabase({
      insertData: { id: "msg-1", role: "user", content: "hello" },
    });

    const result = await insertMessage(supabase, "conv-1", { role: "user", content: "hello" });

    expect(result).toEqual({ id: "msg-1", role: "user", content: "hello" });
  });

  it("includes tool call metadata when present", async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: "msg-2",
              role: "tool",
              content: "result",
              tool_call_id: "call-1",
              tool_calls: [],
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

    await insertMessage(supabase, "conv-1", {
      role: "tool",
      content: "result",
      tool_call_id: "call-1",
      tool_calls: [{ id: "call-1" }],
    });

    expect(insert).toHaveBeenCalledWith({
      conversation_id: "conv-1",
      role: "tool",
      content: "result",
      tool_call_id: "call-1",
      tool_calls: [{ id: "call-1" }],
    });
  });

  it("returns null when the insert fails", async () => {
    const supabase = createMockSupabase({ insertError: { message: "db error" } });

    const result = await insertMessage(supabase, "conv-1", { role: "user", content: "hello" });

    expect(result).toBeNull();
  });
});

describe("loadMessages", () => {
  it("loads ordered messages for a conversation", async () => {
    const supabase = createMockSupabase({
      messagesData: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
    });

    const result = await loadMessages(supabase, "conv-1");

    expect(result).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
  });

  it("returns an empty array when no messages exist", async () => {
    const supabase = createMockSupabase({ messagesData: [] });

    const result = await loadMessages(supabase, "conv-1");

    expect(result).toEqual([]);
  });

  it("returns an empty array when the query fails", async () => {
    const supabase = createMockSupabase({ messagesError: { message: "db error" } });

    const result = await loadMessages(supabase, "conv-1");

    expect(result).toEqual([]);
  });
});

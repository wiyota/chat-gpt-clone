import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateConversation, type Conversation } from "./conversations.js";

function createMockSupabase(
  options: {
    singleData?: Conversation | null;
    singleError?: { code?: string; message?: string } | null;
    insertData?: Conversation | null;
    insertError?: { message?: string } | null;
  } = {},
) {
  return {
    from: vi.fn((table: string) => {
      const conversationRow = {
        id: "conv-1",
        user_id: "user-1",
        title: "Existing chat",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const base = {
        select: vi.fn(() => base),
        eq: vi.fn(() => base),
        order: vi.fn(() => base),
        limit: vi.fn(() => base),
        single: vi.fn(() =>
          Promise.resolve({
            data: options.singleData ?? conversationRow,
            error: options.singleError ?? null,
          }),
        ),
        insert: vi.fn(() => base),
        update: vi.fn(() => base),
        delete: vi.fn(() => base),
      };

      if (table === "conversations") {
        return {
          ...base,
          select: vi.fn(() => ({
            ...base,
            eq: vi.fn(() => ({
              ...base,
              single: vi.fn(() =>
                Promise.resolve({
                  data: options.singleData ?? conversationRow,
                  error: options.singleError ?? null,
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
                  data: options.insertData ?? conversationRow,
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

describe("findOrCreateConversation", () => {
  it("returns the existing conversation when an id is provided", async () => {
    const supabase = createMockSupabase({
      singleData: {
        id: "existing-1",
        user_id: "user-1",
        title: "Existing chat",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    });

    const result = await findOrCreateConversation(supabase, "user-1", "existing-1");

    expect(result).toEqual({
      id: "existing-1",
      user_id: "user-1",
      title: "Existing chat",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });
  });

  it("creates a new conversation when no id is provided", async () => {
    const supabase = createMockSupabase({
      insertData: {
        id: "new-1",
        user_id: "user-1",
        title: "Initial title",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    });

    const result = await findOrCreateConversation(supabase, "user-1", undefined, "Initial title");

    expect(result).toEqual({
      id: "new-1",
      user_id: "user-1",
      title: "Initial title",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });
  });

  it("truncates the initial title to 50 characters", async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: "new-1",
              user_id: "user-1",
              title: "a".repeat(50),
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
            error: null,
          }),
        ),
      })),
    }));

    const supabase = {
      from: vi.fn(() => ({
        insert,
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    await findOrCreateConversation(supabase, "user-1", undefined, "a".repeat(100));

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        title: "a".repeat(50),
      }),
    );
  });

  it("falls back to a default title when none is provided", async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: "new-1",
              user_id: "user-1",
              title: "New conversation",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
            error: null,
          }),
        ),
      })),
    }));

    const supabase = {
      from: vi.fn(() => ({
        insert,
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    await findOrCreateConversation(supabase, "user-1");

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        title: "New conversation",
      }),
    );
  });

  it("returns null when fetching an existing conversation fails", async () => {
    const supabase = createMockSupabase({
      singleData: null,
      singleError: { message: "db error" },
    });

    const result = await findOrCreateConversation(supabase, "user-1", "existing-1");

    expect(result).toBeNull();
  });

  it("returns null when inserting a new conversation fails", async () => {
    const supabase = createMockSupabase({
      insertData: null,
      insertError: { message: "db error" },
    });

    const result = await findOrCreateConversation(supabase, "user-1");

    expect(result).toBeNull();
  });
});

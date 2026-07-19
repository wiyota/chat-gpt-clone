import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { conversationItemClass, createRenameDialog } from "./ConversationSidebar";
import type { Conversation } from "@/lib/conversations.js";

describe("conversationItemClass", () => {
  it("includes active classes for the active conversation", () => {
    const className = conversationItemClass(true);
    expect(className).toContain("bg-accent");
    expect(className).toContain("text-accent-foreground");
  });

  it("includes hover classes for inactive conversations", () => {
    const className = conversationItemClass(false);
    expect(className).toContain("hover:bg-accent/50");
    expect(className).not.toContain("bg-accent text-accent-foreground");
  });
});

describe("createRenameDialog", () => {
  function withDialog(onRename = vi.fn()) {
    let api: ReturnType<typeof createRenameDialog> | undefined;
    const dispose = createRoot(() => {
      api = createRenameDialog(onRename);
    });
    if (!api) throw new Error("createRenameDialog did not initialize");
    return { api, dispose };
  }

  const conversation: Conversation = {
    id: "conv-1",
    title: "Old title",
    created_at: "",
    updated_at: "",
  };

  it("opens the rename dialog with the conversation title", () => {
    const { api } = withDialog();
    const stopPropagation = vi.fn();
    api.openRename(conversation, { stopPropagation } as unknown as MouseEvent);
    expect(api.renameId()).toBe("conv-1");
    expect(api.renameTitle()).toBe("Old title");
    expect(stopPropagation).toHaveBeenCalled();
  });

  it("closes the rename dialog and clears state", () => {
    const { api } = withDialog();
    api.openRename(conversation, { stopPropagation: vi.fn() } as unknown as MouseEvent);
    api.closeRename();
    expect(api.renameId()).toBeNull();
    expect(api.renameTitle()).toBe("");
  });

  it("submits a trimmed title and closes the dialog", () => {
    const onRename = vi.fn();
    const { api } = withDialog(onRename);
    api.openRename(conversation, { stopPropagation: vi.fn() } as unknown as MouseEvent);
    api.setRenameTitle("  New title  ");
    api.submitRename();
    expect(onRename).toHaveBeenCalledWith("conv-1", "New title");
    expect(api.renameId()).toBeNull();
    expect(api.renameTitle()).toBe("");
  });

  it("does not submit when the title is empty after trimming", () => {
    const onRename = vi.fn();
    const { api } = withDialog(onRename);
    api.openRename(conversation, { stopPropagation: vi.fn() } as unknown as MouseEvent);
    api.setRenameTitle("   ");
    api.submitRename();
    expect(onRename).not.toHaveBeenCalled();
  });

  it("does not submit when no rename id is set", () => {
    const onRename = vi.fn();
    const { api } = withDialog(onRename);
    api.setRenameTitle("New title");
    api.submitRename();
    expect(onRename).not.toHaveBeenCalled();
  });
});

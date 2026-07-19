import { describe, it, expect, vi } from "vitest";
import { shouldRender, handleKeyDown } from "./ChatPane";
import type { Message } from "@chat/shared";

function message(partial: Partial<Message> & { role: Message["role"] }): Message {
  return {
    id: "msg-1",
    conversation_id: "conv-1",
    content: partial.content ?? null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...partial,
  } as Message;
}

describe("shouldRender", () => {
  it("hides tool messages", () => {
    expect(shouldRender(message({ role: "tool", content: "result" }))).toBe(false);
  });

  it("shows user messages", () => {
    expect(shouldRender(message({ role: "user", content: "hi" }))).toBe(true);
  });

  it("shows assistant messages with content", () => {
    expect(shouldRender(message({ role: "assistant", content: "hi" }))).toBe(true);
  });

  it("shows assistant messages with tool calls even when content is empty", () => {
    expect(
      shouldRender(
        message({
          role: "assistant",
          content: "",
          tool_calls: [{ function: { name: "getCurrentTime" } }],
        }),
      ),
    ).toBe(true);
  });

  it("hides empty assistant messages without tool calls", () => {
    expect(shouldRender(message({ role: "assistant", content: "" }))).toBe(false);
  });
});

describe("handleKeyDown", () => {
  function makeEvent(options: {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    preventDefault?: () => void;
  }): KeyboardEvent {
    return {
      key: options.key,
      metaKey: options.metaKey ?? false,
      ctrlKey: options.ctrlKey ?? false,
      preventDefault: options.preventDefault ?? vi.fn(),
    } as unknown as KeyboardEvent;
  }

  it("submits on Meta+Enter on Mac", () => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", metaKey: true });
    handleKeyDown(event, submit, false);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(submit).toHaveBeenCalledWith(event);
  });

  it("submits on Ctrl+Enter on non-Mac", () => {
    Object.defineProperty(navigator, "platform", { value: "Win32", configurable: true });
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", ctrlKey: true });
    handleKeyDown(event, submit, false);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(submit).toHaveBeenCalledWith(event);
  });

  it("does nothing when disabled", () => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter", metaKey: true });
    handleKeyDown(event, submit, true);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("does nothing on Enter without modifier", () => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    const submit = vi.fn();
    const event = makeEvent({ key: "Enter" });
    handleKeyDown(event, submit, false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("does nothing on non-Enter keys", () => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    const submit = vi.fn();
    const event = makeEvent({ key: "Escape", metaKey: true });
    handleKeyDown(event, submit, false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });
});

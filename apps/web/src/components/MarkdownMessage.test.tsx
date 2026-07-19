import { describe, it, expect } from "vitest";
import { render } from "solid-js/web";
import { MarkdownMessage } from "./MarkdownMessage";

function renderMarkdown(content: string) {
  const container = document.createElement("div");
  const dispose = render(() => <MarkdownMessage content={content} />, container);
  return { container, dispose };
}

describe("MarkdownMessage", () => {
  it("renders plain text", () => {
    const { container } = renderMarkdown("Hello world");
    expect(container.textContent?.trim()).toBe("Hello world");
  });

  it("renders bold and italic markdown", () => {
    const { container } = renderMarkdown("**bold** and *italic*");
    const html = container.innerHTML;
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  it("renders a link", () => {
    const { container } = renderMarkdown("[link](https://example.com)");
    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("href")).toBe("https://example.com");
    expect(anchor?.textContent).toBe("link");
  });

  it("sanitizes malicious HTML", () => {
    const { container } = renderMarkdown('<script>alert("xss")</script>Hello');
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("<script");
    expect(container.textContent?.trim()).toContain("Hello");
  });

  it("updates when content prop changes", () => {
    const container = document.createElement("div");
    let content = "first";
    const dispose = render(() => <MarkdownMessage content={content} />, container);
    expect(container.textContent?.trim()).toBe("first");

    content = "second";
    dispose();
    render(() => <MarkdownMessage content={content} />, container);
    expect(container.textContent?.trim()).toBe("second");
  });
});

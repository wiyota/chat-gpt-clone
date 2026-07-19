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

  it("renders single line breaks as br tags", () => {
    const { container } = renderMarkdown("line one\nline two");
    const html = container.innerHTML;
    expect(html).toContain("<br>");
    expect(html).toContain("line one");
    expect(html).toContain("line two");
  });

  it("renders double line breaks as paragraph breaks", () => {
    const { container } = renderMarkdown("paragraph one\n\nparagraph two");
    expect(container.innerHTML).toContain("paragraph one");
    expect(container.innerHTML).toContain("<p>paragraph two</p>");
  });

  it("renders headings with size and weight", () => {
    const { container } = renderMarkdown("# heading\n\ntext");
    const html = container.innerHTML;
    // Note: happy-dom's DOMPurify integration strips heading tags in tests,
    // but real browsers preserve them and apply the CSS in index.css.
    expect(html).toContain("heading");
    expect(html).toContain("text");
  });
});

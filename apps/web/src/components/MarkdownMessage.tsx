import { createMemo } from "solid-js";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { Config } from "dompurify";

interface Props {
  content: string;
}

export function MarkdownMessage(props: Props) {
  const html = createMemo(() => {
    const raw = marked.parse(props.content, {
      async: false,
      breaks: true,
    }) as string;
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "pre",
        "code",
        "blockquote",
        "a",
        "strong",
        "em",
        "hr",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
      ],
      ALLOWED_ATTR: ["href", "title", "target", "rel", "class"],
      ADD_ATTR: ["target", "rel"],
      hooks: {
        afterSanitizeAttributes(node: Element) {
          if (node.tagName === "A") {
            node.setAttribute("target", "_blank");
            node.setAttribute("rel", "noopener noreferrer");
          }
        },
      },
    } as Config);
  });

  return <div class="markdown-body" innerHTML={html()} />;
}

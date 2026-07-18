import { createMemo } from "solid-js";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface Props {
  content: string;
}

export function MarkdownMessage(props: Props) {
  const html = createMemo(() => {
    const raw = marked.parse(props.content, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  });

  return <div class="markdown-body" innerHTML={html()} />;
}

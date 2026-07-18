# ADR 011: Markdown rendering for chat messages

## Status

Accepted

## Context

Conversation messages are currently rendered as plain text inside a `<div>`. Multi-line responses, lists, code snippets, and inline formatting are not visually distinguished, which hurts readability — especially for assistant responses that frequently contain structured Markdown.

## Decision

Render message content as Markdown using `solid-markdown`, a SolidJS wrapper around the `unified` / `remark` / `rehype` ecosystem. It emits Solid JSX, so we avoid `innerHTML` and manual sanitization, and it reacts naturally to signal updates during streaming.

A small wrapper component (`MarkdownMessage`) will be used inside `ChatPane` for every rendered message. Tool-call markers remain plain text and are not passed through the Markdown renderer. Streaming assistant content is rendered as Markdown incrementally; incomplete syntax may look slightly odd mid-stream but will correct itself as more chunks arrive.

## Consequences

- Assistant responses become readable without extra whitespace handling.
- Common Markdown constructs (lists, code, emphasis) are styled via CSS.
- No need for DOMPurify or raw HTML injection.
- Adds `unified` ecosystem dependencies to the frontend bundle, which is acceptable for a chat UI.
- Syntax highlighting is out of scope for this slice and can be layered in later.

## Related

- Plan `0010_markdown_rendering.md`
- `apps/web/src/components/ChatPane.tsx`

# ADR 013: Conversation Title Generation

## Status

Accepted

## Context

Every conversation row in Supabase has a `title` column. Since the first chat slice, new conversations have been inserted with the static default title "New conversation". This makes the sidebar hard to scan once a user has several chats, because every entry looks identical until the user manually renames it.

We want each conversation to have a short, meaningful title based on the first user message, without adding significant cost or latency.

## Decision

- Generate the title once, after the first assistant reply has finished streaming.
- Use the first user message as the only input to the title generator.
- Call the existing `LLMAdapter.chat` (non-streaming) path with a concise system prompt asking for a short title.
- Cap the generated title at 50 characters and strip surrounding quotes/whitespace.
- Persist the title server-side via `POST /api/conversations/:id/title` using the user-scoped Supabase client so RLS enforces ownership.
- If generation fails or returns empty text, keep the default title "New conversation" and do not surface an error to the user.
- Use the same model configured for general chat (`gpt-4o-mini` by default) for cost efficiency.

## Consequences

- The sidebar becomes scannable immediately after the first reply.
- One additional LLM call is made per conversation, but it is small and uses a cheap model.
- Title generation does not block the streaming reply; it runs after the stream ends.
- No new database columns or migrations are required.
- The title is deterministic only in the sense that it is regenerated from the same first message; different models may produce different titles.

## Alternatives considered

- **Generate title inline during the first chat request**: rejected because it would increase latency before the first token reaches the user and complicates the streaming response format.
- **Use a rule-based title (first 30 chars of the user message)**: rejected because it often produces truncated or noisy titles; a small LLM call yields much better usability.
- **Allow manual rename only**: rejected because requiring user action for every new chat is poor UX for a ChatGPT-like app.

## Notes

- The title endpoint is idempotent: calling it again returns the already-persisted title. This makes retries and future manual rename easy to reason about.

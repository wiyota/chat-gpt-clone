# ADR 008: Long-term memory — cross-conversation user facts

## Status

Accepted

## Context

The existing summary keeps context inside a single conversation. To make the assistant feel like it "remembers" the user across sessions, we need a separate store for durable facts (name, preferences, constraints) that are injected into the system prompt of every chat.

## Decision

Add a `memories` table scoped per user:

1. Store one fact per row: `memories(user_id, fact, created_at)`.
2. Protect rows with RLS so users can only read/write their own memories.
3. After each user message, ask the LLM to extract durable facts from that message; persist non-empty results.
4. When building the context for a chat request, load the user's memories (capped by `MEMORY_MAX_FACTS`) and prepend them to the system prompt.
5. Keep the injection small to avoid consuming the context budget.

## Consequences

- The assistant can recall user-level facts across conversations.
- Memory extraction adds one small LLM call per user message.
- Unbounded memory growth is limited by a configurable cap; duplicates are ignored on exact-match insert.
- Personal/identifiable information (PII) may be stored, so the UI should eventually disclose this behavior.

## Related

- `adr/003-supabase-auth-db.md` — user-scoped RLS patterns.
- `adr/006-context-window-management.md` — memories consume part of the context budget.
- `adr/004-llm-provider-abstraction.md` — fact extraction uses the same adapter.

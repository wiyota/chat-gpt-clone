# ADR 010: Prompt cache awareness — fixed prefix, volatile suffix

## Status

Accepted

## Context

OpenAI and other providers can reuse cached prefix computations when the same leading tokens are sent repeatedly. Our context builder currently places volatile memories at the very front of the message list, so any new memory invalidates the cacheable prefix.

## Decision

Keep a stable, fixed `system` message at the beginning of every request and place volatile context (memories, summaries) after it. User input and other per-turn values stay at the end. This lets the provider’s automatic prompt cache hit the fixed prefix even when memories or summaries change.

## Consequences

- Token cost and latency may decrease for long conversations with a stable prefix.
- Memories are still injected, but no longer as the first message.
- The base system prompt is a single source of truth for assistant behavior.
- Providers without automatic prefix caching gain no benefit, but the ordering is still good hygiene.

## Related

- `adr/006-context-window-management.md` — summaries stay close to recent history.
- `adr/008-long-term-memory.md` — memories are injected but not at the front.
- `adr/004-llm-provider-abstraction.md` — applies to all providers uniformly.

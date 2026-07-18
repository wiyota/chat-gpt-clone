# ADR 004: LLM provider abstraction — `callLLM`

## Status

Accepted

## Context

The tutorial uses OpenAI by default and shows how to switch to Anthropic in Appendix C. The two providers differ in message format, system-prompt handling, and streaming payload shape.

## Decision

Create a provider-agnostic `callLLM` abstraction:

- A shared `Message` type used by the rest of the app (`role: 'system' | 'user' | 'assistant' | 'tool'; content: string; ...`).
- A `ProviderAdapter` interface that knows how to map the shared message list to provider-specific request bodies and parse the streaming response.
- Adapters for OpenAI and Anthropic, selectable via environment variable (`LLM_PROVIDER=openai|anthropic`).
- A factory function `createLLMProvider()` used by the Hono server.

## Rationale

- Keeps chat orchestration code independent from provider quirks.
- Makes it easy to follow the tutorial’s default (OpenAI) while keeping Anthropic available as a one-line config change.
- Makes unit tests easier because the adapter can be mocked without touching the provider SDK.

## Consequences

- We must stay aware of differences such as Anthropic’s `system` top-level field vs. OpenAI’s `system` message in the messages array.
- Tool-calling formats also differ; the adapter must normalize tool definitions and tool results.
- Streaming parsers need to handle provider-specific event shapes but emit a common `StreamChunk` type.

## Related

- `requirements.md`
- `adr/002-hono-server.md`
- `adr/003-supabase-auth-db.md`

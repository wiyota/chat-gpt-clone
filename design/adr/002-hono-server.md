# ADR 002: Server framework — Hono instead of Express

## Status

Accepted

## Context

The tutorial specifies TypeScript + Express. The team asked whether Express can be replaced with Hono.

## Decision

Use **Hono** as the HTTP server framework, running on Node.js (with the option to move to Bun later).

## Rationale

- Hono is TypeScript-native and requires no extra `@types/*` packages.
- Its middleware model (`app.use`, `app.get`, `app.post`) is close enough to Express that the tutorial’s routing concepts map directly.
- SSE streaming responses are simple to write with `c.stream()` or `c.text(stream, 200, { 'Content-Type': 'text/event-stream' })`.
- Smaller runtime footprint and faster cold-start than Express, which is attractive for a project that may be deployed to serverless/edge platforms later.
- Cross-runtime support (Node, Bun, Deno, Workers) keeps future deployment options open.

## Consequences

- Some Express-specific middleware (`cors`, `body-parser`) must be replaced with Hono equivalents or built-ins.
- Error-handling patterns differ slightly (`app.onError` instead of Express error middleware).
- Hono’s ecosystem is smaller than Express’s, but all dependencies we need (Supabase client, OpenAI/Anthropic SDKs, SSE) work in Node.
- Tutorial code snippets must be mentally translated from Express to Hono; we will document this mapping in implementation notes.

## Related

- `requirements.md`
- `adr/003-supabase-auth-db.md`
- `adr/004-llm-provider-abstraction.md`

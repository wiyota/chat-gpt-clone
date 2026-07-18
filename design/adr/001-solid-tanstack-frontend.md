# ADR 001: Frontend stack — Solid + TanStack

## Status

Accepted

## Context

The tutorial code uses plain TypeScript/JavaScript with `fetch` so readers can focus on LLM concepts without framework specifics. The team wants a modern, maintainable single-page app and has chosen to use **Solid** and the **TanStack** family of libraries.

## Decision

Use the following frontend stack:

- **Solid** as the reactive UI framework.
- **TanStack Query** for server-state synchronization (conversations, messages, streaming mutations, usage counters).
- **TanStack Router** for type-safe client-side routing (conversation list, active chat, settings).

## Rationale

- Solid’s fine-grained reactivity fits streaming chat updates naturally and keeps bundle size small.
- TanStack Query gives robust caching, background refetching, optimistic updates, and mutation status — all critical for a chat app that reads/writes to Supabase and the custom server.
- TanStack Router provides first-class TypeScript support for route params and search state, which is useful when the active `conversationId` lives in the URL.
- Both Solid and TanStack have strong TypeScript support and are documented in Japanese and English.

## Consequences

- Developers need to be familiar with Solid primitives (`createSignal`, `createResource`, `Show`, `For`, `createStore`) and TanStack Query hooks (`createQuery`, `createMutation`).
- Build tooling switches from a plain `index.html` setup to **Vite + vite-plugin-solid**.
- We will not use SolidStart at first to keep deployment simple; this can be revisited later.
- The frontend implementation may diverge from the tutorial’s plain-JS examples, so we will map tutorial concepts (fetch, SSE, DOM updates) to Solid/TanStack equivalents.

## Related

- `requirements.md`
- `adr/004-llm-provider-abstraction.md` (provider differences affect how streaming is parsed on the client)

# ChatGPT Clone — Requirements

Extracted from [Singularity Society — ChatGPTクローンで学ぶ LLMアプリ開発入門](https://singularitysociety.github.io/societys_statement/development/chatgpt_clone/README.html).

## Product goal

Build a minimal but safe ChatGPT-like conversational app that demonstrates the two core backbones of LLM application development:

1. **LLM is stateless — the developer builds memory.** Every request must resubmit the conversation history; the app persists it and manages context limits.
2. **API keys and money must be guarded by your own server.** The LLM API key lives only on the server, and usage is restricted per authenticated user.

## Functional requirements

### Authentication & authorization
- Users sign in with Google OAuth via Supabase Auth.
- Row-level security (RLS) ensures a user can only read/write their own conversations and messages.

### Conversations
- A user can create multiple conversation sessions.
- Each session has a title, timestamps, and a list of messages.
- The user can resume a previous session.
- The app can list, select, and delete sessions.

### Messaging
- The user sends a `user` message; the assistant replies.
- The assistant response streams in token-by-token using Server-Sent Events (SSE).
- The user can abort an in-flight assistant response.
- Messages are persisted before or immediately after the assistant turn completes (with handling for interruption/error).

### LLM integration
- The server proxies calls to an LLM provider (OpenAI by default, Anthropic switchable).
- A single `callLLM` abstraction hides provider-specific message/system formats.
- The server injects a configurable system prompt.

### Memory & context management
- Every LLM request includes the full conversation history for that session.
- When context approaches the token limit, the app summarizes older turns and keeps recent messages.
- Optional long-term memory: facts extracted from conversations can be stored and injected into the system prompt.

### Usage & safety guards
- The server authenticates every API request and enforces per-user usage limits.
- The app returns a clear 429 / quota-exceeded response instead of letting costs explode.
- The LLM API key is never sent to the browser.

### Tools (future slice)
- The assistant can invoke external tools/functions.
- Tool calls and their results are stored and rendered in the message history.

## Non-functional requirements

- TypeScript throughout (server and browser).
- Server framework: Hono (lightweight, TypeScript-native, SSE-friendly).
- Frontend framework: Solid for reactive UI.
- Server-state / routing: TanStack Query and TanStack Router.
- Database: Supabase (PostgreSQL + Auth + RLS).
- Secrets managed via environment variables only on the server.
- Portable local development and a clear path to deployment.

## Out of scope (initial slices)

- Multi-tenant billing or real payments.
- Admin dashboard.
- File upload / vision / image generation.
- Production deployment automation.

## Decision records

- `adr/001-solid-tanstack-frontend.md` — Solid + TanStack
- `adr/002-hono-server.md` — Hono instead of Express
- `adr/003-supabase-auth-db.md` — Supabase Auth + PostgreSQL + RLS
- `adr/004-llm-provider-abstraction.md` — `callLLM` abstraction over OpenAI/Anthropic

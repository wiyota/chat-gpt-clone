# ADR 007: Usage limits — per-user daily token budget

## Status

Accepted

## Context

The server holds the LLM API key and pays for every token sent to the provider. Without per-user limits, a single user could generate runaway costs. We need a simple, server-enforced guard that caps usage and returns a clear 429 when the cap is exceeded.

## Decision

Implement a **daily token budget** per user:

1. Track each LLM request's `prompt_tokens`, `completion_tokens`, and `total_tokens` in the existing `usage` table.
2. Sum `total_tokens` for the current user within the last 24 hours (calendar day in UTC).
3. Before streaming a response, check whether the current request would exceed a configurable `DAILY_TOKEN_BUDGET`.
4. If the budget is exhausted, return `429 Too Many Requests` with a clear `quota_exceeded` error before calling the LLM provider.
5. Make the budget configurable per deployment via an environment variable.

## Consequences

- Costs are capped per user per day without requiring a separate billing system.
- Token counts come from the LLM provider response (non-streaming) or are approximated during streaming; for simplicity we record the provider-reported totals after the call.
- The budget check uses the same provider call that generates the response, so we reject before streaming starts and avoid wasting provider tokens.
- A future slice can add richer limits (per-minute rate limits, monthly quotas, admin overrides).

## Related

- `adr/003-supabase-auth-db.md` — usage table and RLS already exist.
- `adr/004-llm-provider-abstraction.md` — provider responses expose token counts.
- `adr/006-context-window-management.md` — summarization also consumes the budget and is recorded.

# ADR 006: Context window management — summary + recent-message hybrid

## Status

Accepted

## Context

The LLM has a finite context window, and every request must resubmit the conversation history. Loading all messages from a long conversation into the prompt eventually exceeds the model's token limit and causes API errors or degraded responses. We need a strategy to keep the most relevant context while staying within token budgets.

## Decision

Implement a **summary + recent-message hybrid** context builder:

1. Count tokens for the full message history using a model-aware tokenizer.
2. Define a configurable context-token budget and a number of recent turns to always keep verbatim.
3. If the history exceeds the budget:
   - Summarize the oldest messages (excluding the preserved recent turns) via the same LLM provider.
   - Store the summary in a new `summaries` table keyed by conversation.
   - Send the LLM a context composed of: system prompt + latest summary + recent messages.
4. If the history fits within the budget, send the full history as before.

## Consequences

- Token overflow is prevented without dropping user/assistant turns silently.
- Older conversation content is compressed into a summary, which may lose detail.
- The summarization itself costs tokens and adds latency to the affected request.
- The tokenizer and budget settings are model-dependent and must be configurable per deployment.

## Related

- `adr/004-llm-provider-abstraction.md` — summaries are generated through the same adapter.
- `adr/003-supabase-auth-db.md` — summaries are persisted with RLS per conversation.

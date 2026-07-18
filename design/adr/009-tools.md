# ADR 009: Tools — function calling with validation and execution loop

## Status

Accepted

## Context

The LLM can only generate text. To let it interact with the outside world (calculate, fetch data, take action), we expose a set of server-defined tools. The LLM requests tool calls, the server executes them safely, and the results are fed back so the LLM can continue the conversation.

## Decision

Implement tool support as a bounded execution loop:

1. Define tool schemas in server code (name, description, parameters). Keep them minimal and read-only for this slice (e.g., `getCurrentTime`, `calculator`).
2. When a chat request is made, pass the tool schemas to the LLM adapter alongside the messages.
3. If the LLM responds with `tool_calls`, validate every argument, execute the matching server function, and append a `tool` message for each result.
4. Send the updated message list back to the LLM (still within the same request lifecycle) to get the final assistant response.
5. Cap the number of tool rounds (e.g., 3) to prevent infinite loops.
6. Persist the assistant message and tool results as part of the conversation history.

## Consequences

- The assistant can answer questions that require computation or external lookup.
- Tool arguments come from the LLM and must be validated before execution (prompt injection defense).
- Each tool round consumes tokens and adds latency; the cap limits cost and runtime.
- Tools are server-only; the browser never sees API keys used by tool implementations.

## Related

- `adr/004-llm-provider-abstraction.md` — tools are passed through the same adapter.
- `adr/007-usage-limits.md` — each tool round consumes the user's token budget.
- `adr/005-typebox-validation.md` — tool argument validation uses TypeBox.

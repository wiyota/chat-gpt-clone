---
name: solidjs-patterns
description: SolidJS reactivity and component patterns for this project, especially signals, props, stores, For/Show, and TanStack Query integration.
---

# SolidJS patterns for this project

## When to use

Activate this skill when working with SolidJS components, signals, reactivity bugs, or TanStack Query integration in this project.

## Core rules

### Signals and reactivity

- Always treat signals as functions: read `signal()`, write `setSignal(value)`.
- Computed values should be plain functions or `createMemo` when expensive:
  ```ts
  const doubled = createMemo(() => count() * 2);
  ```
- Do not destructure props if you need reactivity. Use `props.name` directly inside JSX or effects.

### Passing reactive data to child components

- To keep a child reactive, pass a signal/function, not the value:
  ```tsx
  // Good
  <ChatPane messages={messages} />

  // Bad — only the initial value is passed
  <ChatPane messages={messages()} />
  ```
- The child should call the function inside JSX or `For`:
  ```tsx
  <For each={props.messages()}>{...}</For>
  ```

### Stores for nested updates

- Use `createStore` when you need to update nested objects/arrays and want fine-grained reactivity without full replacements:
  ```ts
  const [messages, setMessages] = createStore<Message[]>([]);
  // Update one field of one item
  setMessages(messages.length - 1, "content", newContent);
  ```
- For simple arrays of primitives, signals are fine, but replace the whole array to trigger updates:
  ```ts
  setMessages((prev) => [...prev]);
  ```

### TanStack Query Solid

- `createQuery(() => ({ queryKey: [...], queryFn: ... }))` — the argument must be a function returning the options object.
- Refetch manually with `query.refetch()`.
- Mutations: `createMutation(() => ({ mutationFn: ..., onSuccess: ... }))`.
- Do not put streaming state inside TanStack Query. Use local Solid signals for streaming UI state.

### Streaming / SSE UI pattern

- Keep a local signal `liveMessages` for the messages being streamed.
- Pass it as a function to the chat pane: `<ChatPane messages={liveMessages} />`.
- Append assistant tokens by replacing the array or using a store.
- After the stream ends, refetch the server state and clear `liveMessages`.

### Component props types

```ts
interface Props {
  messages: () => Message[];
  input: string;
  isLoading: boolean;
  onSubmit: (e: Event) => void;
}
```

### Anti-patterns to avoid

- `messages={messages()}` in JSX when the parent expects updates.
- Mutating signal arrays directly: `arr[0].content = "x"` without replacing the signal.
- Calling `setSignal` outside of a reactive context without `batch` for multiple updates.

## Project-specific patterns

- Use the shared `Message` type from `@chat/shared`.
- Chat panes receive a function returning messages so the message list stays reactive during streaming.
- Active conversation selection is a signal; conversation message lists come from TanStack Query.

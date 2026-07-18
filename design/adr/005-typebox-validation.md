# ADR 005: Validation library — TypeBox on the server

## Status

Accepted

## Context

Initial scaffolding used Zod for environment variable validation and the `/api/chat` request body schema. The team then briefly switched to Valibot for a smaller server bundle, but reconsidered because validation only runs on the server and a JSON Schema-compatible library would make future OpenAPI or contract-sharing work easier.

## Decision

Use **TypeBox** for all runtime validation on the server.

- Environment variables in `apps/server/src/env.ts`.
- Request body validation for Hono routes.
- Optional: export JSON Schemas from TypeBox definitions if the frontend or documentation needs them later.

Valibot and Zod are removed as server dependencies. The frontend is free to choose its own validation strategy.

## Rationale

- TypeBox produces standard JSON Schemas, which improves interoperability with OpenAPI, documentation generators, and future contract tests.
- On the server, bundle size is less important than clarity and ecosystem compatibility.
- `@hono/typebox-validator` provides first-party Hono middleware.
- `Type.Transform` handles string-to-number conversion for `PORT` cleanly.
- The shared package has no validation logic, so it does not need a validation dependency.

## Consequences

- All future server schemas must use TypeBox (`Type.Object`, `Type.String`, `Type.Optional`, `Type.Transform`, etc.).
- If we later want to share runtime schemas with the frontend, we can export the underlying JSON Schema and use it on the client side.
- Frontend validation is not bound to this decision and may use a different lightweight library or browser-native APIs.

## Related

- `apps/server/src/env.ts`
- `apps/server/src/routes/chat.ts`
- `adr/002-hono-server.md`

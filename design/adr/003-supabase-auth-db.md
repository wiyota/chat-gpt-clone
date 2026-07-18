# ADR 003: Auth and persistence — Supabase Auth + PostgreSQL + RLS

## Status

Accepted

## Context

The tutorial requires a free database and Google OAuth. The Twitter-clone sibling tutorial also uses Supabase.

## Decision

Use **Supabase** for:

- **Authentication:** Google OAuth provider.
- **Database:** PostgreSQL for `conversations`, `messages`, `usage`, and optional `memories` tables.
- **Authorization:** Row-level security (RLS) so users can only access their own rows.

## Rationale

- Supabase Auth handles OAuth callbacks, sessions, and JWT refresh without custom auth code.
- PostgreSQL is reliable, supports JSON columns, and integrates well with RLS.
- RLS is the simplest way to enforce the “your data only” rule that runs through the whole tutorial.
- A generous free tier is sufficient for learning and small deployments.

## Key secrets and access rules

- **`publishable` key (`sb_publishable_...` or legacy `anon`):** Public. Lives in the frontend build/environment. Only performs operations allowed by RLS policies.
- **`secret` key (`sb_secret_...` or legacy `service_role`):** Secret. Lives only on the Hono server. Used for privileged operations that bypass RLS (e.g., quota enforcement, cleanup tasks). New projects should prefer the new `sb_*` formats.
- **RLS policies:** All user-facing tables must have policies keyed on `auth.uid()`. The server uses the user’s JWT to act on their behalf when possible; the secret key is reserved for operations the user cannot be trusted with.

## Consequences

- Local development needs either a Supabase project or the Supabase CLI/local stack for offline work.
- Schema migrations and RLS policies must be version-controlled (SQL files under `supabase/migrations`).
- Authentication state must be shared correctly between Solid client, TanStack Query, and the Hono server (via `Authorization: Bearer <token>`).

## Related

- `requirements.md`
- `adr/002-hono-server.md`
- `adr/004-llm-provider-abstraction.md`

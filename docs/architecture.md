# SponsorSync Architecture

## Request path

    Browser (React/Vite, client/)
        │  HTTPS via VITE_API_URL, Axios withCredentials: true
        ▼
    Express API (server/, /api/*)
        │  routes → services → models
        ▼
    Sequelize v6 (ESM, umzug migrations)
        ▼
    Supabase PostgreSQL (managed database)

React never connects to Supabase directly. Only the backend holds the database connection string. (From Plan 3, the backend also holds the Supabase storage service-role key; the frontend never receives it.)

## Backend layers

- **routes** — map URLs to a thin inline `asyncHandler` closure; attach `authenticate` / `authorizeRoles` / `validateRequest` middleware. The handler translates HTTP in/out and nothing else: no business rules, no direct DB access.
  - There is deliberately **no `controllers/` directory**. Earlier drafts of this file and of `plans/01` described one, but the code never had it and a separate layer would add a file per route for no behaviour. Keep handlers inline and put every rule in `services/`.
- **services** — business rules and database transactions. The authority for authorization, validation, and audit.
  - Every mutation and the audit row describing it go in **one `sequelize.transaction()`**. See `userService.createUser` for the canonical shape; pass the transaction through to `createAuditLog`. A mutation that commits without its audit row is a bug, not a nuisance.
- **models** — Sequelize definitions and associations. No business workflows.
- **validators** — Zod request schemas.
- **middleware** — `authenticate`, `authorizeRoles`, `validateRequest`, `errorHandler`, `notFoundHandler`.
- **utils** — normalized email, safe user serialization, async route handler, application errors, audit-log creation.

## Authentication

Backend-managed. bcrypt password hashes; a JWT in an HTTP-only cookie (`sponsorsync_session`). The JWT carries only `{ sub, tokenVersion }` — never the full user object or secrets.

Every protected request reloads the active DB user and compares `tokenVersion` against the token. Bumping `tokenVersion` — on password change, account deactivation, admin password reset, confirmed email change, or **role change** — invalidates all existing tokens immediately, on the next request.

A user whose `mustChangePassword` flag is set is rejected with `AUTH_PASSWORD_CHANGE_REQUIRED` (403) on every route except `POST /auth/change-password`, `POST /auth/logout`, and `GET /auth/me`. The client-side redirect in `RequireAuth` is convenience; this middleware is the control. This satisfies the plan's "disabled user's existing session is rejected on the next protected request" requirement without waiting for token expiry.

## Roles

Fixed enum: `ADMIN`, `LEADER`, `MEMBER`, `SUPERVISOR`. No dynamic permission table. The role matrix lives in `docs/roles-and-access.md` and route definitions. Hidden frontend controls are not security; the backend always re-authorizes.

## Data rules

- UUID primary keys (PostgreSQL `gen_random_uuid()`), never sequential public IDs.
- `snake_case` tables/columns; singular PascalCase Sequelize models, configured explicitly.
- All mutable tables: `id`, `created_at`, `updated_at`. Archivable tables add `archived_at` (no hard delete). `users` uses `is_active` so disabled users stay linked to history.
- Timestamps stored UTC, returned ISO 8601. Frontend formats for display.
- Monetary fields are PostgreSQL `numeric`, returned as strings to avoid floating-point errors.

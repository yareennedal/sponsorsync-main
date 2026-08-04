# SponsorSync Local Setup

Clean-clone procedure. **All commands run from the repo root** — this is an npm workspace, so
running them inside `client/` or `server/` separately is two terminals for no benefit.

> **Joining the team on the existing shared database?** You only need sections 1 and 4:
> `npm ci`, then `npm run dev`. Sections 2 and 3 are already done — `.env` is committed and the
> shared dev database has every migration and the seed admin. The rest of this page is for
> creating your own database from scratch.

Requires **Node 24** (see `.nvmrc`; `nvm use` picks it up) and, for a fresh setup, a Supabase
PostgreSQL project (dev + test).

## 1. Install

    npm ci

Installs both workspaces (`client/`, `server/`) and their dependencies.

`.npmrc` sets `engine-strict=true`, so this **fails immediately** on the wrong Node version with
`EBADENGINE ... Required: {"node":">=24"}` rather than warning and breaking later at runtime.

## 2. Configure environment

**Nothing to do — `server/.env` and `client/.env` are committed to the repository.** Clone and
they are already there, filled in and working.

> This is a deliberate decision for a private four-person project, and it has one hard
> consequence: **the repository cannot be made public as-is.** Real credentials are in git
> history, so deleting the files later does not undo it. Before open-sourcing, rotate the
> Supabase passwords and `JWT_SECRET`, re-ignore both files, then change visibility.
>
> **If you change a value, commit it.** Everyone shares one dev database and one seed admin, so
> a change that stays on your laptop breaks other people rather than only you.

`.env.example` in each workspace is kept as documentation of what each variable means, and is
what you would copy from if the files are ever re-ignored.

`server/.env` contains:

- `DATABASE_URL_DEV` — Supabase **dev** direct connection (port 5432).
- `DATABASE_URL_TEST` — Supabase **test** project direct connection (separate project).
- `JWT_SECRET` — 32+ random characters. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. **The server refuses to boot without it**, rather than failing later with a generic 500 at login.
- `CLIENT_ORIGIN` — defaults to `http://localhost:5174`. It is the CORS allow-list and cookie origin, so if you run the client anywhere else, set it or every authenticated request fails silently.
- `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
- `NODE_ENV` — must be `development`, `test`, or `production`. A typo is a boot error, not a silent fallback.

> **`git worktree` note.** This used to be a trap: `server/.env` was gitignored, so a fresh
> worktree had none and the DB-backed suites failed at import with `No Sequelize instance passed`,
> an error that points nowhere useful. Now that the file is committed, a worktree gets it
> automatically and there is nothing to copy.

`client/.env` needs:

- `VITE_API_URL` — backend origin, e.g. `http://localhost:4000`. (Client port is fixed at 5174; see `client/vite.config.js`.)

## 3. Migrate and seed

    npm run db:migrate     # applies all migrations to the dev database
    npm run db:seed        # idempotently creates the seed administrator

Expected: `db:migrate` reports each migration applied; `db:seed` reports one admin created or
up-to-date. Both are idempotent — re-running `db:migrate` applies nothing, because umzug records
what it has already run in the `SequelizeMeta` table.

The seeded admin ships with `mustChangePassword` set, so your first login is redirected to the
change-password page. That is enforced server-side: until you change it, every other API route
returns 403 `AUTH_PASSWORD_CHANGE_REQUIRED`.

> **There is no mail sender**, and no self-service password reset either — that flow was removed
> deliberately (see `docs/roles-and-access.md`). If you lock yourself out, reset the account from
> another admin session via the users page, or re-run `npm run db:seed`.
>
> Changing your own email is also not self-service — an admin does it from the users page. There
> are no OTPs left anywhere in the app, so nothing here needs mail to work.

## 4. Run

    npm run dev            # starts client + server concurrently

- Client: `http://localhost:5174`
- Server: `http://localhost:4000`
- Health: `GET http://localhost:4000/api/health` → `200` when the DB is reachable.

## 5. Sign in

Open the client URL, sign in with the seed admin email + password. You will be forced to change the password on first login if `must_change_password` is true.

## Validation commands

Run after every milestone. All must pass (green) before the next milestone.

    npm run lint
    npm run format:check
    npm run test
    npm run build

Expected results (documented here so a clean clone is verifiable):

- `npm run lint` — no errors.
- `npm run format:check` — no formatting differences.
- `npm run test` — Vitest unit + API + integration tests pass. DB integration tests use `DATABASE_URL_TEST`.
- `npm run build` — Vite production build written to `client/dist/`.

## Migration verification (disposable environment only)

    npm run db:migrate
    npm run db:migrate:undo
    npm run db:migrate

The last migration must undo and reapply without data corruption. **Never** run `db:migrate:undo:all` against the shared Supabase dev or test database.

## CI

GitHub Actions (`.github/workflows/validate.yml`) runs on push/PR to `main` or `develop`:
checkout → install (`npm ci`) → lint → format check → client build → tests. The test step uses the test database via two repository secrets — add them under Settings → Secrets and variables → Actions:

- `SUPABASE_TEST_DB_URL` — the **test** Supabase project's **Session pooler** connection string (`...pooler.supabase.com:5432`, username `postgres.<ref>`). Use the pooler, not the direct `db.<ref>.supabase.co` URL: GitHub Actions runners have no IPv6 route and the direct host resolves to IPv6 (`ENETUNREACH`). Locally you may use either.
- `JWT_SECRET` — the same JWT secret used locally (any 32+ char random string).

Without these secrets the DB-dependent server tests are skipped/fail in CI; lint, format, and build still run.

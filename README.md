# SponsorSync

SponsorSync helps university PR teams manage sponsorship acquisition — events, company directories, sponsorship cases, follow-ups, and reporting — replacing ad-hoc spreadsheets and WhatsApp workflows.

This repository is a graduation project. Implementation proceeds through four sequential plans in `plans/`.

## Stack

- Frontend: React + Vite (JavaScript) — `client/`
- Backend: Node.js + Express (ESM JavaScript) — `server/`
- Database: PostgreSQL on Supabase, accessed via Sequelize v6
- Auth: backend-managed JWT in an HTTP-only cookie

> ### ⚠️ This repository must stay private
>
> `server/.env` and `client/.env` are **committed on purpose**, so a teammate can clone and run
> with no setup. That means real Supabase passwords and the JWT secret are in git history.
>
> **Deleting the files later does not undo this** — history keeps them. Before making the
> repository public or open-sourcing it: rotate the Supabase database passwords and
> `JWT_SECRET`, re-ignore both files in `.gitignore`, and only then change visibility.
>
> Changed a value in `.env`? Commit it. One shared dev database and one shared seed admin mean
> a change left on your laptop breaks everyone else, not just you.

## Quick start

### Windows: double-click `run.bat`

It checks for Node 24, offers to install it via winget if missing, installs dependencies the
first time, and opens the client and server in two windows. Nothing is installed without asking
first. Then open `http://localhost:5174`.

### Any platform, or if you prefer the terminal

**Requires Node 24** (see `.nvmrc` — `nvm use` picks it up). `npm ci` refuses to install on an
older version rather than warning and failing later.

    git clone https://github.com/xyzbk/sponsorsync.git
    cd sponsorsync
    npm ci        # from the repo root — installs BOTH workspaces
    npm run dev   # from the repo root — starts client AND server together

Then open `http://localhost:5174` and sign in as the seeded admin.

`npm run dev` runs both in **one** window with colour-coded output; `run.bat` uses two separate
windows so you can restart one side without the other. Same thing either way.

That is the whole setup. There is no environment step (`server/.env` and `client/.env` are in
the repo — see the warning above), and **no migrate or seed step**: the shared dev database
already has every migration and the admin account.

Both `npm ci` and `npm run dev` run **once, at the repo root**. This is an npm workspace, so
running them separately inside `client/` and `server/` is two terminals for no benefit.

`npm run db:migrate` and `npm run db:seed` exist for creating a **fresh** database, or after
you add a migration of your own. Joining the team needs neither. Note that re-running the seed
resets the admin password back to the `SEED_ADMIN_PASSWORD` in `server/.env`.

`.env.example` in each workspace stays as documentation of what every variable means.

Full clean-clone procedure, including creating your own database from scratch:
`docs/local-setup.md`.

## Agent & developer docs

- Agent rules: `AGENTS.md`
- **Picking up a plan? Start here: `docs/starting-a-plan.md`** (includes an AI kickoff prompt)
- **What the finished system does, end to end: `docs/system-overview.md`**
- **Who owns which plan (read first if you are picking up work): `docs/team-model.md`**
- Architecture: `docs/architecture.md`
- API conventions: `docs/api-conventions.md`
- Database & migrations: `docs/database-workflow.md`
- Roles & access: `docs/roles-and-access.md`
- UI conventions (Arabic/RTL — read before touching `client/`): `docs/ui-conventions.md`
- Local setup: `docs/local-setup.md`
- Status: `docs/implementation-status.md`
- Plans: `plans/` (completed side-plans are archived in `plans/done/`)

## Current plan

**Plan 1 — Foundation, Auth, and Agent Workflow** (`plans/01-foundation-auth-and-agent-workflow.md`).

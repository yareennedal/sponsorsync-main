# Plan 1 Handoff

> This file used to carry a snapshot of commit hashes, test counts, CI status and open issues.
> Every one of those went stale within days — it still told readers CI was red and listed three
> bugs that had already been fixed, while calling itself the source of truth. Live state now
> lives in exactly one place per topic, listed below. Nothing here is a number that can rot.

## Start here

1. **`docs/local-setup.md`** — clone to running app. Includes the Supabase IPv6/pooler gotcha.
2. **`AGENTS.md`** — the 13 hard rules. `CLAUDE.md` and `.github/copilot-instructions.md`
   mirror them.
3. **`docs/architecture.md`** — request path, layers, auth model.
4. **`docs/api-conventions.md`** — response envelope, status codes, and the error-code
   catalogue. Read this before adding an endpoint.
5. **`docs/ui-conventions.md`** — Arabic/RTL rules. **Read this before touching `client/`.**
   It is short, and every rule in it corresponds to a bug this repo already shipped.
6. **`docs/roles-and-access.md`** — who can call what, and what is deliberately not built.
7. **`docs/database-workflow.md`** — migrations, seeding, the two Supabase projects.

## Where live state actually lives

| Question                    | Answer                                                   |
| --------------------------- | -------------------------------------------------------- |
| What is implemented?        | `docs/implementation-status.md`                          |
| Is CI green?                | The Actions tab. Do not trust a checkbox in a document.  |
| How many tests?             | `npm run test`                                           |
| What is the current commit? | `git log`                                                |
| What is left to do?         | The `## Progress` section of the active plan in `plans/` |

## Before you start Plan 2

- **Plan structure — resolved.** One plan, one owner, one at a time: Plan 2 → Person 2,
  Plan 3 → Person 3, Plan 4 → Person 4, each starting when the previous plan passes acceptance.
  **Read `docs/team-model.md` before picking up a plan** — owner table, migration ranges, branch
  names, and the handoff checklist. (The plans previously split each phase across four concurrent
  people; their ownership sections are rewritten.)
- **Merge-conflict hotspots.** `NAV_GROUPS`/`BREADCRUMBS` in `AppShell.jsx`, the route list in
  `App.jsx`, `models/index.js`, `api/index.js`, the router mounts in `app.js`, and the migration
  number sequence are all edited by every feature module. Agree an append-only convention and a
  migration-number claim range before three branches open, or week two goes to conflicts.

## Known limitations

- **No mail sender, and nothing needs one.** Both OTP flows (forgotten password, email change)
  were removed rather than propped up: an admin resets passwords and changes addresses through
  `/api/users`. See `docs/roles-and-access.md`. Adding mail later is a new dependency and an
  approval gate under `AGENTS.md` rule 12.
- **No audit-log read endpoint or UI.** Rows are written; reading them means querying the
  database directly.
- **Shared test database.** `npm test` truncates it. CI serializes its own runs, but a local run
  during a CI run will still collide. Give each developer their own `DATABASE_URL_TEST` when you
  can.

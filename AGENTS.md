# SponsorSync — Agent Instructions

This file is the canonical rule set for all coding agents working in this repository (Codex, Copilot, Claude Code, Cursor, and others). `CLAUDE.md` and `.github/copilot-instructions.md` mirror these rules for tools that read those filenames.

## Current state

- **Picking up a plan? Read `docs/starting-a-plan.md` first.**
- `CLAUDE.md`, `GEMINI.md` and `.github/copilot-instructions.md` are **generated** from this file. Edit this file, then run `npm run sync:agents`. CI fails if they drift.
- Plans 1, 1a and 1b are complete. **Next: Plan 2** (`plans/02-events-companies-and-team-management.md`), owned by Person 2.
- **One plan, one owner, one at a time** — Plan 2 → Person 2, Plan 3 → Person 3, Plan 4 → Person 4, each starting when the previous plan is accepted. See `docs/team-model.md`.
- Stack: React + Vite (JavaScript) frontend in `client/`; Node + Express (ESM JavaScript) backend in `server/`; PostgreSQL on Supabase via Sequelize v6.
- Branching: solo Plan 1 work commits to `main`. The `develop` branch exists for future team PRs.

## Hard rules

1. Read the active implementation plan completely before editing — **and these four, which are short and each documents a bug that already shipped here**: `docs/api-conventions.md` (endpoints, error codes, envelope), `docs/ui-conventions.md` (Arabic/RTL, MUI Grid2), `docs/database-workflow.md` (migrations), `docs/roles-and-access.md` (authorization). `docs/architecture.md` describes the layer layout. If you are picking up a plan for the first time, `docs/starting-a-plan.md` is the how-to.
2. Use JavaScript only. Do not add TypeScript files, TypeScript build config, or generated code that needs TS compilation.
3. Keep React in `client/` and Node/Express in `server/`. Do not cross-import.
4. React calls the backend API over HTTP. React must never query Supabase PostgreSQL directly.
5. Schema changes go through Sequelize migrations (ESM, run via umzug). Never use `sync()` / `sync({ alter: true })` or manual dashboard edits.
6. Never edit an already-merged migration. Create a new migration.
7. Keep changes within the active milestone. Record out-of-scope discoveries in the plan's _Surprises and Discoveries_ instead of implementing them.
8. Run the validation commands after every milestone: `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`.
9. Stop and fix failed validation before starting the next milestone.
10. Update `docs/implementation-status.md` and the active plan's living sections (Progress, Surprises, Decision Log, Outcomes) before handing off.
11. Never commit generated uploads or real sponsor data. **Exception, decided 2026-07-25 by the project owner:** `server/.env` and `client/.env` **are** committed, so a teammate can clone and run with no setup. This is a private repo and the decision was made with eyes open — do not "fix" it by deleting or re-ignoring them. Two consequences: the repository **cannot be made public** without first rotating the Supabase passwords and `JWT_SECRET` (history keeps them), and a changed value must be **committed**, since everyone shares one dev database. When Plan 3 adds `SUPABASE_SERVICE_ROLE_KEY`, it lands in the same committed file — that key bypasses every storage and row-level-security rule in the project, so re-read this rule before adding it.
12. Ask before introducing a new production dependency unless the active plan explicitly names it.
13. Return a completion report: changed files, migrations, tests, commands + results, remaining issues, manual verification steps.

## Traps that fail silently

The full list is in the convention docs. These three are inline because they produce a **clean
lint, a clean build, and a passing test run** while being wrong, so nothing catches them for you.

- **`import Grid from '@mui/material/Grid2'`.** MUI v6's default `Grid` export is the legacy API
  (`item` + `xs`/`sm`) and **silently ignores** `size={{ xs: 12 }}`. No error, no warning — every
  column just loses its width and the layout collapses. This has shipped once already.
- **Never write physical CSS in `sx`.** `stylis-plugin-rtl` rewrites it, so `ml` becomes
  margin-right, `left` becomes right, and `textAlign: 'right'` renders left. Use
  `marginInlineStart`, `insetInlineEnd`, `textAlign: 'start'`. Two shipped bugs.
- **Numeric `borderRadius` in `sx` is a multiplier** of `theme.shape.borderRadius` (10), so
  `borderRadius: 2` means 20px. Prefer inheriting the theme and setting nothing.

## Shared-file conventions (parallel work)

These files are edited by every feature module. Without a convention they conflict on every PR.

- **Append only, one block per module, in plan order.** Never reorder or reformat someone else's
  block: `NAV_GROUPS` / `BREADCRUMBS` in `client/src/layouts/AppShell.jsx`, the route list in
  `client/src/App.jsx`, the association block in `server/src/models/index.js`, the API objects in
  `client/src/api/index.js`, and the router mounts in `server/src/app.js`.
- **Migration numbers are claimed in advance**, so two branches never both write `0008-`:
  Plan 2 owns `0008`–`0019`, Plan 3 owns `0020`–`0039`, Plan 4 owns `0040`+. (`0000`–`0007` are
  Plan 1; `0006` and `0007` drop the two removed OTP tables.) Ordering is lexical by filename,
  so a collision is resolved by spelling, not by
  dependency — which is how a fresh clone ends up with a different schema from the shared dev
  database.
- **`client/src/main.jsx` (theme) has one owner.** A new palette entry can silently restyle
  unrelated components — `action.selected` is MUI's default Chip fill, which is how an accent
  tint once turned every neutral chip pink. Route changes through whoever owns it.
- **Before touching `client/`, read `docs/ui-conventions.md`.** Physical CSS in `sx` is flipped
  by `stylis-plugin-rtl`; that has already shipped two bugs.
- **Before adding an endpoint, read `docs/api-conventions.md`.** Reuse an existing error code or
  add yours to the catalogue in the same PR.

## Testing conventions

- Server tests live in `server/tests/*.test.js`; client tests are colocated as
  `client/src/**/*.test.jsx`. Two conventions, deliberately — do not migrate one to the other.
- `resetDb()` in `server/tests/helpers.js` **truncates the shared test database**. Add every new
  table to its TRUNCATE list. Do not run `npm test` while CI is running if you can avoid it.
- Client test files must register `afterEach(cleanup)` themselves. Vitest runs without
  `globals: true`, so React Testing Library cannot register its own, and a second test in a file
  without it fails with "found multiple elements".
- Assert on `error.code`, never on `error.message` — messages are Arabic user-facing copy and
  will change.
- A test that cannot fail is worse than no test. If you add a regression test, break the fix once
  and confirm the test goes red.

## Definition of done (per milestone)

The milestone's acceptance behaviors pass, validation commands are green, and `docs/implementation-status.md` is updated. "It compiles" is not done.

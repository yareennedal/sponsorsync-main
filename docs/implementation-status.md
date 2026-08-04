# SponsorSync Implementation Status

| Plan                                                | File                                               | Owner        | Migrations    | Status                                    |
| --------------------------------------------------- | -------------------------------------------------- | ------------ | ------------- | ----------------------------------------- |
| 1 — Foundation, Auth, and Agent Workflow            | `plans/01-foundation-auth-and-agent-workflow.md`   | Person 1     | `0000`–`0007` | **Complete**                              |
| 1a — UI polish, RTL hardening, self-service profile | `plans/01a-ui-polish-and-rtl-hardening.md`         | Person 1     | —             | **Complete**                              |
| 1b — Pre-handoff hardening                          | `plans/01b-pre-handoff-hardening.md`               | Person 1     | —             | **Complete**                              |
| 2 — Events, Companies, Teams                        | `plans/02-events-companies-and-team-management.md` | **Person 2** | `0008`–`0019` | **Complete locally; accepted for Plan 3** |
| 3 — Sponsorship Workflow                            | `plans/03-sponsorship-workflow-...md`              | **Person 3** | `0020`–`0039` | Ready after Plan 2 handoff                |
| 4 — Analytics, Reports, Delivery                    | `plans/04-analytics-reports-...md`                 | **Person 4** | `0040`+       | Blocked on Plan 3                         |

Completed side-plans are archived in `plans/done/` with a status banner. They are history, not
briefs — `plans/done/01d-vercel-shell-and-dashboard.md` in particular specifies a **dark** theme
that was never shipped.

> **One plan, one owner, one at a time.** Plan 2 → Person 2, Plan 3 → Person 3, Plan 4 → Person 4,
> each starting when the previous plan passes acceptance and its migrations are on the shared dev
> database. Read **`docs/team-model.md`** before picking up a plan — it has the owner table,
> migration ranges, branch names, and the handoff checklist. (Decision D2, resolved 2026-07-25:
> the plans previously split each phase across four concurrent people, which contradicted both the
> sequential rule in `.agent/PLANS.md` and the dependency order. Their ownership sections are
> rewritten; the four lanes are now the four _areas_ each single owner covers.)

## Plan 1 milestone progress

- [x] M1 Repository contract & agent instructions
- [x] M2 npm workspaces + client/server scaffold
- [x] M3 Sequelize + migrations + seed
- [x] M4 Backend auth & authorization
- [x] M5 Admin user management
- [x] M6 Protected frontend auth
- [x] M7 CI + clean-clone docs

## Plan 1 — complete & enhanced

All seven milestones implemented. Validation (lint, format:check, test, build) green. Migrations applied to the dev Supabase database; reversibility verified on the test database. Auth frontend redesigned with White/Zinc aesthetic, IBM Plex Sans Arabic typography, Apple spring physics motion, precise RTL input field alignment, OWASP account enumeration defense, and Remember Me 30-day persistent cookie control.

> The self-service Forgot Password OTP flow described in earlier versions of this document was **removed** after Plan 1b. Migrations `0003` (create) and `0006` (drop) are both in history. Account recovery is admin-mediated: `POST /api/users/:id/reset-password`. Rationale in `docs/roles-and-access.md`.

## Plan 1a — UI polish, RTL hardening, and self-service profile

See `plans/01a-ui-polish-and-rtl-hardening.md`. Eight milestones, all complete. A design audit of the Plan 1 surfaces scored **8/20** and surfaced two defects that were not cosmetic at all:

- **`GET /api/users` had never returned 200 from the React client.** The client sends `role=&status=` on every request and the Zod schema rejected empty strings on optional enums, so the users page always rendered its Arabic error toast — which read as intentional UI. Client and server also disagreed on the disabled-status vocabulary (`disabled` vs `inactive`).
- **RTL was never actually configured.** `direction: 'rtl'` was set on the theme but Emotion had no `stylis-plugin-rtl`, so MUI's own CSS was never flipped. Roughly 60 lines of hand-written `!important` overrides existed to compensate.

Delivered: the API contract repaired; `stylis-plugin-rtl` + a real design-token layer; keyboard-accessible navigation and a real `<Drawer>` (the sidebar nav was `<div onClick>`, unreachable by keyboard); a single accent (deep oxblood `#9f1e42`) replacing the unmodified shadcn-zinc default; WCAG AA contrast on every previously-failing pair; Arabic typography fixes (negative letter-spacing removed, fake bold capped at the loaded weight); debounced search, skeletons, real empty states and success feedback on the users page; **self-service profile editing** (shipped with OTP-verified email change, migration `0004` — that half was later removed by `0007`; the name edit remains); app-wide `prefers-reduced-motion` support; and route-level code splitting.

**Result:** every hex literal in the client is gone except the token definitions in `main.jsx`; first-paint JS dropped **27%** (229.89 → 171.54 kB gzip, measured over the wire at 167.5 kB); tests went 38 → **62** across nine milestones (a ninth, "first login always fails", traced a startup race and split transport failures from credential failures across 13 call sites); and `npm run format:check` passes on a Windows checkout for the first time (`endOfLine: "auto"` — it had been failing on 69 files repo-wide).

## Plan 1b — pre-handoff hardening

See `plans/01b-pre-handoff-hardening.md`. Seven milestones, all complete. An eight-slice
parallel audit (backend auth, frontend auth, users/RBAC, profile, data layer, plan coverage,
security, tests/CI) found the schema clean — **zero model/migration drift, no secret ever
committed** — and the risk concentrated in fail-open defaults and in documentation that
described a system slightly different from the one that shipped.

Closed: `NODE_ENV` no longer gates security by its own absence (the password-reset OTP was
returned in the response body of an unauthenticated route on any non-production value);
`mustChangePassword` is enforced by middleware rather than by a single client-side `navigate()`;
"remember me for 30 days" signs a 30-day token instead of wrapping an 8-hour one; a failed login
no longer logs out a valid session in another tab; every mutation commits with its audit row in
one transaction; email uniqueness is enforced by the database on `lower(email)` rather than by
one helper function; and CI serializes runs against the shared test database, which it did not
before the repository was handed to a team.

Tests went 62 → **85**. Regression coverage now includes non-admin rejection on all four
`/api/users` write routes, the change-password success path, `PATCH /api/users/:id`, and
mass-assignment stripping — none of which had any test.

**There is no mail sender, and no longer anything that needs one.** Both OTP flows were later
removed outright (migrations `0006` and `0007`) rather than left waiting on delivery: password
resets and email changes are admin actions through `/api/users`. `EXPOSE_DEBUG_OTP` is gone with
them. Rationale in `docs/roles-and-access.md`.

Two RTL traps are documented in that plan and matter for Plan 2+: **never write physical CSS (`left`/`right`/`marginLeft`/`borderLeft`/`textAlign: 'right'`) in `sx`** — `stylis-plugin-rtl` flips it, which put the sidebar on the wrong side; and **numeric `borderRadius` in `sx` is a multiple of `theme.shape.borderRadius`**, so raising the theme value silently rescales every override. Both now have regression guards or documented rules.

## Key decisions recorded

See `plans/01-foundation-auth-and-agent-workflow.md` → **Decision Log**. Highlights locked before execution:

- Sequelize v6 + JavaScript migrations (not Prisma/TypeScript).
- Backend-managed JWT in an HTTP-only cookie.
- **Token-version column** on `users` for session invalidation (password change, email change, role change, deactivation).
- Two Supabase projects: `dev` (development) + `test` (CI / integration tests).
- npm workspaces + `concurrently`. No Turborepo/NX.
- Two env files: `server/.env` (secrets) + `client/.env` (`VITE_*` only). Physical public/private boundary.
- ESM throughout; migrations run via **umzug** (Sequelize's official ESM runner), not `sequelize-cli`.
- Solo Plan 1 commits to `main`; `develop` + PR template created as team artifacts.

Living sections live in each plan file under `## Progress`, `## Surprises and Discoveries`, `## Decision Log`, and `## Outcomes and Retrospective`. Keep them current during implementation; do not backfill at the end.

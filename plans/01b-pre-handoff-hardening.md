# Plan 1b — Pre-Handoff Hardening

**Status:** Complete
**Owner:** Person 1 (member 1)
**Depends on:** Plan 1 (`01-foundation-auth-and-agent-workflow.md`), Plan 1a (`01a-ui-polish-and-rtl-hardening.md`)
**Baseline commit:** `e504b3a`

> **Later change (2026-07-25):** the self-service forgotten-password flow was **removed from the
> product** after this plan completed. Sections below that describe `forgotPassword`,
> `verifyOtp`, `resetPasswordWithOtp`, `ForgotPasswordPage`, or `POST /api/auth/forgot-password`
> are an accurate record of the code at `e504b3a`, not of the code today. See **D1** in the
> Decision Log, and `docs/roles-and-access.md` for how account recovery works now.

## Why this plan exists

Plan 1 and Plan 1a are complete. An eight-slice parallel audit (backend auth, frontend auth,
users/RBAC, profile self-service, data layer, plan coverage, security, tests/CI) found that the
**code is in better shape than the documents describing it**, and that a small number of
fail-open defaults would become severe the moment the project is deployed or handed to three
more people.

This plan closes those gaps. It is scoped to _handoff readiness only_ — no new features, no
Plan 2-4 scope. Every finding below was verified against the source at `e504b3a` before being
written down; findings that could not be proven were dropped rather than carried forward.

## Non-goals

- Any Plan 2-4 feature work (events, companies, sponsorships, analytics).
- Refactoring that is not required by a finding.
- Re-litigating settled Plan 1a decisions (English role labels, light Zinc theme, oxblood accent).

---

## Milestone 0 — Decisions required before execution

These are not implementation tasks. Nothing in M1-M7 is blocked by them except where stated,
but they must be answered before the repo is handed over.

### D1 — OTP delivery (blocks M1 partially, blocks handoff fully)

**Finding.** There is no mailer in the project. No `nodemailer`, `resend`, `@sendgrid/mail`, or
SMTP client appears in `server/package.json`, and nothing in `server/src` sends mail. Both OTP
flows (`forgotPassword`, `requestEmailChange`) "deliver" the code by `console.log` plus a
`debugOtp` field in the JSON response, gated on `env.nodeEnv !== 'production'`
(`server/src/services/authService.js:142` and `:343`).

Both branches are broken:

| `NODE_ENV`                                                        | Behaviour                                                                                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| unset / `development` (the default, `server/src/config/env.js:9`) | The reset OTP is returned to any unauthenticated caller. Three requests take over any account.                          |
| `production`                                                      | Nothing is logged, nothing is returned, no mail is sent. The UI says «تم إرسال رمز التحقق» and the code does not exist. |

**Decision needed.** One of:

- **(a) Ship a real sender.** Requires a new production dependency, which `AGENTS.md` rule 12
  says must be approved first. `nodemailer` + a free SMTP account is the smallest option.
- **(b) Declare OTP delivery out of scope for Plan 1** and document it: keep the console log as
  the only dev channel, remove `debugOtp` from responses entirely, and record in
  `docs/implementation-status.md` that password reset is not usable without a mailer.
- **(c) Defer to Plan 4** (which owns "quality and delivery") and mark it in that plan's
  prerequisites.

M1 implements the _security_ half either way (`debugOtp` becomes opt-in). This decision only
governs whether a sender is added.

### D2 — Parallelization model (blocks handoff, not code)

**Finding, verified.** `plans/02-events-companies-and-team-management.md`,
`plans/03-...md`, and `plans/04-...md` each contain **four `### Person 1-4` sections**, and
`.agent/PLANS.md:28` states: _"Plans execute sequentially. Do not begin plan N+1 until plan N
passes acceptance and its migrations are applied to the shared Supabase dev database."_

So "each teammate takes a phase" is not what the plans describe. They are whole-team phases run
one at a time. Handing someone Plan 3 gives them a document whose first milestone builds on
`events` and `companies` tables that do not exist.

**Decision needed.** One of:

- **(a) Follow the plans as written** — all four people work Plan 2 together in the Person 1-4
  lanes, then Plan 3, then Plan 4. Update `docs/implementation-status.md` to say so explicitly.
- **(b) Re-cut the plans by domain** so three streams can run in parallel: one person writes all
  Plan 2-3 migrations up front, then events / companies / sponsorship proceed independently.
  This is a planning session, not a doc edit, and `.agent/PLANS.md:28` needs a Decision Log entry.

### D3 — The `controllers/` layer

**Finding, verified.** `docs/architecture.md:19-21`, `docs/api-conventions.md:42-44`, and
`plans/01-...md:120` all describe a `controllers/` layer. `ls server/src/` returns
`app.js config db middleware models routes scripts server.js services utils validators` — there
is no `controllers/`. Handler bodies are inline `asyncHandler` closures in the route files.

**Decision needed.** Recommended: **delete the layer from the docs** and state that route
handlers are thin inline closures with all logic in `services/`. That matches the shipped code
and is the smaller change. The alternative — introducing `controllers/` — is a refactor of every
route for no functional gain. Whichever is chosen, `plans/02-...md:17` must be amended, because
it instructs the Plan 2 agent to "preserve the existing controller pattern."

### D4 — Should a role change bump `tokenVersion`?

**Finding, verified.** `docs/implementation-status.md:43` and `docs/handoff-plan1.md:75` state
that `tokenVersion` is bumped on "password change + deactivation + role change".
`server/src/services/userService.js:117-120` sets `user.role` and saves with no increment.
`docs/architecture.md:31` describes it correctly (password change and deactivation only).

In practice this is harmless — `authenticate` reloads the user from the DB on every request, so
a role change takes effect immediately regardless. But it is written down as a security
guarantee, and a Plan 3 teammate implementing assignment logic may rely on it.

**Decision needed.** Either add the bump (forces re-login on role change — arguably correct, and
it is one line) or correct the two docs. M7 implements whichever is chosen.

---

## Milestone 1 — Fail closed on environment

**Goal.** No security control may depend on the _absence_ of an environment variable.

### Changes

1. **`server/src/config/env.js`** — validate `NODE_ENV` against an allow-list and throw on an
   unrecognised value. Add an explicit `exposeDebugOtp` flag derived from
   `NODE_ENV === 'test' || process.env.EXPOSE_DEBUG_OTP === 'true'`. Do **not** flip the
   `nodeEnv` default to `production` — that would silently change `morgan` format, the rate-limit
   ceiling, and cookie `secure` for every developer. Gate the individual controls instead.
2. **`server/src/config/env.js`** — throw at import time if `JWT_SECRET` is unset or shorter than
   32 characters. Currently `jwtSecret` is read with no validation
   (`env.js:14`), so a missing secret produces a generic 500 at login rather than a boot failure.
   Verified: `.env.example` ships `JWT_SECRET=` empty.
3. **`server/src/services/authService.js:142` and `:343`** — gate `debugOtp` on
   `env.exposeDebugOtp`, not on `!== 'production'`.
4. **`client/src/pages/ForgotPasswordPage.jsx`** — gate the on-screen OTP hint on
   `import.meta.env.DEV` as well, so a misconfigured server alone cannot leak it to the browser.
5. **`server/package.json`** — add `"zod": "^3.24.1"` to dependencies. Verified: the server
   imports `zod` in two validator files but declares it nowhere; it resolves today only through
   workspace hoisting of the client's copy. Any `COPY server/` or `npm ci --workspace server`
   fails at boot.
6. **`server/src/app.js`** — `app.set('trust proxy', 1)` before the rate limiters. Verified
   absent. Without it, `req.ip` behind any reverse proxy is the proxy's address, so every user
   shares one rate-limit bucket and ten failed logins lock out everyone.

### Acceptance

- Booting with `JWT_SECRET` unset fails immediately with a message naming the variable.
- Booting with `NODE_ENV=prod` (a typo) fails immediately rather than silently behaving as dev.
- `POST /api/auth/forgot-password` returns no `debugOtp` unless `EXPOSE_DEBUG_OTP=true`; the
  existing OTP tests set it and still pass.
- `npm ci --workspace server && node server/src/server.js` boots (given a valid `.env`).

---

## Milestone 2 — Enforce `mustChangePassword` server-side

**Goal.** A user holding an admin-issued temporary password cannot use the application.

**Finding, verified.** `grep -rn "mustChangePassword" server/src` returns only the model, the
two services that set/clear it, and `safeUser`. **No middleware or route reads it.** The sole
enforcement in the entire system is `client/src/pages/LoginPage.jsx:42`, a post-login
`navigate()`. Typing `/app`, pressing F5, or calling the API with curl bypasses it completely.
The seeded admin ships with this flag set (`server/seeders/seed-admin.js:29`), so it applies to
the very first account. Four independent auditors reached this finding.

### Changes

1. **`server/src/middleware/authenticate.js`** — after the `tokenVersion` check, reject with a
   new `AUTH_PASSWORD_CHANGE_REQUIRED` (403) when `user.mustChangePassword` is set, unless the
   request targets `POST /auth/change-password`, `POST /auth/logout`, or `GET /auth/me`.
   `/auth/me` must stay allowed so the client can read the flag and redirect.
2. **`client/src/routes/guards.jsx`** — in `RequireAuth`, redirect to `/change-password` when the
   flag is set and the current path is not already that page. This is UX; the server is the control.
3. **`client/src/pages/ChangePasswordPage.jsx`** — call `logout()` before navigating to `/login`.
   Currently it navigates with stale auth state in context and `ss_has_session` still `'true'`,
   so the browser Back button renders the authenticated shell.

### Acceptance

- A user with `mustChangePassword: true` gets 403 `AUTH_PASSWORD_CHANGE_REQUIRED` from
  `GET /api/users` and every other protected route, via curl with a valid cookie.
- The same user can still reach `GET /auth/me` and `POST /auth/change-password`.
- After a successful change, the same routes return 200.
- New test covering all three states.

---

## Milestone 3 — Session and auth correctness

**Goal.** Features behave as advertised; failures are reported honestly.

### Changes

1. **Remember-me lifetime.** Verified: `signToken(user)` takes one argument and always signs
   `expiresIn: env.jwtExpiresIn` (`'8h'`), while `sessionCookieOptions(rememberMe)` sets a
   30-day `maxAge`. The browser holds a dead cookie for 29 days. Thread `rememberMe` into
   `signToken` and sign 30 days when set. Also note `authValidators.js:6` defaults `rememberMe`
   to `true`, contradicting `plans/01-...md:323` — decide and align.
2. **Failed login must not destroy a live session.** Verified: `client/src/api/index.js:4` calls
   `api.post('/api/auth/login', credentials)` with no `_skipRedirect`, unlike `me` and `logout`.
   A 401 from a wrong password therefore runs the interceptor's session-expiry branch, which
   fires `POST /auth/logout` against the still-valid cookie. Add `{ _skipRedirect: true }`.
3. **Disabled account should end the session in the UI.** `authenticate` throws 403
   `AUTH_ACCOUNT_DISABLED` for a deactivated user, but `client/src/api/interceptor.js:11` only
   handles 401, so the UI stays in a half-dead authenticated state. Change the middleware to
   401 (403 means _authenticated but not permitted_, which is `authorizeRoles`' job) — the
   client then works with no change.
4. **Split the OTP limiter.** Verified: one `rateLimit()` instance is mounted on five routes
   (`authRoutes.js:69,79,93,133,151`), and `express-rate-limit` keys on IP only, so all five
   share one 5-per-15-minute budget. Request a code, mistype it twice, and account recovery is
   locked for 15 minutes — including the unrelated email-change flow. Use a request limiter
   (5/15min) and a verify limiter (15/15min); the per-record 5-attempt cap already handles
   brute force.
5. **Rate-limit `POST /auth/change-password`.** Verified: it carries neither limiter, so a
   stolen session can test ~300 current-password guesses per window against `bcrypt.compare`.
6. **Arabic validation messages.** Verified: `authValidators.js:21` and `:32` use bare
   `z.string().min(10)`, so Zod's English default (`String must contain at least 10 character(s)`)
   is returned in `details[0].message` — and both password pages render `details[0]` _in
   preference to_ the Arabic top-level message. Add Arabic messages to every `min`/`max` in
   `authValidators.js` and `userValidators.js`.
7. **`errorHandler` must not echo driver codes.** `errorHandler.js:18` reads `err?.code`
   unconditionally, so a 500 returns `23505` or `ECONNREFUSED` to the client. Scope it:
   `const code = isAppError ? err.code || 'INTERNAL_ERROR' : 'INTERNAL_ERROR'`.
8. **Map `SequelizeUniqueConstraintError` to 409.** Fixes the concurrent-duplicate-email 500 at
   all four call sites at once, and every table Plans 2-4 add.

### Acceptance

- `rememberMe: true` issues a token whose `exp` is ~30 days out; `false` issues 8 hours. Both tested.
- A wrong password on the login form leaves an existing session in another tab alive.
- Requesting a code then mistyping it twice still allows a resend.
- No English string appears in any 400 response body.
- A 500 never returns a Postgres error code.

---

## Milestone 4 — Regression safety net

**Goal.** CI must be trustworthy before three more people push to it.

**Finding, verified.** `.github/workflows/validate.yml` has no `concurrency:` key and triggers
only on `[main, develop]` for both `push` and `pull_request`. Every run calls `resetDb()`, which
`TRUNCATE`s the shared Supabase test database. Recent runs were ~2 minutes apart with one
developer; with four they will overlap and truncate each other mid-suite. The resulting red
builds are unreproducible and unrelated to the commits that triggered them, which teaches the
team to ignore CI.

### Changes

1. **`concurrency: { group: test-db, cancel-in-progress: false }`** in `validate.yml`.
2. **Run on all branches** — `push: branches: ['**']`, and drop the `branches` filter from
   `pull_request` so a PR into any integration branch is validated.
3. **Fail fast on missing secrets** — a step asserting `DATABASE_URL_TEST` and `JWT_SECRET` are
   present, so a fork or a rotated secret produces one clear error instead of a wall of 500s.
4. **Add `npm audit --omit=dev --audit-level=high`** as a non-blocking step.
5. **Tests — the gaps that matter.** Verified: `server/tests/users.test.js` has exactly one
   authorization test and it targets `GET /`. The four write routes have none.
   - Non-admin (403) against `POST /`, `PATCH /:id`, `PATCH /:id/status`, `POST /:id/reset-password`.
   - `POST /auth/change-password` **success path** — currently both tests in that block assert 400. Assert 200, old cookie now 401, new password logs in, old password does not.
   - `PATCH /api/users/:id` — 404 on unknown id, 409 on email collision, 409 on last-admin demotion.
   - Mass assignment on the admin create route (send `isActive`, `tokenVersion`, `passwordHash`).
   - Split the conflated last-admin test (`users.test.js:89`), which accepts either
     `USER_SELF_DEACTIVATE` or `USER_LAST_ADMIN` and therefore verifies neither.
   - `afterEach(cleanup)` in `client/src/App.test.jsx` — the only client test file missing it.
6. **Root scripts** — add `test:client` and `test:server` so a client-only change is not blocked
   by a DB flake, and extend `format:check` to `prettier --check .` (Markdown and YAML are
   currently unchecked, which will cause noisy plan-file diffs).

### Acceptance

- Two pushes in quick succession queue rather than run concurrently.
- Removing `...admin` from any `/api/users` write route turns CI red.
- Breaking the password re-hash in `changePassword` turns CI red.
- Test count rises from 62 to roughly 75+; all green.

---

## Milestone 5 — Data-layer patterns teammates will copy

**Goal.** The persistence patterns three people will replicate twenty times should be the
correct ones. The **schema itself needs no changes** — the audit found zero model/migration
drift across all 4 models and 30 attributes.

### Changes

1. **Transactions.** Verified: `grep -rn "transaction" server/src` returns nothing.
   `plans/03-...md:440` explicitly requires them for sponsorship money fields. Wrap each mutation
   and its audit row in `sequelize.transaction()` in `userService.js` (4 sites) and the two
   OTP-consuming flows in `authService.js`. Document the pattern in `docs/database-workflow.md`
   before Plan 2 opens — that is the reference teammates will copy.
2. **`resetPasswordWithOtp` write order.** Currently the password is updated _then_ the OTP is
   marked used (`authService.js:242-248`). If the connection drops between them, a live reset
   token survives. Consume the OTP first; `confirmEmailChange` already does it in that order.
3. **Consume the OTP on verify.** `verifyOtp` writes `resetTokenHash` but leaves `used: false`,
   so one code mints unlimited reset tokens for 10 minutes.
4. **`createAuditLog` must not fabricate a null actor.** It catches
   `SequelizeForeignKeyConstraintError` and retries with `actorUserId: null`, producing a
   permanently unattributable audit row — in a system whose premise includes an append-only
   audit log.
5. **Case-insensitive email uniqueness.** New migration: replace `users_email_unique` with a
   functional unique index on `lower(email)`. The lowercase invariant currently lives only in
   `normalizeEmail()`, and `server/tests/helpers.js` `createUser()` does not call it — which is
   the pattern a teammate will copy into their own fixtures.
6. **Seed admin update is a silent no-op.** Verified by reading
   `server/seeders/seed-admin.js:35-40`: it passes `full_name`, `password_hash`, `is_active` to
   `.update()`, which matches on _attribute_ names (`fullName`, `passwordHash`, `isActive`), so
   Sequelize drops all three. Only `role` is written, and line 43 prints "Seed admin updated"
   regardless. Rotating the seed password appears to work and does not.
7. **`0000-enable-pgcrypto` down-migration** drops a Supabase-managed extension shared by the
   whole team. Make `down` a no-op with a comment. Editing a `down` body does not violate the
   never-edit-a-merged-migration rule — no applied schema state changes.
8. **Index shapes.** `users` is indexed on `role` and `is_active` alone; the list endpoint sorts
   on `created_at` (unindexed). Both OTP tables index `(used, expires_at)` while every query
   filters `(user_id, used, expires_at)`. New migration with composite indexes matching the
   actual queries.
9. **Validate `req.params`.** Verified: `validateRequest` supports `body` and `query` only, so a
   malformed `:id` reaches `findByPk` and Postgres `22P02` surfaces as a 500. Add `params`
   support and `z.object({ id: z.string().uuid() })` on the three `/:id` routes. This also
   normalises the case-sensitive self-deactivation guard bypass at `userService.js:139`.

### Acceptance

- A failed audit insert rolls back its mutation.
- `npm run db:seed` with a changed `SEED_ADMIN_PASSWORD` actually changes the password (tested).
- Inserting `A@x.com` when `a@x.com` exists is rejected by the database, not by app code.
- `PATCH /api/users/not-a-uuid` returns 400, not 500.
- Migrations run clean on a fresh database and each new one has a working `down`.

---

## Milestone 6 — UI correctness

**Goal.** Nothing on screen states something untrue.

### Changes

1. **Dashboard fabricated stats.** Verified: `DashboardPage.jsx:17` seeds
   `{ total: 1, active: 1, disabled: 0 }` and refetches only when `role === 'ADMIN'`. A MEMBER in
   a 40-user system reads «إجمالي المستخدمين: 1». The `.catch(() => {})` also leaves an admin on
   the same fake `1/1` when the fetch fails. Render the two count cards for ADMIN only,
   initialise to `null` with a skeleton, and surface fetch errors.
2. **`v{user.tokenVersion || 0}`** always renders `v0` because `safeUser` deliberately never
   returns `tokenVersion`. Delete the card; `lastLoginAt` is real data already on the client.
3. **Mobile drawer under the header.** Verified: `HEADER_HEIGHT = 56` with
   `zIndex: theme.zIndex.drawer + 1` (1201) against MUI's temporary Drawer modal at 1200, and the
   drawer paper starts at `top: 0` with no offset. The top ~56px of the nav is behind an opaque
   header and taps there hit the header. Offset the drawer's scroll container.
4. **Users list search race.** Two effects fire on one filter change (`UsersPage.jsx:73-93`) —
   one resets the page, one refetches — with no abort or sequence guard, and `load()` writes the
   server's echoed `meta.page` back into state. A stale page-3 response landing after the page-1
   response overwrites real matches with an empty array and snaps the pager back. Fold the page
   reset into the filter setters and guard `load` with a sequence token.
5. **Self-demotion.** `updateUserStatus` guards self-deactivation; `updateUser` has no
   equivalent, so an admin can demote themselves to MEMBER and lose access with no in-product
   undo. Add the mirror guard.
6. **Admin self-reset.** `POST /api/users/:id/reset-password` has no restriction on targeting
   the actor's own id and requires no current password — converting a stolen session into a
   permanent credential, which `/auth/change-password` deliberately prevents.
7. **`<div>Loading…</div>`** in `guards.jsx:10,22` — the only English string a real user routinely
   sees, unstyled and LTR, on every hard refresh. Reuse `RouteFallback` from `App.jsx:23-29`.
8. **RTL physical properties** at `UsersPage.jsx:214` (`ml: 1` on the search icon) and the
   `align="left"` table cells at `:263,333`, where the header flips right and the buttons stay
   left. Use logical properties.
9. **Dialog state persistence** — the reset-password dialog keeps the previous target's typed
   password after cancel, so opening it for a second user shows a masked, already-filled field.
10. **MUI v6 deprecations** — `<Grid item xs>` in `DashboardPage` and `UsersPage`, and
    `inputProps` on the OTP field. These are the patterns Plans 2-4 will copy.

### Acceptance

- A MEMBER sees no user-count cards at all rather than wrong ones.
- The mobile drawer's first nav item is fully tappable at 375px width.
- Searching from page 3 shows the correct results.
- An admin cannot demote or reset themselves through the admin API.
- No English string renders in the authenticated UI.

---

## Milestone 7 — Handoff documentation

**Goal.** A teammate can orient themselves from `docs/` alone without asking a question.

### Changes

1. **Resolve the plan-file collision.** Verified: two `01-` files and two `02-` files exist.
   `plans/02-vercel-adminlte-shell-and-dashboard.md` describes a **dark** Zinc palette
   (`#09090b` canvas) for a shell that shipped **light** (`main.jsx:54`). Move both completed
   side-plans to `plans/done/` (or renumber `01b`/`01c`), tick their boxes, and add an index to
   `docs/implementation-status.md` mapping plan number → file → owner.
2. **`docs/handoff-plan1.md`** declares itself the source of truth and is stale in nearly every
   factual claim: commit `1880608` (now `e504b3a`), "28 tests" (now 62), "CI is NOT green yet"
   (green), and three "open issues" that are all already fixed. Rewrite or delete it.
3. **Apply D3** — remove or implement `controllers/`, and amend `plans/02-...md:17`.
4. **Apply D4** — either bump `tokenVersion` on role change or correct
   `docs/implementation-status.md:43` and `docs/handoff-plan1.md:75`.
5. **Error-code catalogue** in `docs/api-conventions.md`: all 20 shipped codes, the
   `DOMAIN_THING_STATE` naming rule, and the instruction that clients key off `code`, never
   `message`. Also state which response-envelope shape is canonical — both `data.user` and bare
   `data` currently ship.
6. **Correct the language claim.** `docs/api-conventions.md:34` shows an English example
   message; every user-facing message is Arabic, with `/api/health` deliberately English.
7. **New `docs/ui-conventions.md`** — Arabic copy, English role names (a deliberate Plan 1a
   decision), logical CSS properties only and why (`stylis-plugin-rtl` flips physical ones; this
   has caused two shipped bugs), numeric `borderRadius` in `sx` is a multiplier of
   `theme.shape.borderRadius`, and `getErrorMessage()` in every catch block. Link from `README.md`.
8. **Complete `docs/roles-and-access.md`** — it documents 4 auth endpoints; 12 ship. It also
   asserts `GET /api/audit-logs` exists; verified it does not (`app.js` mounts three routers).
9. **Merge-conflict conventions in `AGENTS.md`** — `NAV_GROUPS`/`BREADCRUMBS` in `AppShell.jsx`,
   the route list in `App.jsx`, `models/index.js`, `api/index.js`, and `app.js` router mounts are
   all append-only, one block per module, in plan order. `main.jsx` theme is owned by one person.
10. **Migration number claims** in `docs/database-workflow.md` — Plan 2 owns 0005-0019, Plan 3
    owns 0020-0039, Plan 4 owns 0040+. Or switch to timestamp prefixes from Plan 2 onward.
    Currently three branches would all write `0005-`.
11. **`docs/local-setup.md` gaps** — `CLIENT_ORIGIN` is load-bearing for CORS but not listed;
    where the OTP appears (server console) is not stated; the `git worktree` trap (no `server/.env`
    in a fresh worktree, producing `No Sequelize instance passed`) was diagnosed in Plan 1a and
    never written down; and `:82` says DB tests are "skipped" in CI when they fail.
12. **Test conventions** — where test files go (two different conventions in one repo), that
    `resetDb()` is destructive to the shared DB, that client test files must register
    `afterEach(cleanup)` themselves, and that assertions on user-facing strings must be Arabic.

### Acceptance

- `ls plans/` is unambiguous; each plan number maps to exactly one file.
- No document asserts a file, endpoint, layer, or status that does not exist.
- A teammate can find the RTL rule without opening a 63 KB plan file.

---

## Recommended order

| Order | Milestone                                              | Why here                                                                                           |
| ----- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 1     | **M0 decisions**                                       | D1 and D2 change scope. Answer before writing code.                                                |
| 2     | **M1 environment**                                     | Highest severity, smallest diff, no dependencies.                                                  |
| 3     | **M4 CI half** (concurrency + branches + secret check) | Do this _before_ adding tests, so the new tests run on a CI that can be trusted.                   |
| 4     | **M2 `mustChangePassword`**                            | Corroborated by four auditors; touches auth middleware, so land it before M3 edits the same files. |
| 5     | **M3 auth correctness**                                | Same files as M2.                                                                                  |
| 6     | **M4 tests half**                                      | Now the safety net covers M1-M3.                                                                   |
| 7     | **M5 data layer**                                      | Includes migrations; needs the test net in place first.                                            |
| 8     | **M6 UI**                                              | Independent of the above; lowest risk.                                                             |
| 9     | **M7 docs**                                            | Last, so it describes the finished state.                                                          |

## Validation per milestone

Per `AGENTS.md` rule 8, after **every** milestone:

```bash
npm run lint && npm run format:check && npm run test && npm run build
```

Fix any failure before starting the next milestone. Note the local install must be current —
`npm ci` after any pull that touches the lockfile, or the build fails on a missing dependency
that is correctly declared.

---

## Progress

_(updated as milestones complete)_

- [x] M0 — Decisions (D1, D3, D4 answered; D2 deferred by the owner)
- [x] M1 — Fail closed on environment (`4ec7383`)
- [x] M4a — CI half, landed early so later tests run on trustworthy CI (`a3c4954`)
- [x] M2 — Enforce `mustChangePassword` (`136ab19`)
- [x] M3 — Session and auth correctness (`30663c2`)
- [x] M4b — Regression safety net, test half (`bd92030`)
- [x] M5 — Data-layer patterns (`dd475df`)
- [x] M6 — UI correctness (`44d9e19`)
- [x] M7 — Handoff documentation

## Surprises and Discoveries

- The eight-slice audit found **zero model/migration drift** and **no secrets in 27 commits of
  history** — the two things most likely to be wrong at this stage were both clean.
- A claimed SQL-injection risk in the users search was investigated and disproved: Sequelize
  inlines the `Op.iLike` value but escapes it correctly (`'%%'' OR 1=1 --%'`). The real issue is
  only that `%` and `_` remain wildcards.
- `npm run build` was found broken in the working copy — `stylis-plugin-rtl` was in
  `package.json` and the lockfile but missing from `node_modules` after a fast-forward. Fixed
  with `npm install`. CI was unaffected because it runs `npm ci`. Worth a line in the docs
  (M7 item 11).

## Decision Log

**D1 — SUPERSEDED (2026-07-25): the forgotten-password flow was removed entirely.** The owner's
call, and the right one: SponsorSync is internal, so a locked-out user phones an admin who
resets the account — `POST /api/users/:id/reset-password` already issues a temporary password,
forces a change, and kills every live session. That made the OTP flow a duplicate recovery path
that could not work without a sender, so rather than buy a mailer, the flow is gone: three
unauthenticated routes, three service functions, three validators, the `PasswordResetOtp` model,
the `ForgotPasswordPage`, and the table (migration `0006`). `EXPOSE_DEBUG_OTP` remains for the
email-change OTP, which is authenticated and password-proofed, so the takeover path the original
decision worried about no longer exists. `server/tests/auth.test.js` asserts the three routes
stay unmounted. The original decision is kept below for the record.

**D1 (original) — OTP delivery: no mailer (option b).** Owner's instruction was to drop it if a sender
would cost money. Free SMTP options exist (nodemailer + a Gmail app password), but adding a
production dependency is an approval gate under `AGENTS.md` rule 12 and the owner declined the
cost. Outcome: `debugOtp` is now gated on the explicit `EXPOSE_DEBUG_OTP` opt-in (plus
`NODE_ENV=test`, which the OTP tests rely on), the `[DEV OTP]` console log remains the local
channel, and `server/.env.example` documents the limitation and the takeover risk. Real delivery
belongs in Plan 4, which owns "quality and delivery". **Password reset is not usable by a real
user until a sender exists — this must be stated in `docs/implementation-status.md` (M7).**

**D2 — RESOLVED (2026-07-25): one plan, one owner, one at a time.** Plan 2 → Person 2,
Plan 3 → Person 3, Plan 4 → Person 4, each starting when the previous plan passes acceptance.
Recorded in `docs/team-model.md`; the `## Team Ownership During Plan N` sections in all three
plans are rewritten as `## Ownership` with a single named owner, and their four `Person 1-4`
lanes are reframed as the four **areas** that one owner must cover.

Two things drove it. The university requires each teammate to own a separable, individually
assessable deliverable, which a whole-team phase does not give. And the plans stack — Plan 3
queries Plan 2's `events` and `companies`, Plan 4's metrics read Plan 3's cases — so the sequence
was never optional. One plan per person makes the person boundary and the dependency boundary the
same line.

Correcting my own earlier framing: the four-lane structure was **not** a drafting mistake. It was
a coherent design for four people working each phase concurrently, and the lanes even formed
consistent roles across the three plans. It was simply not the model this team is running.

The cost is stated in `docs/team-model.md` rather than left implicit: only one person writes
feature code at a time, so a slip in one plan pushes every later plan by the same amount. That is
now the project's main schedule risk, with mitigations written down.

**D2 (original finding, for the record).** Owner believed the `Person 1-4` sections were a
drafting mistake and would correct the plans after Plan 1b's findings landed. The finding as
written stood: the plans could not be handed out one-per-person _as they were_.

**D3 — `controllers/`: removed from the docs.** The shipped code uses thin inline `asyncHandler`
closures in the route files with all logic in `services/`. Introducing a controllers layer would
be a refactor of every route for no functional gain. `docs/architecture.md`,
`docs/api-conventions.md`, `plans/01-...md:120`, and `plans/02-...md:17` are corrected in M7.

**D4 — role change bumps `tokenVersion`: yes.** Chosen over editing the docs down, because
`docs/implementation-status.md:43` and `docs/handoff-plan1.md:75` already describe it as a
guarantee and a Plan 3 teammate may rely on it. One line in `userService.js`; the cost is that a
role change forces the affected user to log in again, which is defensible behaviour. Implemented
in M6 alongside the other `userService` guards.

**M1 — `JWT_SECRET` length is enforced in production only.** Presence is required in every
environment (that is the failure mode being fixed: a missing secret produced a confusing 500 at
login rather than a boot failure). The 32-character minimum applies only when
`NODE_ENV=production`, because the CI secret's length is not visible from here and a shorter one
would turn CI red for the whole team without improving any real protection.

## Outcomes

Seven milestones, eight commits, `e504b3a` → M7. Tests **62 → 85** (64 server + 21 client).
Lint, `format:check`, tests and build green after every milestone.

**What changed in substance, not line count:**

- Three security controls no longer depend on the _absence_ of `NODE_ENV`. The worst case —
  a deploy that forgot one variable handing an account-takeover path to any caller who knows an
  email address — is now impossible without deliberately setting `EXPOSE_DEBUG_OTP=true`.
- A temporary password is now actually temporary. Enforcement moved from one line of client-side
  navigation to middleware, verified by three tests including the API-with-curl path.
- The regression net covers the things a newcomer breaks, not only the bugs already hit. The
  `mustChangePassword` guard test was verified by mutation: the guard was removed, the test went
  red, the guard was restored.
- Persistence patterns are now the ones worth copying twenty times — transactions around every
  mutation-plus-audit, database-enforced email uniqueness, no fabricated audit actors.
- Every document that described a system slightly different from the shipped one was corrected
  or deleted, and the two conventions that live nowhere else (Arabic/RTL, error codes) are
  written down.

**Deliberately not done:**

- No mail sender (decision D1). Both OTP flows remain unusable by a real user. This is the one
  functional gap and it is recorded in `docs/implementation-status.md`, `docs/local-setup.md`,
  `docs/handoff-plan1.md` and `server/.env.example`.
- The plan-structure mismatch (decision D2) is documented in four places but not resolved —
  the owner will re-cut the plans.
- `updateUserStatus`'s and `updateUser`'s `USER_LAST_ADMIN` guards are unreachable over HTTP and
  were kept rather than deleted, as defence in depth for non-HTTP callers.

**Manual verification a human still owes:**

1. Log in as the seeded admin and confirm the forced password change cannot be walked around by
   typing `/app` in the address bar.
2. Open the users page on a 375px viewport and confirm the drawer's first nav item is tappable.
3. Search from page 3 of the users list and confirm the results are correct.
4. Confirm `npm run db:migrate` has been applied to the shared dev database (it has, as of this
   plan) and that no teammate's local database is behind.

# How the team runs SponsorSync

**One plan, one owner, one at a time.** Each person takes a whole plan and carries it from
migrations through backend, frontend, and tests to acceptance. The next person starts when the
previous plan is accepted and its migrations are on the shared dev database.

| Plan                                                                  | Owner        | Status       | Starts when              |
| --------------------------------------------------------------------- | ------------ | ------------ | ------------------------ |
| 1 — Foundation, auth, users (+ 1a UI/RTL, 1b hardening)               | **Person 1** | **Complete** | —                        |
| 2 — Events, event teams, companies, contacts                          | **Person 2** | Not started  | Now. Plan 1 is accepted. |
| 3 — Sponsorship cases, assignment, interactions, files, notifications | **Person 3** | Not started  | Plan 2 passes acceptance |
| 4 — Dashboards, reports, leaderboard, recommendations, delivery       | **Person 4** | Not started  | Plan 3 passes acceptance |

Migration ranges follow the same split: Plan 1 `0000`–`0007`, Plan 2 `0008`–`0019`, Plan 3
`0020`–`0039`, Plan 4 `0040`+. One owner per range means numbers cannot collide.

One branch per plan — `feature/plan2-events-companies`, `feature/plan3-sponsorship-workflow`,
`feature/plan4-analytics-delivery` — merged into `develop`, then `main`.

## Why this way

Two reasons, and they point the same direction.

**The plans stack.** Plan 3 queries the `events` and `companies` tables Plan 2 creates; Plan 4's
every metric reads Plan 3's sponsorship cases. Handing someone Plan 3 today gives them a document
whose first milestone builds on tables that do not exist. The sequence is not a preference, it is
a dependency. `.agent/PLANS.md` has required it from the start.

**Assessment needs separable work.** Each person can point at one plan, one branch, one range of
migrations, and one set of acceptance criteria and say: that is mine, end to end. Nobody's
contribution is entangled with anyone else's.

The cost is that only one person writes feature code at a time. That is real and it is the main
schedule risk on this project — see below.

## What an owner is responsible for

Everything in their plan. Not just the feature: the migrations, the API, the pages, the tests,
the docs, and the plan's own living sections (`Progress`, `Surprises and Discoveries`,
`Decision Log`, `Outcomes`). Each plan lists four **areas** — data/access, two feature areas, and
cross-module quality. Those were once four people; they are now four concerns one person covers,
kept separate because each has its own acceptance criteria and each is easy to leave half-done.

**`docs/starting-a-plan.md` is the practical how-to** — what to read in what order, a kickoff
prompt to paste into your AI assistant, and the mistakes these assistants actually make in this
repository. Read that and `docs/system-overview.md` before `AGENTS.md`. The rules that bite
hardest:

- Read the whole plan before editing anything.
- JavaScript only. No TypeScript.
- Schema changes go through migrations. Never `sync()`, never a dashboard edit.
- Never edit a merged migration — write a new one.
- After every milestone: `npm run lint && npm run format:check && npm run test && npm run build`.
  Fix red before starting the next milestone.
- Out-of-scope discoveries go in _Surprises and Discoveries_. Do not implement them.

And before writing code in these areas, read the conventions — each documents a bug that already
shipped here: `docs/ui-conventions.md` (client), `docs/api-conventions.md` (endpoints),
`docs/database-workflow.md` (migrations), `docs/roles-and-access.md` (authorization).

## The handoff is the risky part

In a relay, everything depends on the pass. A plan is not finished when the features work — it is
finished when the next person can start without asking you a question.

Before declaring a plan accepted:

1. All four validation commands green, on a clean checkout, not just on your machine.
2. Migrations applied to the shared dev database, and each new one verified to `down` and re-`up`.
3. `docs/implementation-status.md` updated, and the plan's living sections written **as you went**,
   not backfilled. _Surprises and Discoveries_ is the highest-value section in the whole document
   for the person after you: it is where "this looked simple and was not" gets recorded.
4. The plan's `## Handoff to Plan N+1` section filled in with what actually shipped.
5. Anything you left deliberately unfinished stated plainly, in writing. A known gap is a handoff;
   a silent one is a trap.

The next owner starts by reading your plan end to end, then running the app and clicking through
what you built. Not by reading your diff.

## The serialization risk, stated plainly

Three people are idle while one codes. If Plan 2 slips two weeks, Plans 3 and 4 slip two weeks
each, and the deadline does not move. This is the single largest risk to delivery, and it is a
property of the model, not a sign anything has gone wrong.

Reduce it:

- **The current owner asks for help early.** Being blocked quietly is the expensive failure. There
  are three people available to pair, review, or investigate.
- **The next owner reads ahead** and starts their design work — schema sketch, endpoint list, UI
  wireframes — while waiting. Design does not need the previous plan to be merged. Only code does.
- **Waiting owners review.** A second pair of eyes on a PR costs the reviewer an hour and can save
  the author a day, and it means each plan has been read by someone other than its author before
  it becomes a foundation for the next one.
- **Person 1 supports throughout.** Plan 1 is complete, so Person 1 is free for review, unblocking,
  and any repair to the foundation the later plans expose. Foundation defects are repaired in a
  focused commit and recorded in the current plan's _Surprises and Discoveries_ — not by rewriting
  Plan 1.
- **Cut scope before cutting quality.** Plan 4 has an explicitly optional section for this reason.
  If time runs short, drop optional work — do not drop tests, and do not hand over something that
  compiles but does not work.

## What is deliberately not in the product

So nobody rebuilds them by accident:

- **No self-service password reset and no self-service email change.** Both were built, then
  removed. Admins handle both through `/api/users`. Rationale in `docs/roles-and-access.md`.
- **No mail sender**, and nothing left that needs one.
- **No `GET /api/audit-logs` endpoint or UI.** Audit rows are written; reading them means querying
  the database.
- **No `controllers/` layer.** Route handlers are thin inline `asyncHandler` closures with all
  logic in `services/`.

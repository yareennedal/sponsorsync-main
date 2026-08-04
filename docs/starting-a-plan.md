# Starting your plan

You have been handed one plan to carry end to end. This page is how to begin, and how to steer
an AI assistant so it helps instead of quietly making things up.

Who owns what: `docs/team-model.md`. What the finished product does: `docs/system-overview.md`.

## Before you write any code

1. **Get it running.** Double-click `run.bat` (Windows), or `npm ci && npm run dev`. Log in and
   click through the existing app — users, profile, change password. Ten minutes here saves you
   from rebuilding something that already exists.
2. **Read your whole plan.** All of it, before writing anything. It is long because the decisions
   are already made; each section you skip is one you will re-invent worse and then have to redo.
3. **Read these five**, which are short and each one documents a bug that already shipped here
   or a layout decision your plan depends on: `docs/ui-conventions.md`, `docs/api-conventions.md`,
   `docs/database-workflow.md`, `docs/roles-and-access.md`, `docs/architecture.md`.
4. **Read `AGENTS.md`.** Thirteen rules. They are the ones that make review painless.
5. **Branch.** `git checkout -b feature/plan2-events-companies` (your plan names its own branch).

## The eight that are not negotiable

Read these even if you read nothing else on this page. Each one is a real bug this repository
already shipped, and each is the kind that produces a **clean build and a passing lint** while
being wrong.

1. **JavaScript only.** No TypeScript, no `.ts` files, no type annotations.
2. **Schema changes go through Sequelize migrations. Never `sequelize.sync()`**, never an edit in
   the Supabase dashboard, never an edit to a migration that already exists.
3. **Stay inside your migration number range** (Plan 2: `0008`–`0019`). The dev and test databases
   are shared with three other people — never drop or reset either.
4. **`import Grid from '@mui/material/Grid2'`.** MUI v6's default `Grid` export is the legacy API
   and **silently ignores** `size={{...}}` — no error, no warning, clean build, collapsed layout.
5. **No physical CSS in `sx`.** Use `marginInlineStart`, `insetInlineEnd`, `textAlign: 'start'`.
   The RTL plugin flips `ml`, `left`, and `textAlign: 'right'` into the opposite side.
6. **Every new table goes into the TRUNCATE list** in `server/tests/helpers.js`, or other test
   files start failing for reasons that look unrelated to your change.
7. **Client test files must call `afterEach(cleanup)` themselves.** Vitest runs without
   `globals: true`, so React Testing Library cannot register it, and the second test in a file
   fails with "found multiple elements".
8. **Assert on `error.code`, never `error.message`.** Messages are Arabic user-facing copy and
   will change.

And one that is not a code rule: **do not build anything from Plan 3.** `docs/system-overview.md`
shows sponsorship cases sitting right next to what you are building, and it is tempting to
scaffold "the obvious next thing". Your plan's `## Excluded` list is the boundary.

## Working with an AI assistant

Every tool reads a different filename, and all of them are generated from `AGENTS.md`:
`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`. So the rules load automatically —
but **loading is not the same as following**, and the weaker the model, the more it will
confidently do something the rules forbid.

The prompt below repeats the eight above on purpose. A rule stated once in a file the model
skimmed is not a rule it will follow.

### Paste this to start a session

Adjust the plan number and milestone. Reuse it at the start of **every** session, not just the
first — a fresh session knows nothing about the last one.

> I am implementing **Plan 2** of the SponsorSync project (`plans/02-events-companies-and-team-management.md`). I own this plan end to end.
>
> **Before doing anything else, read these files completely and tell me in your own words what you understood — do not write code in this message:**
>
> 1. `plans/02-events-companies-and-team-management.md` — the whole plan
> 2. `AGENTS.md` — the hard rules
> 3. `docs/system-overview.md` — how my plan fits the whole product
> 4. `docs/api-conventions.md` and `docs/ui-conventions.md`
>
> Then confirm you understand these specific constraints, which are non-negotiable:
>
> - **JavaScript only.** No TypeScript, no `.ts` files, no type annotations.
> - **Schema changes go through Sequelize migrations only.** Never `sequelize.sync()`, never an edit in the Supabase dashboard. My migration numbers are **0008–0019**; do not use any number outside that range, and never edit a migration that already exists.
> - **The dev and test databases are shared with three other people.** Never drop or reset them.
> - **`import Grid from '@mui/material/Grid2'`** — the default MUI `Grid` export is the legacy API and silently ignores `size={{...}}`, producing a collapsed layout with no error.
> - **No physical CSS in `sx`.** Use `marginInlineStart`, `insetInlineEnd`, `textAlign: 'start'`. The RTL plugin flips `ml`, `left`, `textAlign: 'right'`.
> - **Every new table goes into the TRUNCATE list** in `server/tests/helpers.js`.
> - **Client test files must call `afterEach(cleanup)` themselves.**
> - **Assert on `error.code`, never `error.message`** — messages are Arabic and will change.
>
> Work one milestone at a time. After each milestone, run `npm run lint && npm run format:check && npm run test && npm run build`, **paste the real output**, and fix anything red before starting the next milestone. Do not tell me a milestone is done without that output.
>
> If you find a problem outside this plan's scope, write it in the plan's _Surprises and Discoveries_ section and keep going. Do not fix it.
>
> Start with **Milestone 1** and stop after it.

### Then, each milestone

> Milestone 1 is committed. Re-read `plans/02-...md` from `## Milestone 2` onward and implement only Milestone 2. Same rules as before. Stop after it and show me the validation output.

## What your AI will get wrong

Not hypotheticals — every one of these has actually happened in this repository.

| It will…                                                                   | Because                                             | Catch it by                                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| Say "done, everything passes" without running anything                     | It predicts what the output would be                | Demanding the pasted output. No output, not done.                      |
| Reach for `sequelize.sync()` to add a column                               | It is the most common pattern online                | Rule 5. There is no situation here where `sync()` is right.            |
| Use `<Grid item xs={6}>` or `<Grid size={{xs:6}}>` from the default import | Both look correct; the second silently does nothing | The Grid2 import. A collapsed layout with a clean build is this bug.   |
| Write `ml: 2` or `textAlign: 'right'`                                      | Standard MUI, and it is wrong in an RTL app         | `docs/ui-conventions.md`                                               |
| Invent an endpoint, table, or helper that "should" exist                   | It pattern-matches other projects                   | Grep before believing it. `controllers/` in particular does not exist. |
| Write a test that cannot fail                                              | Passing tests look like success                     | Break the code once and confirm the test goes red.                     |
| Quietly widen scope into Plan 3                                            | The plans reference each other                      | Your plan's `## Excluded` list                                         |
| Forget the plan's living sections                                          | They are at the bottom of a long file               | Update `## Progress` in the same commit as the work                    |

**The single most useful habit:** when the AI says something exists, grep for it before believing
it. A confident wrong answer costs an hour; `grep -r` costs five seconds.

## Definition of done for a milestone

Not "it compiles". All four of these:

```bash
npm run lint && npm run format:check && npm run test && npm run build
```

green, the milestone's own acceptance behaviours in your plan actually verified, `## Progress`
ticked, and anything surprising written into `## Surprises and Discoveries` while it is fresh —
not reconstructed at the end.

## When you are stuck

Ask. Three people are waiting on this plan and are free to help; nobody minds a question, and
everybody minds a week lost to silence. Being blocked quietly is the expensive failure mode of a
relay — see `docs/team-model.md`.

If something in the foundation is broken, fix it in a focused commit and record it in your
plan's _Surprises and Discoveries_. Do not rewrite Plan 1 around it.

## Before you hand over

Your plan's `## Handoff to Plan N+1` section is the next person's starting point, and they cannot
ask you questions six weeks from now as easily as you think. The full checklist is in
`docs/team-model.md`; the part people skip is the honest one: **write down what you left
unfinished.** A known gap is a handoff. A silent one is a trap.

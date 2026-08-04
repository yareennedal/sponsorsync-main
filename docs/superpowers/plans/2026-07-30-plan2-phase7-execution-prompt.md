# Plan 2 Phase 7 Execution Prompt

You are finishing SponsorSync Plan 2 Phase 7 on branch `feature/plan2-events-companies`.

Phase 7 is an integration, verification, documentation, and handoff phase. It should not add new
product scope. Product code changes are allowed only when the Phase 7 acceptance pass exposes a
real Plan 2 bug.

## Required Skill Order

Use these skills before and during execution:

1. `executing-plans`
2. `verification-before-completion`
3. `supabase`
4. `vitest-testing`
5. `playwright-cli` or `webapp-testing` if automating the browser workflow
6. `security-review`
7. `code-review`
8. `requesting-code-review`
9. `finishing-a-development-branch`

Supabase note: this repo uses Supabase PostgreSQL through Express + Sequelize. React must not use
Supabase directly. Check the current Supabase changelog before database-adjacent verification.
No schema changes are expected in Phase 7.

## Must-Read Files

- `AGENTS.md`
- `docs/starting-a-plan.md`
- `docs/team-model.md`
- `docs/system-overview.md`
- `docs/architecture.md`
- `docs/api-conventions.md`
- `docs/ui-conventions.md`
- `docs/database-workflow.md`
- `docs/roles-and-access.md`
- `docs/implementation-status.md`
- `plans/02-events-companies-and-team-management.md`
- `plans/03-sponsorship-workflow-interactions-files-and-notifications.md` prerequisites and
  opening scope only
- `docs/superpowers/plans/2026-07-29-plan2-events-companies-phases.md`
- `server/src/constants/plan2Constants.js`
- `server/src/models/index.js`
- `server/src/services/eventAccessService.js`
- `server/src/services/companyService.js`
- `server/src/services/companyContactService.js`
- `client/src/features/events/*`
- `client/src/features/companies/*`

## Current Phase Boundary

Plan 2 owns:

- Events
- Event memberships
- Sponsorship package templates
- Reusable companies
- Company contacts
- Plan 2 access rules, audit rows, tests, and docs

Plan 2 does not own:

- Sponsorship cases
- Event-company linking
- Assignments or claiming
- Interactions, follow-ups, attachments, notifications
- Analytics, reports, recommendations
- Company sponsorship history beyond an explicit unavailable placeholder

The event-company link belongs to Plan 3 as `sponsorship_cases`, unique on `(event_id,
company_id)`. Do not create any direct event/company join in Phase 7.

## Preflight

1. Confirm the branch and working tree:

   ```bash
   git branch --show-current
   git status --short --branch
   git log --oneline -8
   ```

   Expected: branch is `feature/plan2-events-companies`. If there are uncommitted user changes,
   inspect them and do not overwrite them.

2. Confirm Phase 1-6 commit history exists locally:

   - `13e9a9a feat: implement plan 2 event backend foundation`
   - `355056f feat(events): add member candidate lookup`
   - `7ff4f55 feat(events): add event management frontend`
   - `4f3b5eb feat(companies): add normalization and duplicate detection`
   - `7d491b0 feat(companies): add company directory workflow`

3. Confirm Phase 7 is still open in the plan:

   ```bash
   rg -n "Audit logging verified|Plan 2 end-to-end scenario passed|Phase 7" \
     plans/02-events-companies-and-team-management.md \
     docs/superpowers/plans/2026-07-29-plan2-events-companies-phases.md
   ```

## Phase 7 Review Pass

Before changing files, try to break the current system against Plan 2:

1. Check for direct React Supabase access:

   ```bash
   rg -n -e "@supabase" -e "supabase-js" -e "createClient" client/src
   ```

   Expected: no matches.

2. Check for Plan 3 scope in product code:

   ```bash
   rg -n -i -e "sponsorship_case" -e "assignment" -e "assigned_to" -e "interaction" \
     -e "attachment" -e "notification" -e "analytics" -e "recommendation" -e "report" \
     server/src client/src
   ```

   Expected: no new Plan 3 implementation. Existing comments or explicit placeholder text are
   allowed only after inspection.

3. Check migration scope:

   ```bash
   rg --files server/migrations
   ```

   Expected Plan 2 migrations are `0008` through `0013` only unless a real previously documented
   bug required a later Plan 2 migration. Do not add migrations in Phase 7 unless verification
   proves schema drift.

4. Check RTL/frontend traps in Plan 2 UI:

   ```bash
   rg -n -F -e "left:" -e "right:" -e "ml:" -e "mr:" -e "marginLeft" -e "marginRight" \
     -e "paddingLeft" -e "paddingRight" -e "borderLeft" -e "borderRight" \
     client/src/features/events client/src/features/companies client/src/layouts/AppShell.jsx
   ```

   Existing explanatory comments may appear; product `sx` should not use physical CSS.

5. Check API/docs alignment:

   - `docs/api-conventions.md` lists all Plan 2 event, package, company, and contact endpoints.
   - `docs/roles-and-access.md` matches the backend route/service rules.
   - Duplicate-company docs mention `error.details.matches` and `excludeCompanyId`.

If this pass finds a real bug, fix it with a focused test first. If it finds only documentation
drift, patch docs only.

## Acceptance Evidence

Gather evidence in this order.

### 1. Test Database Migration Verification

Run migration verification against the test Supabase database first:

```powershell
cmd /c "set NODE_ENV=test&& npm run db:migrate"
```

Expected: migrations are already applied or apply cleanly. Do not run migration undo against the
shared Supabase test database.

### 2. Full Automated Validation

Run:

```bash
npm run lint
npm run format:check
npm run test
npm run build
```

Expected:

- Lint exits 0 with no warnings.
- Format check passes.
- Server and client tests pass.
- Build passes. The existing Vite large-chunk warning is acceptable if the build exits 0.

### 3. Development Database Migration Verification

Only after the test database migration and validation are green, run:

```bash
npm run db:migrate
```

This targets the shared dev Supabase database because `NODE_ENV` defaults to development. Do not
run `db:migrate:undo` against shared dev or shared test.

### 4. Full Plan 2 Scenario

Run the canonical Plan 2 end-to-end scenario with realistic development data. Use the UI where
possible; use API calls only for setup or for proving negative access cases that are hard to click
cleanly. If automating, use Playwright/browser skills.

Use unique names/emails with a timestamp suffix so shared dev data does not collide with another
developer's rows. Do not paste real passwords or secrets in the report.

Scenario:

1. Admin signs in and confirms there are usable Admin, Leader, two Member, one Supervisor, and one
   unrelated Member accounts. Create missing role accounts through the app or Admin API, then
   complete forced password changes as needed.
2. Leader creates `University Technology Conference 2026 - Phase7 <timestamp>`.
3. Leader sets event date, sponsorship deadline, financial target, target sectors, and target
   cities.
4. Leader creates at least one sponsorship package template for the event.
5. Leader adds two Members and one Supervisor to the event team through member candidates.
6. Unrelated Member cannot access the event by direct URL or direct API request.
7. Leader creates `Jordan Telecom Phase7 <timestamp>` with one primary contact.
8. Leader adds a second contact and makes it primary.
9. The system warns when a similar company/domain is entered again. Do not create a duplicate
   unless testing the override path intentionally with a written override reason.
10. Leader refreshes direct event and company detail URLs and both still load.
11. Supervisor views event and company data but sees no edit controls.
12. Member/Supervisor direct API write attempts remain rejected with stable error codes, not
    Arabic message matching.

### 5. Audit Log Evidence

There is no audit-log endpoint or UI in Plan 2. Query `audit_logs` directly after the scenario.
Use the test acceptance run and/or the dev scenario rows as evidence.

PowerShell-friendly query:

```powershell
$script = @'
import { sequelize } from './server/src/db/index.js';

const [rows] = await sequelize.query(`
  select action, count(*)::int as count
  from audit_logs
  where action in (
    'EVENT_CREATED',
    'EVENT_UPDATED',
    'EVENT_MEMBER_ADDED',
    'EVENT_PACKAGE_CREATED',
    'COMPANY_CREATED',
    'COMPANY_UPDATED',
    'COMPANY_DUPLICATE_OVERRIDE',
    'COMPANY_CONTACT_CREATED',
    'COMPANY_CONTACT_UPDATED',
    'COMPANY_CONTACT_PRIMARY_CHANGED'
  )
  group by action
  order by action
`);
console.table(rows);
await sequelize.close();
'@
$script | node --input-type=module
```

Expected: at minimum the scenario produces event, membership, package, company, and contact audit
actions. `COMPANY_DUPLICATE_OVERRIDE` is required only if the scenario intentionally creates an
override.

## Documentation Updates

After evidence is gathered:

1. Update `docs/implementation-status.md` so Plan 2 is marked complete/accepted only if all Phase 7
   evidence is green and dev migrations are applied.
2. Update `docs/superpowers/plans/2026-07-29-plan2-events-companies-phases.md` Phase 7 checkboxes.
3. Update `plans/02-events-companies-and-team-management.md`:
   - Mark `Audit logging verified`.
   - Mark `Plan 2 end-to-end scenario passed`.
   - Add any final Surprises and Discoveries.
   - Add any final Decision Log entry only for real decisions made in Phase 7.
   - Fill `## Outcomes and Retrospective`.
   - Replace or expand `## Handoff to Plan 3` with concrete shipped facts.

The Plan 3 handoff must include:

- Migrations: `0008-create-events.js`, `0009-create-event-members.js`,
  `0010-create-sponsorship-packages.js`, `0011-create-companies.js`,
  `0012-create-company-contacts.js`, `0013-harden-plan2-phase1-schema.js`.
- Stable model names: `Event`, `EventMember`, `SponsorshipPackage`, `Company`,
  `CompanyContact`.
- Associations from `server/src/models/index.js`.
- Event statuses: `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `ARCHIVED`.
- Contact methods: `EMAIL`, `PHONE`, `WHATSAPP`, `MEETING`, `OTHER`.
- Duplicate confidence values: `HIGH`, `MEDIUM`, `LOW`.
- Event API shapes and permissions, with direct route references to `docs/api-conventions.md`.
- Company/contact API shapes and permissions, including duplicate conflict details.
- Confirmed routes: `/app/events`, `/app/events/:eventId`, `/app/companies`,
  `/app/companies/:companyId`.
- Package-template rule: Plan 3 must copy agreed figures onto sponsorship cases rather than
  reading package values live.
- Leadership-transfer rule: Plan 3 can rely on events having a manageable leader, and active
  leaders cannot be deactivated.
- Company-directory rule: companies are reusable and independent from events; Plan 3 adds the
  `sponsorship_cases` event-company link.
- Single currency: JOD, no currency column in Plan 2.
- Known limitations: no audit-log UI/API, no company merge, sponsorship history placeholder is
  unavailable until Plan 3, no notifications/attachments/analytics/recommendations.

## Final Review

Before committing:

1. Re-run:

   ```bash
   npm run lint
   npm run format:check
   npm run test
   npm run build
   git diff --check
   ```

2. Re-run the scope scans for direct Supabase client usage and Plan 3 product code.
3. Inspect the final diff and confirm it is Phase 7-only: evidence tests if added, docs, and bug
   fixes only if proven by acceptance.
4. Commit locally with:

   ```bash
   git add <changed files>
   git commit -m "docs(plan2): record acceptance and handoff"
   ```

Do not push.

## Stop Conditions

Stop and report before committing if:

- Test DB migration fails.
- Dev DB migration reports unexpected drift or a migration failure.
- The full Plan 2 scenario fails in a way that suggests product behavior is wrong.
- Audit rows are missing for event, membership, package, company, or contact actions.
- Any Plan 3 product code appears necessary to pass Phase 7.
- A shared dev/test database destructive operation looks required.

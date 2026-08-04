# SponsorSync Implementation Plan 4: Dashboards, Reports, Leaderboard, Sponsor Recommendations, Quality Hardening, and Graduation Delivery

This is the fourth and final sequential implementation plan. Begin only after the Plan 3 core workflow passes end to end. Do not use charts, AI language, or export files to hide incomplete sponsorship operations. Plan 4 turns verified operational data into decision support and prepares the project for evaluation, demonstration, and handoff.

This plan remains a living document until the graduation-ready build is accepted. Keep its Progress, discoveries, decisions, and retrospective sections current.

## Purpose and Big Picture

At the end of Plan 4, SponsorSync will provide useful role-specific dashboards, accurate event and team metrics, transparent performance scoring, PDF and Excel reports, and a deterministic sponsor recommendation feature with visible reasons. The full application will have security, accessibility, responsive-design, database-index, automated-test, continuous-integration, documentation, seed-data, and demo-path validation.

The project will remain intentionally focused. It will not become a general CRM, ERP, event-ticketing platform, payment processor, or autonomous AI sales tool.

## Prerequisites

The following must already work:

- Authentication and fixed roles
- User administration
- Event and event-team management
- Company and contact management
- Sponsorship cases
- Atomic assignment and duplicate-contact prevention
- Status and financial tracking
- **Append-only case status history** (`case_status_history`) and the exported
  `CASE_STATUS_RANK` module, both from Plan 3. Five metrics below are unbuildable without them —
  verify with a real query before starting, not by reading Plan 3's service code
- Interactions and follow-ups
- Private attachments
- In-app notifications
- Audit logs

If any prerequisite is incomplete, fix it before implementing a metric that depends on it.

## Scope

### Included

- Role-specific dashboard endpoints and pages
- Event financial target progress
- Sponsorship pipeline analytics
- Follow-up and activity analytics
- Member workload and performance
- Transparent leaderboard
- Date and event filters
- Excel report export
- PDF summary report export
- Deterministic sponsor recommendation scoring with reasons
- Query optimization and indexes
- Security and permission audit
- Accessibility and responsive review
- Unit, API, integration, concurrency, and end-to-end tests
- GitHub Actions hardening
- Demo seed data
- User and technical documentation
- Graduation demonstration script and recovery plan

### Optional only after all acceptance criteria pass

- Editable AI-generated email draft using an external API
- More advanced fuzzy duplicate detection
- Additional charts

### Explicitly excluded

- **Sponsorship fulfilment / deliverable tracking.** After a sponsor signs, commercial products
  create one tracked row per promised benefit (logo placed, booth built, passes issued) and this
  is the single step the research names software as failing at most often. SponsorSync
  deliberately ends at `CONTRIBUTION_RECEIVED`: `sponsorship_packages.benefits` records what was
  promised, and delivery is managed outside the tool. This is a considered exclusion, the
  clearest candidate for future work, and worth saying so in the defence rather than being asked.
- **Company record merging.** Plan 2 detects likely duplicates and requires an authorised
  override with a reason to create one anyway, so duplicates are rare rather than impossible. If
  two records for one company both accumulate sponsorship history, there is no merge path and
  the history stays split. Known limitation.
- **Multi-currency.** All amounts are JOD; there is no currency column anywhere. See Plan 2.
- Automatic email sending
- WhatsApp API integration
- Native mobile app
- Payment processing
- Digital signatures
- Public sponsor portal
- Dynamic role/permission builder
- Subscription billing or multi-tenant SaaS
- Custom-trained machine-learning model
- Autonomous company contact
- General accounting or event attendance

## Ownership

**Plan 4 has one owner: Person 4.** One plan, one person, start to finish. Do not begin until
Plan 3 has passed acceptance and its migrations are applied to the shared dev database — every
metric here reads from the sponsorship cases, interactions, and follow-ups Plan 3 creates.
See `docs/team-model.md`.

Work on one branch:

    feature/plan4-analytics-delivery

Migration numbers `0040`+ are yours.

**This plan is also the graduation delivery**, which makes it the one plan where running out of
time is visible to everyone. The `## Optional only after all acceptance criteria pass` section
exists for exactly that reason: it is cuttable, by design, and cutting it is not a failure.
Acceptance criteria first, optional work only if time remains.

### The four areas this plan covers

An earlier draft assigned these to four concurrent people. They are the four concerns **the
single owner must cover**.

1. **Analytics and reports.** Aggregate queries, report generation, metric verification,
   Excel/PDF endpoints, demo seed data, and final acceptance evidence. The metric definitions
   earlier in this plan are the contract — implement them exactly, because a dashboard that
   quietly computes something else is worse than no dashboard.
2. **Dashboards and responsive UX.** Page layouts, charts, filters, leaderboard presentation,
   accessibility, responsive review, loading/empty/error states, visual consistency.
3. **Recommendations.** Sponsor recommendation rules, scoring service, endpoint, reason
   explanations, company/event compatibility inputs, company history presentation, tests.
4. **Security, performance, CI, release.** Query indexes, security review, audit-log
   verification, environment and secret review, CI hardening, release checklist, migration
   safety, and final local-run documentation. This is the last chance to catch anything the
   three earlier plans left open — budget real time for it rather than treating it as sign-off.

## Metric Definitions

All metrics must have one authoritative backend definition. Do not calculate totals differently on separate frontend pages.

**Import `CASE_STATUS_RANK` from Plan 3; do not redefine status ordering here.** The fourteen
statuses are a branching graph, so "at or beyond `CONTACTED`" only means something against that
shared rank, where terminal statuses (`DECLINED`, `CLOSED`) rank `null` rather than high. Two
definitions of "contacted" that disagree is how a dashboard ends up contradicting the pipeline
board on the same screen.

**Anything phrased as "when did X happen" or "how long between X and Y" reads
`case_status_history`, never the current `status` column.**

### Event company metrics

For a selected event:

- `totalCases`: all non-archived sponsorship cases.
- `unassignedCases`: cases with no assigned member or status `UNASSIGNED`.
- `assignedCases`: cases with an assigned member.
- `contactedCases`: cases whose current status has a non-null `CASE_STATUS_RANK` at or above
  `CONTACTED`, **plus** terminal cases whose history shows they once reached `CONTACTED`. A case
  that was contacted and then declined was still contacted; counting only current status
  undercounts outreach and makes the team look less active than it was.
- `approvedSponsors`: cases currently in `APPROVED`, `CONTRACT_SIGNED`, or `CONTRIBUTION_RECEIVED`,
  plus cases now `CLOSED` whose `case_status_history` contains a transition to `APPROVED`.
- `declinedCases`: cases currently `DECLINED`, plus cases now `CLOSED` whose history contains a
  transition to `DECLINED`. Group by `declined_reason` — see the loss-reason report below.
- `overdueFollowUps`: pending follow-ups with due time before now.
- `inactiveCases`: active cases whose `last_activity_at` is null or older than a configurable number of days, recommended seven.

### Financial metrics

For a selected event:

- `financialTarget`: value from event.
- `requestedValue`: sum of requested amounts.
- `offeredValue`: sum of offered amounts.
- `approvedValue`: sum of approved amounts.
- `receivedValue`: sum of received amounts.
- `estimatedInKindValue`: sum of estimated in-kind values for approved or later cases.
- `targetAchievementPercent`: if target is greater than zero, received value divided by target times 100. Display approved progress separately; do not mix approved and received.
- `approvedAchievementPercent`: approved value divided by target times 100.
- `remainingToTarget`: maximum of target minus received value and zero.

Use decimal-safe database aggregation. Do not add JavaScript floating-point values without explicit conversion and tests.

### Pipeline metrics

Return counts grouped by current status. The backend returns stable status keys and the frontend maps them to labels.

### Activity metrics

- Interactions in selected period
- Follow-ups completed in selected period
- Follow-ups completed on time
- Follow-ups overdue
- Average days from case creation to first contact — the interval between the case's creation row
  in `case_status_history` and its first transition to `CONTACTED`
- Average days from first contact to approval for approved cases — between those two history rows
- Median as well as mean for both, because one company that took nine months to answer will drag
  a mean far away from the team's real experience

If insufficient data exists, return null and an explanatory state rather than zero that suggests a real measurement.

## Dashboard API

### Current-user dashboard

    GET /api/dashboard/me?eventId=&from=&to=

Behavior by role:

- Admin: organization-wide summary and recent events.
- Leader: events led, targets, overdue follow-ups across the team, inactive cases, and member performance.
- Member: assigned cases, due/overdue follow-ups, personal activity, and progress.
- Supervisor: read-only summaries for assigned events.

### Event dashboard

    GET /api/dashboard/events/:eventId?from=&to=

Return:

- Event summary
- Company metrics
- Financial metrics
- Pipeline counts
- Follow-up metrics
- Time-series progress
- Sector performance
- Member performance summaries
- Data-as-of timestamp

Use a service layer. A single endpoint may execute several optimized queries in a transaction or consistent read approach. Do not fetch thousands of rows into Node and aggregate everything in JavaScript when PostgreSQL can aggregate safely.

### Dashboard caching

For the graduation scope, in-memory caching is optional and usually unnecessary. First create correct indexed queries. If caching is introduced, use a short documented lifetime and invalidate or tolerate staleness explicitly. Never cache user-specific unauthorized data under a shared key.

## Dashboard Frontend

Use a JavaScript-compatible chart library such as Recharts. Do not add multiple chart libraries.

### Leader event dashboard

Display:

- Financial target card
- Approved and received progress bars
- Total, assigned, contacted, approved, declined, and overdue cards
- Status pipeline chart
- Received value over time chart
- Sector performance chart or table
- Member performance table
- Inactive case alert list
- Filters for date range and event

### Member dashboard

Display:

- Assigned active cases
- Due today
- Overdue follow-ups
- Recent interactions
- Personal performance breakdown
- No ranking shaming language; show the scoring formula and constructive indicators

### Supervisor dashboard

Display read-only event outcomes, progress, and team summary without operational write controls.

### Accessibility

- Every chart has a textual summary or accessible table.
- Do not communicate status only through color.
- Keyboard users can operate filters and menus.
- Forms and buttons have labels.
- Focus states are visible.
- Loading states do not cause severe layout shifts.

## Leaderboard Design

The leaderboard must be transparent and balanced. It must not rank members only by money because assignment difficulty differs.

Calculate per event and date range. Include only members with at least one assigned case in the selected scope.

Recommended score, maximum 100 before penalty:

### 1. Contact coverage: 20 points

    contacted assigned cases / assigned cases * 20

A case counts as contacted when it has at least one external interaction or an appropriate contacted-or-later status.

### 2. Follow-up discipline: 25 points

    completed on-time follow-ups / all due follow-ups * 25

When no follow-up became due, use a neutral documented value such as 12.5 or mark the component not applicable and reweight. Choose one approach and test it. Recommended: reweight available components to avoid arbitrary free points.

### 3. Conversion: 25 points

    approved cases / contacted cases * 25

When there are no contacted cases, score zero.

### 4. Financial contribution: 25 points

Use the member’s approved financial value divided by the highest approved value among eligible members in the same event and period, multiplied by 25. This is relative and must be labeled clearly. For events dominated by in-kind sponsorship, include estimated approved in-kind value or show a separate contribution metric.

### 5. Activity quality: 5 points

Use meaningful completed interactions relative to active cases, capped at a documented target such as three interactions per active case. Internal notes alone must not inflate the score.

### Overdue penalty: up to 10 points

Subtract two points per currently overdue follow-up, capped at 10.

Final score:

    max(0, contactCoverage + followUpDiscipline + conversion + financialContribution + activityQuality - overduePenalty)

Return every component and raw numerator/denominator. The UI must show how the score was calculated.

Do not permanently store leaderboard scores. Calculate from source records so corrections and date filters remain accurate.

## Reports

Reports must respect the same event access rules as dashboards.

### Loss reasons

Group declined cases by `declined_reason` for an event, and across all events for the
organisation. Return counts, the share of all declines, and the summed `requested_amount` behind
each reason.

Small, and the highest-value report in this plan for anyone deciding what to do next year. It is
the one question a sponsorship team cannot answer from a spreadsheet — "we lost 40 companies" is
noise, while "22 never replied, 9 had no budget this quarter, 5 already sponsor a competitor" is
three different problems with three different fixes.

Treat `NO_RESPONSE` as its own headline rather than folding it into rejections: a target list is
built expecting most companies never to reply, so a high no-response count is a signal about
outreach and targeting, not about the offer.

### Excel export

Endpoint:

    GET /api/reports/events/:eventId.xlsx?from=&to=&status=&memberId=

Use a JavaScript library such as ExcelJS.

Workbook sheets:

1. `Event Summary`
   - Event details
   - Target and financial totals
   - Case counts
   - Generated timestamp and filters

2. `Sponsorship Cases`
   - Company
   - Sector and city
   - Assigned member
   - Status
   - Priority
   - Sponsorship type
   - Requested/offered/approved/received values
   - Estimated in-kind value
   - Last activity
   - Next pending follow-up

3. `Team Performance`
   - Member
   - Assigned cases
   - Contacted cases
   - Approved cases
   - Follow-up results
   - Financial contribution
   - Score and components

4. `Follow-Ups`
   - Case/company
   - Assigned member
   - Due time
   - Status
   - Completed time

Apply readable formatting, freeze header rows, set column widths, and use numeric cells for amounts.

### PDF export

Endpoint:

    GET /api/reports/events/:eventId.pdf?from=&to=

Use a JavaScript PDF library such as PDFKit.

The PDF is a concise official summary, not a full data dump. Include:

- SponsorSync and event header
- Event dates and leader
- Financial target and approved/received totals
- Key case counts
- Pipeline summary
- Top-level member performance
- Overdue follow-up warning
- Generation timestamp and filters

If charts are difficult to embed reliably, use clean tables and progress bars. Do not generate screenshots of the browser.

### Export safety

- Sanitize file names.
- Set correct MIME and content disposition headers.
- Never export password, audit metadata secrets, storage paths, or unauthorized private contact details.
- Apply filters in backend queries, not only frontend.
- Test totals against dashboard totals for the same filters.

## Sponsor Recommendation Feature

This is the one required “smart” feature. It is deterministic and explainable; it does not require a custom model or paid AI API.

### Goal

For an event, rank active companies that do not already have a sponsorship case for that event. Return a score from 0 to 100 and human-readable reasons.

### Inputs

- Event category
- Event target sectors
- Event target cities
- Company sector and city
- Previous sponsorship cases across events
- Previous approvals and declines
- **Why previous declines happened** (`declined_reason`). Treat them differently: `NO_BUDGET` or
  `TIMING` is a company worth asking again next year, while `NOT_RELEVANT` or `INTERNAL_POLICY`
  is not. A scoring rule that penalises all declines equally will keep recommending companies
  that structurally cannot sponsor, and keep burying ones that simply asked you to come back.
- Historical approved/received value
- Recency of previous contact
- Whether the company is already being contacted in another active event

### Suggested scoring

- Sector matches one of event target sectors: +35
- City matches one of event target cities: +10
- Company previously approved a sponsorship: +20
- Company previously completed contribution: +10
- Positive historical value above a documented threshold: +10
- Event category matches categories of previously successful events: +10
- Complete contact information with primary contact: +5
- Company declined the most recent two relevant requests: -15
- Company has an active case in another event with recent activity: -20 and add a warning

Clamp final score to 0–100.

### Endpoint

    GET /api/events/:eventId/recommendations?limit=20&sector=&city=

Return:

- Company summary
- Score
- Reasons with point values
- Warnings
- Relevant historical summary
- Whether leader can add the company to the event

### Rules

- Exclude archived companies.
- Exclude companies already in the event.
- Do not claim prediction certainty.
- Label it “Recommended match” or “Compatibility score,” not “AI guaranteed sponsor.”
- Keep scoring configuration in one documented module.
- Unit-test every rule and combined score.

### Frontend

Add a recommendations section to the event sponsorship area:

- Sort by score
- Filter sector/city
- Expand reasons
- Show warnings
- Add company to event through the existing Plan 3 endpoint

The recommendation service must never bypass duplicate-case or assignment rules.

## Performance and Database Review

Use actual query plans or measured endpoints before adding indexes blindly.

Review likely indexes:

- sponsorship cases by event/status
- sponsorship cases by assigned member/status
- interactions by case/occurred date
- follow-ups by assigned user/status/due date
- event members by user/is active
- companies by normalized name, sector, city
- notifications by user/read/created date

Add indexes through migrations. Record evidence for each index, such as a slow query or explain plan. Avoid duplicating indexes already covered by unique constraints.

Prevent N+1 queries in dashboards and reports. Use grouped SQL through Sequelize query builder or carefully parameterized raw SQL when the ORM becomes unclear. Raw queries must use replacements/bind parameters and tests.

## Security Hardening

Review:

- Exact CORS origin and credentials
- Cookie settings
- Login rate limiting
- Password and secret handling
- Authorization on every dashboard and report endpoint
- Attachment access levels
- Mass-assignment protection in update endpoints
- Validation of query filters and pagination limits
- Safe error messages
- Audit log completeness
- No service role key in frontend bundle
- No `.env` or real data in Git
- Dependency audit and known issues

Add a documented maximum page size, recommended 100.

Use `helmet` and disable unnecessary identifying headers. Ensure export filenames and uploaded filenames cannot inject headers or paths.

## Test Strategy

### Unit tests

- Metric calculations
- Leaderboard components and reweighting behavior
- Recommendation rules
- Report mapping
- Money conversion helpers
- Date range handling

### API tests

- Dashboard permissions for all roles
- Dashboard filter behavior
- Report permissions and MIME types
- Report totals
- Recommendation exclusion and reasons
- Pagination limits

### Integration tests

- Database aggregates on seeded records
- Decimal sums
- Date-boundary behavior
- Query index-sensitive paths where practical
- Attachment and auth regression
- Concurrent claim regression from Plan 3

### End-to-end tests with Playwright

Required flows:

1. Admin login and user management smoke test.
2. Leader creates event and team.
3. Leader creates company and sponsorship case.
4. Leader assigns member.
5. Member records interaction and follow-up.
6. Leader approves sponsorship.
7. Dashboard updates.
8. Excel and PDF reports download.
9. Recommendation appears and can create a new case.
10. Unauthorized role cannot perform protected action.

Keep E2E data identifiable with a test prefix and clean it after execution where safe.

## GitHub Actions

Expand CI to run:

- `npm ci`
- lint
- formatting check
- unit/API tests that do not require unsafe secrets
- client build
- optional Playwright against a controlled test environment if secrets are available

Do not make CI silently pass when tests are skipped. Report clearly which database-dependent tests run locally and which run in CI.

## Demo Seed Data

Create idempotent demo seeders with fictional data only.

Recommended dataset:

- One admin
- Two leaders
- Four members
- One supervisor
- Two events: one active, one completed
- Fifteen to twenty companies across sectors and cities
- Multiple contacts
- Sponsorship cases covering each major status
- Several interactions and follow-ups, including due today and overdue
- Financial, in-kind, and mixed sponsorships
- Assignment history
- Private attachment metadata only where safe; use local fixture uploads during demo setup if needed

Never seed real private contact information.

Provide commands:

    npm run db:seed:demo
    npm run db:seed:demo:clear

The clear command must remove only records owned by the demo seed namespace, not arbitrary shared development data.

## Documentation Deliverables

Update or create:

- `README.md`: project overview and quick start
- `docs/local-setup.md`: clean clone, environment, migrate, seed, run
- `docs/architecture.md`: final architecture and request flow
- `docs/database.md`: ERD, tables, constraints, indexes
- `docs/api.md`: endpoint catalog and role access
- `docs/roles-and-access.md`: final matrix
- `docs/sponsorship-workflow.md`: status and transition rules
- `docs/testing.md`: commands and test layers
- `docs/demo-guide.md`: exact demo steps and fallback data
- `docs/user-guide.md`: Admin, Leader, Member, Supervisor instructions
- `docs/known-limitations.md`: honest limits and future work
- `docs/implementation-status.md`: all four plans and final state

## Milestone 1: Implement Authoritative Analytics Services

Create aggregate queries and tests before building charts.

Acceptance:

- Seeded data produces known expected totals.
- Approved and received values remain separate.
- Filters apply consistently.
- Null or insufficient metrics are represented honestly.
- Queries respect event access.

## Milestone 2: Build Role-Specific Dashboards

Implement current-user and event dashboards, charts, tables, alerts, filters, and textual chart alternatives.

Acceptance:

- Each role sees appropriate information.
- Dashboard values match direct database verification.
- Filters update all related widgets consistently.
- Tablet layout remains usable.
- No status is communicated through color alone.

## Milestone 3: Implement Transparent Leaderboard

Build calculation service, endpoint, breakdown UI, and tests.

Acceptance:

- Score is reproducible from source records.
- Every component and penalty is visible.
- Date/event filters work.
- Members without data do not produce divide-by-zero or misleading perfect scores.
- Money alone cannot determine the entire ranking.

## Milestone 4: Implement Excel and PDF Reports

Build exports, validate permissions, compare metrics, and test response headers and contents.

Acceptance:

- Files open successfully.
- Values match dashboards for identical filters.
- Excel cells use proper types.
- PDF is readable and branded.
- Unauthorized users cannot export inaccessible events.

## Milestone 5: Implement Sponsor Recommendations

Build deterministic scoring, endpoint, explanation UI, and tests.

Acceptance:

- Existing event companies are excluded.
- Scores and reasons match rule tests.
- Active cross-event contact produces warning/penalty.
- Adding a recommendation uses the normal sponsorship-case endpoint.
- No recommendation bypasses conflict prevention.

## Milestone 6: Security, Performance, and Accessibility Hardening

Run role matrix tests, inspect secret exposure, review queries, add justified indexes, test file access, and complete accessibility review.

Acceptance:

- No critical authorization gaps are found in manual endpoint tests.
- Frontend build contains no database or Supabase service secret.
- Major dashboard endpoints perform acceptably on demo data.
- New indexes are migration-controlled.
- Keyboard and screen-reader basics are supported.

## Milestone 7: End-to-End Automation and Release Candidate

Create Playwright tests, demo seed, release checklist, and a tagged release candidate branch or commit.

Acceptance:

- Full E2E workflow passes from a clean seeded state.
- Lint, format, tests, build, migrations, and demo seed pass.
- Another teammate follows the demo guide without undocumented help.
- Known limitations are written honestly.

## Milestone 8: Graduation Demonstration Readiness

Prepare a 10–15 minute reliable demonstration.

Recommended sequence:

1. Explain the spreadsheet/WhatsApp problem.
2. Sign in as Leader.
3. Open an event and show target and team.
4. Add a recommended company with visible reasons.
5. Assign it to Member A.
6. Demonstrate duplicate/conflict prevention with Member B or a second browser.
7. Record an interaction and follow-up as Member A.
8. Show overdue notification and private attachment behavior.
9. Approve a sponsorship and record received value as Leader.
10. Show dashboard target progress and member performance.
11. Export Excel or PDF report.
12. Briefly show audit history and architecture.
13. State limitations and future extensions without pretending they are implemented.

Prepare fallback screenshots or seed reset instructions only for recovery from internet or demo-data problems. Do not use fake results that differ from the working application.

## Required Commands

The final repository must support:

    npm ci
    npm run lint
    npm run format:check
    npm run test
    npm run test:e2e
    npm run build
    npm run db:migrate
    npm run db:seed:demo
    npm run dev

Document any environment-specific E2E command separately.

## Final Acceptance Criteria

SponsorSync is graduation-ready only when:

- All four roles work according to the documented matrix.
- A leader can create an event, manage a team, and set a target.
- Companies and contacts are reusable.
- One case exists per event/company.
- Duplicate contact is prevented through atomic assignment.
- Interactions, follow-ups, files, notifications, and financial values work.
- Dashboards use authoritative metrics.
- Approved and received values are distinct.
- Leaderboard is transparent.
- Reports open and match dashboards.
- Sponsor recommendations are deterministic and explained.
- Security, file access, and role tests pass.
- Lint, tests, E2E, and build pass.
- Migrations reconstruct the database.
- Demo seed is idempotent and fictional.
- Clean-clone and demo documentation are verified by another teammate.
- No out-of-scope system was partially added in a way that destabilizes the MVP.

## Idempotence and Recovery

- Dashboard GET requests are read-only.
- Recommendation calls create no records until the user explicitly adds a company.
- Report generation creates no database records unless optional audit of export is explicitly added.
- Demo seed is repeatable and namespace-safe.
- Demo reset must not wipe non-demo data.
- If a report library fails on a specific character or font, create a reproducible fixture and fix encoding; do not silently omit data.
- If an aggregate query is wrong, add a failing test from a minimal fixture before changing it.
- If the demo internet connection to Supabase is unavailable, state that the database is a managed dependency and use a documented backup plan only if one was prepared and tested in advance.

## Final Agent Handoff Format

The implementation agent must return:

- Summary of user-visible capabilities
- Exact commits or pull requests
- Migrations added
- New dependencies and reasons
- API endpoints added or changed
- Tests added and results
- Performance evidence
- Security review results
- E2E results
- Demo seed instructions
- Known limitations
- Commands to run the final application
- Confirmation that documentation matches actual behavior

## Progress

- [ ] Authoritative analytics queries implemented and verified.
- [ ] Role-specific dashboards completed.
- [ ] Leaderboard completed with visible formula.
- [ ] Excel report completed and verified.
- [ ] PDF report completed and verified.
- [ ] Sponsor recommendations completed and verified.
- [ ] Database indexes reviewed and migrated.
- [ ] Security and permission audit passed.
- [ ] Accessibility and responsive review passed.
- [ ] End-to-end tests passed.
- [ ] Demo seed and cleanup verified.
- [ ] Documentation completed and independently tested.
- [ ] Graduation demo rehearsal passed.

## Surprises and Discoveries

- Observation:
  Evidence:

## Decision Log

- Decision: Sponsorship fulfilment tracking is explicitly excluded, not overlooked.
  Rationale: After a sponsor signs, commercial products create one tracked row per promised
  benefit, and research names this the step software most often fails at. SponsorSync stops at
  CONTRIBUTION_RECEIVED and records promises as package benefits text. Recorded as a considered
  exclusion and the clearest candidate for future work, so it can be answered in the defence
  rather than discovered.
  Date/Author: 2026-07-25, Person 1 (pre-handoff system review).

- Decision: Sales stage and contract status stay one field, unlike commercial products.
  Rationale: Real products keep "we are negotiating" and "the PDF is signed" in separate fields.
  Here `received_amount` already carries payment state independently, and a single ordered enum is
  simpler for a four-month project. Recorded so the difference reads as a choice.
  Date/Author: 2026-07-25, Person 1 (pre-handoff system review).

- Decision: Add a loss-reason report grouping declined cases by `declined_reason`.
  Rationale: The smallest report in the plan and the most useful for planning next year. "We lost
  40 companies" is noise; "22 never replied, 9 had no budget, 5 sponsor a competitor" is three
  different problems with three different fixes. It is also the question a spreadsheet cannot
  answer, which is the point of the tool.
  Date/Author: 2026-07-25, Person 1 (pre-handoff system review).

- Decision: Implement deterministic sponsor recommendations before generative AI features.
  Rationale: The feature is explainable, testable, inexpensive, based on SponsorSync’s own data, and does not make the core workflow depend on an external AI service.
  Date/Author: Initial product decision.

- Decision: Separate approved and received target progress everywhere.
  Rationale: An agreement is not the same as collected sponsorship, and combining them would make reports misleading.
  Date/Author: Initial product decision.

## Outcomes and Retrospective

At completion, compare the delivered product with the original SponsorSync problem statement. Record what measurable problems it solves, what remains out of scope, test and demo evidence, team lessons, and recommended post-graduation work.

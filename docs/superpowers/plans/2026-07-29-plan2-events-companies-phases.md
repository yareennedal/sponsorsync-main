# Plan 2 Events and Companies Phased Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Plan 2 as a complete event/team/company directory foundation without leaking
Plan 3 sponsorship-case workflow into this phase.

**Architecture:** Keep the existing SponsorSync shape: React calls Express over HTTP, Express
routes stay thin, services own business rules and transactions, Sequelize models mirror
migration-controlled PostgreSQL tables, and the frontend reuses the current Arabic/RTL MUI shell.
Plan 2 appends new event and company modules to the existing auth/users foundation.

**Tech Stack:** JavaScript only; React + Vite + MUI v6 + Axios client; Node + Express ESM server;
Sequelize v6 migrations and models; PostgreSQL on Supabase.

## Global Constraints

- Read `plans/02-events-companies-and-team-management.md`, `AGENTS.md`,
  `docs/api-conventions.md`, `docs/ui-conventions.md`, `docs/database-workflow.md`,
  `docs/roles-and-access.md`, and `docs/architecture.md` before coding.
- JavaScript only. No TypeScript files, TS config, or generated code requiring TS compilation.
- Plan 2 owns migrations `0008`-`0019`; never edit migrations `0000`-`0007`.
- React stays in `client/`; Node/Express stays in `server/`; React never queries Supabase
  directly.
- Schema changes go through Sequelize migrations only. Never `sync()` or dashboard edits.
- Every mutation and its audit log row must share one `sequelize.transaction()`.
- Add every new table to `server/tests/helpers.js` `TRUNCATE` list.
- User-facing API messages are Arabic; tests assert on `error.code`, not `error.message`.
- Client UI is Arabic/RTL. Use `@mui/material/Grid2`, logical CSS properties in `sx`, and
  `getErrorMessage(err, fallback)` in every catch block.
- Single currency is JOD; do not add a currency column.
- Out of scope: sponsorship cases, assignment, interaction timeline, follow-ups, attachments,
  notifications, analytics, reports, recommendations.

---

## What Plan 2 Changes In The Current System

The current app is a secure account-management shell: login, profile, password change, user admin,
and a placeholder dashboard. Plan 2 turns it into the data foundation the sponsorship workflow
will depend on:

- Adds event management: events, leaders, event members, supervisors, statuses, targets, target
  sectors/cities, and leadership transfer.
- Adds sponsorship packages as event-scoped templates: name, amount, benefits, display order.
- Adds company directory: reusable companies independent from events.
- Adds company contacts: multiple contacts per company, one active primary contact at a time.
- Adds deterministic duplicate-company warnings at entry time.
- Adds role-scoped access: admins see all, leaders manage led events, members/supervisors read
  only events where they have active membership, companies are read-only for member/supervisor.
- Extends user deactivation: a user leading active events cannot be deactivated until leadership
  is transferred.
- Extends the frontend shell with Events and Companies pages/routes/navigation.
- Updates docs and handoff material so Plan 3 can safely add sponsorship cases linking events and
  companies.

## Current Extension Points

Modify these append-only shared files in plan order:

- `server/src/app.js`: mount `eventRouter` and `companyRouter` after existing routers.
- `server/src/models/index.js`: append imports, exports, and association blocks for Plan 2 models.
- `client/src/api/index.js`: append `eventApi` and `companyApi` objects.
- `client/src/App.jsx`: append lazy imports and protected routes.
- `client/src/layouts/AppShell.jsx`: append navigation groups and breadcrumbs.
- `server/tests/helpers.js`: add every new table to the TRUNCATE list.
- `docs/api-conventions.md`: add new error codes introduced by Plan 2.
- `docs/roles-and-access.md`: extend the matrix for events, memberships, packages, companies, and
  contacts.
- `docs/implementation-status.md` and `plans/02-events-companies-and-team-management.md`: update
  living sections as milestones land.

Prefer new focused files for the feature modules:

- Backend models: `Event.js`, `EventMember.js`, `SponsorshipPackage.js`, `Company.js`,
  `CompanyContact.js`.
- Backend constants: event statuses, contact methods, company duplicate confidence labels,
  optional controlled lists for event categories/sectors/cities.
- Backend validators: `eventValidators.js`, `companyValidators.js`.
- Backend services: `eventAccessService.js`, `eventService.js`, `eventMemberService.js`,
  `sponsorshipPackageService.js`, `companyNormalization.js`, `companyDuplicateService.js`,
  `companyService.js`, `companyContactService.js`.
- Backend routes: `eventRoutes.js`, `companyRoutes.js`.
- Frontend pages/features: `client/src/features/events/*` and
  `client/src/features/companies/*`.

## Phase 0: Kickoff And Safety Read

**Purpose:** Start Plan 2 without accidentally widening scope or fighting the existing foundation.

- [ ] Create/switch to `feature/plan2-events-companies`.
- [ ] Confirm the worktree is clean before starting.
- [ ] Read the canonical Plan 2 file end to end.
- [ ] Read the five convention docs listed in Global Constraints.
- [ ] Run the app and click through login, profile, password change, and users so the existing
      patterns are seen in motion.
- [ ] Do not write code in this phase.

**Gate:** Person 2 can explain what Plan 2 owns and what is deliberately excluded.

## Phase 1: Schema, Models, Associations, And Constants

**Purpose:** Create the database and model foundation before any endpoint pretends data exists.

**Migrations:**

- `0008-create-events.js`
- `0009-create-event-members.js`
- `0010-create-sponsorship-packages.js`
- `0011-create-companies.js`
- `0012-create-company-contacts.js`

**Implementation:**

- [ ] Add `events` with leader/creator FKs, event status constraint, non-negative
      `financial_target`, JSONB target arrays, archive timestamp, and indexes.
- [ ] Add `event_members` with one row per event/user pair, soft removal fields, FKs, and indexes.
- [ ] Add `sponsorship_packages` with active package uniqueness per event/name, non-negative
      amount, and deactivate-not-delete semantics.
- [ ] Add `companies` with display and normalized matching fields.
- [ ] Add `company_contacts` with contact method constraint, primary flag, archive timestamp, and
      company/user FKs.
- [ ] Add Sequelize models with explicit `field` mappings and `underscored: true`.
- [ ] Append associations in `server/src/models/index.js`.
- [ ] Update `server/tests/helpers.js` TRUNCATE list.
- [ ] Add migration/model tests for constraints: statuses, negative values, duplicate active
      package names, duplicate event membership behavior, and FK integrity.

**Gate:** Migrations apply, latest migration can be undone/reapplied in a disposable environment,
and model/constraint tests pass.

**Validation:** Run focused server tests first, then `npm run lint && npm run format:check &&
npm run test && npm run build`.

## Phase 2: Event Access And Event Backend

**Purpose:** Build the event API with one central access decision path.

**Files:**

- Create `server/src/services/eventAccessService.js`.
- Create `server/src/services/eventService.js`.
- Create `server/src/services/eventMemberService.js`.
- Create `server/src/services/sponsorshipPackageService.js`.
- Create `server/src/validators/eventValidators.js`.
- Create `server/src/routes/eventRoutes.js`.
- Modify `server/src/app.js`.
- Modify `server/src/services/userService.js` for `USER_LEADS_ACTIVE_EVENTS`.

**Implementation:**

- [ ] Implement `getAccessibleEvent({ eventId, user, access })` or equivalent.
- [ ] Distinguish admin, leader, active member, active supervisor, read permission, and manage
      permission.
- [ ] Implement `GET /api/events`.
- [ ] Implement `POST /api/events`.
- [ ] Enforce event create rules: Leaders can only create events led by themselves; Admins may
      choose an active `LEADER`; event dates/deadlines and non-negative financial targets are
      validated by the backend.
- [ ] Implement `GET /api/events/:eventId`.
- [ ] Implement `PATCH /api/events/:eventId`.
- [ ] Reject `leader_id` changes in the general event update endpoint; leadership moves only
      through `PATCH /api/events/:eventId/leader`.
- [ ] Implement `PATCH /api/events/:eventId/status`.
- [ ] Enforce the Plan 2 status matrix exactly: `DRAFT` -> `ACTIVE` or `CANCELLED`;
      `ACTIVE` -> `COMPLETED`, `CANCELLED`, or `ARCHIVED`; `COMPLETED` -> `ARCHIVED`;
      `CANCELLED` -> `ARCHIVED`; restore from `ARCHIVED` is Admin-only in the MVP.
- [ ] Implement `PATCH /api/events/:eventId/leader`.
- [ ] Enforce leadership-transfer rules: reason is required, the new leader is an active
      `LEADER` or `ADMIN`, any existing membership row for the new leader is removed/deactivated,
      and no sponsorship-case assignment is touched.
- [ ] Implement `GET/POST/DELETE /api/events/:eventId/members`.
- [ ] Implement `GET /api/events/:eventId/member-candidates` for admin/leader member lookup:
      active `MEMBER` and `SUPERVISOR` users only, excluding the event leader and active event
      members, with inactive memberships labeled for reactivation.
- [ ] Enforce membership rules: only active `MEMBER` and `SUPERVISOR` users can be added through
      the membership endpoint, the event leader cannot be added as a duplicate member, re-adding an
      inactive membership reactivates it, and removal sets `is_active = false` plus `removed_at`.
- [ ] Implement package collection endpoints: `GET /api/events/:eventId/packages` and
      `POST /api/events/:eventId/packages`.
- [ ] Implement package item endpoints: `PATCH /api/events/:eventId/packages/:packageId` and
      `DELETE /api/events/:eventId/packages/:packageId`; `DELETE` deactivates the package and never
      hard-deletes it.
- [ ] Return packages ordered by `display_order`, then `amount` descending, and reject duplicate
      active package names within one event with HTTP 409.
- [ ] Audit meaningful creates, updates, status changes, member changes, leadership transfer, and
      package changes.
- [ ] Extend admin user deactivation to reject active event leaders with
      `USER_LEADS_ACTIVE_EVENTS`.
- [ ] Add error codes to `docs/api-conventions.md`.

**Gate:** Backend acceptance scenario from Plan 2 Milestone 2 passes by API tests, including
unrelated member 404, member read-only behavior, and invalid transition rejection.

**Validation:** Run event API tests, then full validation commands.

## Phase 3: Event Frontend

**Purpose:** Make event setup usable through the existing authenticated RTL shell.

**Files:**

- Modify `client/src/api/index.js`.
- Modify `client/src/App.jsx`.
- Modify `client/src/layouts/AppShell.jsx`.
- Create `client/src/features/events/EventsPage.jsx`.
- Create `client/src/features/events/EventFormPage.jsx`.
- Create `client/src/features/events/EventDetailPage.jsx`.
- Create event components for status chip, package list/form, and member management if the page
  becomes large.

**Implementation:**

- [x] Add protected routes `/app/events`, `/app/events/new`, `/app/events/:eventId`,
      `/app/events/:eventId/edit`, `/app/events/:eventId/packages`.
- [x] Add role-aware event nav items.
- [x] Build event list with search, status/date filters, pagination, loading skeleton, empty
      state, and role-aware create action.
- [x] Build event create/edit form with dates, target, deadline, target sectors/cities, status,
      and server validation display.
- [x] Build event detail with leader, status, target/deadline, active team members/supervisors,
      package panel, and a Plan 3 sponsorship-work placeholder.
- [x] Build member-management controls for admin/leader only, using
      `GET /api/events/:eventId/member-candidates` for searchable selection instead of raw UUID
      entry or `GET /api/users`.
- [x] Build package-management controls for admin/leader only.
- [x] Use Arabic copy, Latin digits/date helper where needed, Grid2, and logical CSS.

**Gate:** A leader can create an event, add members/supervisor, manage packages, refresh direct
URLs, and unauthorized buttons do not render.

**Validation:** Client tests for role-aware actions, form validation, member controls, package
empty state, and direct URL loading; then full validation commands.

## Phase 4: Company Normalization And Duplicate Detection

**Purpose:** Build deterministic duplicate detection before write endpoints rely on it.

**Files:**

- Create `server/src/services/companyNormalization.js`.
- Create `server/src/services/companyDuplicateService.js`.
- Create `server/tests/companyNormalization.test.js`.
- Create `server/tests/companyDuplicates.test.js`.

**Implementation:**

- [x] Normalize company names: trim, collapse whitespace, lowercase, remove non-identifying
      punctuation conservatively.
- [x] Normalize website/domain: accept URL or domain, lowercase hostname, remove protocol/path,
      remove leading `www.`, reject malformed input.
- [x] Normalize emails with the existing email style.
- [x] Normalize phones by trimming separators while preserving an optional leading plus.
- [x] Implement confidence rules:
      HIGH for same non-empty website domain, or same normalized name plus same phone/email.
      MEDIUM for same normalized name and city, or same email domain with similar name.
      LOW for similar normalized name only.
- [x] Return reasons and confidence labels without claiming certainty.

**Gate:** Unit tests cover punctuation, whitespace, website paths, case, empty values, invalid
input, and the confidence rules.

**Validation:** Focused unit tests, then full validation commands.

## Phase 5: Company And Contact Backend

**Purpose:** Add reusable company directory and contact APIs with archive and primary-contact
transactions.

**Files:**

- Create `server/src/services/companyService.js`.
- Create `server/src/services/companyContactService.js`.
- Create `server/src/validators/companyValidators.js`.
- Create `server/src/routes/companyRoutes.js`.
- Modify `server/src/app.js`.

**Implementation:**

- [x] Implement `GET /api/companies`.
- [x] Implement `GET /api/companies/duplicates`.
- [x] Implement `POST /api/companies` with duplicate conflict and override reason.
- [x] If a high-confidence duplicate exists and no authorized override reason is provided, return
      HTTP 409 with the match details; do not create a second company.
- [x] Implement `GET /api/companies/:companyId`.
- [x] Implement `PATCH /api/companies/:companyId`.
- [x] Normalize changed company fields before saving, re-run duplicate checks for identity-field
      changes, and preserve the original display name.
- [x] Implement `PATCH /api/companies/:companyId/archive` for archive and restore behavior;
      archive is Admin/Leader, restore is Admin-only in the MVP.
- [x] Implement contact collection endpoints: `GET /api/companies/:companyId/contacts` and
      `POST /api/companies/:companyId/contacts`.
- [x] Implement contact item update endpoint:
      `PATCH /api/companies/:companyId/contacts/:contactId`.
- [x] Implement `PATCH /api/companies/:companyId/contacts/:contactId/archive`.
- [x] Implement `POST /api/companies/:companyId/contacts/:contactId/make-primary`.
- [x] Enforce one active primary contact per company in a transaction.
- [x] Enforce contact email-or-phone requirement.
- [x] Return an explicit empty/unavailable sponsorship-history section, not fake data.
- [x] Audit company/contact create, update, archive, restore, primary-change, and duplicate
      override.

**Gate:** Plan 2 Milestone 5 acceptance scenario passes by API tests, including member/supervisor
read-only behavior and archived filtering.

**Validation:** Company/contact API tests, then full validation commands.

## Phase 6: Company Frontend

**Purpose:** Make the reusable company directory and contact management usable from the UI.

**Files:**

- Modify `client/src/api/index.js`.
- Modify `client/src/App.jsx`.
- Modify `client/src/layouts/AppShell.jsx`.
- Create `client/src/features/companies/CompaniesPage.jsx`.
- Create `client/src/features/companies/CompanyFormPage.jsx`.
- Create `client/src/features/companies/CompanyDetailPage.jsx`.
- Create company components for duplicate suggestions and contact forms if needed.

**Implementation:**

- [x] Add protected routes `/app/companies`, `/app/companies/new`, `/app/companies/:companyId`,
      and `/app/companies/:companyId/edit`.
- [x] Add role-aware Companies nav item.
- [x] Build company list with search, sector/city filters, pagination, loading, empty, error, and
      archived states.
- [x] Build company form with debounced duplicate suggestion on name/website.
- [x] Show high-confidence duplicate conflicts and require an override reason for authorized
      users.
- [x] Build company detail with company info, active contacts, primary contact, contact
      add/edit/archive, make-primary action, and Plan 3 sponsorship-history placeholder.
- [x] Preserve backend conflict details for race/stale-client cases.
- [x] Keep pages usable on tablet-width layouts.

**Gate:** A leader can create a company with contacts, see duplicate warnings, change primary
contact, and a supervisor can view without edit controls.

**Validation:** Client tests for duplicate suggestions, conflict display, contact validation,
primary selection, archive behavior, and responsive structure; then full validation commands.

## Phase 7: Integration, Docs, Handoff

**Purpose:** Finish Plan 2 as a complete relay handoff to Plan 3.

**Implementation:**

- [x] Run the full Plan 2 end-to-end scenario with realistic development data.
- [x] Confirm audit logs contain event, membership, package, company, and contact actions by
      querying `audit_logs` directly; there is no audit-log endpoint or UI in Plan 2.
- [x] Confirm no sponsorship case, assignment, interaction, attachment, notification, analytics,
      report, or recommendation code was added.
- [x] Confirm Plan 2 still leaves companies independent from events; the event-company link is a
      Plan 3 `sponsorship_cases` responsibility, not a Phase 7 implementation task.
- [x] Update `docs/roles-and-access.md` with the Plan 2 matrix.
- [x] Update `docs/api-conventions.md` with final Plan 2 endpoints/error codes.
- [x] Update `docs/implementation-status.md`.
- [x] Update Plan 2 Progress, Surprises and Discoveries, Decision Log additions, and Outcomes.
- [x] Fill the Plan 2 Handoff to Plan 3 section with migration names, API shapes, access matrix,
      model names, status lists, normalization behavior, package-template rule, leadership-transfer
      confirmation, and JOD assumption.
- [x] Run required commands:
      `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`, test-database
      migration verification with `NODE_ENV=test`, and finally normal `npm run db:migrate` for
      the shared dev database only after everything else is green. Never run migration undo
      against the shared Supabase test or dev databases.

**Gate:** Plan 2 is accepted only when the UI workflow passes, backend authorization is proven,
all validation is green, and Plan 3 can safely build sponsorship cases on top.

## Suggested Commit Boundaries

- `feat(events): add Plan 2 schema and models`
- `feat(events): add event access and API`
- `feat(events): add event management UI`
- `feat(companies): add normalization and duplicate detection`
- `feat(companies): add company and contact API`
- `feat(companies): add company directory UI`
- `docs(plan2): record acceptance and handoff`

## Risk Checklist

- Do not add event leaders to `event_members` unless the implementation records that decision.
- Do not allow `PATCH /api/events/:eventId` to change `leader_id`; use transfer endpoint.
- Do not hard-delete events, companies, contacts, memberships, or packages.
- Do not make package amounts live-linked to future sponsorship cases.
- Do not use a global unique constraint on normalized company name alone.
- Do not let members/supervisors discover inaccessible events through direct IDs.
- Do not widen `/api/users` for event team selection; use the event-scoped candidate endpoint.
- Do not forget the user deactivation guard for leaders of active events.
- Do not add Plan 3 tables early.

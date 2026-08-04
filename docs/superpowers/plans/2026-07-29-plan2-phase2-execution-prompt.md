# Plan 2 Phase 2 Execution Prompt

Use this prompt to execute only Phase 2 of Plan 2 after Phase 1 has genuinely landed.

You are working in `D:\graduation` on SponsorSync.

Execute ONLY Plan 2 Phase 2: event access helpers and the event backend API. This includes event
CRUD, event status changes, admin-only leadership transfer, event membership endpoints,
sponsorship package endpoints, the event router mount, the leader-deactivation guard in
`userService`, backend tests, and the related backend/API documentation updates.

Do not implement event frontend pages, company normalization, company/contact backend APIs, company
frontend pages, sponsorship cases, assignments, interactions, follow-ups, attachments,
notifications, analytics, reports, recommendations, or any Plan 3 behavior.

## Baseline Gate

Before coding, prove Phase 1 is already present and verified on the Plan 2 branch you are executing
from. This workflow is local-only until the owner asks for commits or pushes, so do not require a
Git commit, GitHub push, or merge to `main` as the gate. This repository currently uses `main`, not
`master`; do not invent a `master` branch.

Stop immediately if any of these checks fail:

- `server/migrations/0008-create-events.js` exists.
- `server/migrations/0009-create-event-members.js` exists.
- `server/migrations/0010-create-sponsorship-packages.js` exists.
- `server/migrations/0011-create-companies.js` exists.
- `server/migrations/0012-create-company-contacts.js` exists.
- `server/migrations/0013-harden-plan2-phase1-schema.js` exists.
- `server/src/models/index.js` exports `Event`, `EventMember`, `SponsorshipPackage`, `Company`,
  and `CompanyContact`.
- `server/tests/helpers.js` truncates all five Plan 2 tables.
- Phase 1 validation was run and recorded in `plans/02-events-companies-and-team-management.md`.
- The Supabase test DB and normal dev DB both report latest migration
  `0013-harden-plan2-phase1-schema.js` and no pending migrations.

If Phase 1 is absent, report that Phase 2 cannot start on this tree. Do not create Phase 2 files on
top of missing tables/models.

## Required Skill Setup

Before touching files, load and follow:

- `using-superpowers`
- `supabase`
- `supabase-postgres-best-practices`
- `sequelize`
- `nodejs-backend-patterns`
- `security-review`
- `test-driven-development`
- `verification-before-completion`

Frontend/React skills are intentionally not needed for Phase 2 because this phase must not touch
`client/`. If you discover a genuine frontend need, stop and report the mismatch instead of
expanding the phase.

For Supabase: use the existing Sequelize/Postgres access path only. Do not use Supabase CLI
migration generation, dashboard edits, `supabase-js`, Data API grants, RLS policy work, Storage,
Edge Functions, or service-role keys in this phase. If a Supabase-specific security concern appears,
record it in Plan 2 Surprises and stop for owner review.

## Required Reading

Read these files completely before coding:

- `AGENTS.md`
- `C:\Users\bash\AppData\Local\Temp\sponsorsync-handoff-2026-07-29.md`
- `docs/starting-a-plan.md`
- `docs/api-conventions.md`
- `docs/ui-conventions.md`
- `docs/database-workflow.md`
- `docs/roles-and-access.md`
- `docs/architecture.md`
- `plans/02-events-companies-and-team-management.md`
- `docs/superpowers/plans/2026-07-29-plan2-events-companies-phases.md`
- `docs/superpowers/plans/2026-07-29-plan2-phase1-execution-prompt.md`

Then inspect current backend patterns:

- `server/src/app.js`
- `server/src/routes/userRoutes.js`
- `server/src/services/userService.js`
- `server/src/validators/userValidators.js`
- `server/src/utils/AppError.js`
- `server/src/utils/audit.js`
- `server/src/middleware/validateRequest.js`
- `server/src/middleware/errorHandler.js`
- `server/tests/users.test.js`
- `server/tests/auth.test.js`
- `server/tests/helpers.js`
- `server/src/models/index.js`

`AGENTS.md` is authoritative where docs drift. In particular, `server/.env` and `client/.env` are
intentionally committed in this private repo; do not delete, re-ignore, or rotate them as part of
Phase 2.

## Hard Scope Boundary

Allowed in Phase 2:

- Create `server/src/services/eventAccessService.js`.
- Create `server/src/services/eventService.js`.
- Create `server/src/services/eventMemberService.js`.
- Create `server/src/services/sponsorshipPackageService.js`.
- Create `server/src/validators/eventValidators.js`.
- Create `server/src/routes/eventRoutes.js`.
- Create focused backend tests for event access/API/package behavior.
- Modify `server/src/app.js` to mount `eventRouter` after `userRouter`.
- Modify `server/src/services/userService.js` only for `USER_LEADS_ACTIVE_EVENTS`.
- Update `docs/api-conventions.md` with new Phase 2 event error codes/endpoints.
- Update `docs/roles-and-access.md` with the Phase 2 event access matrix.
- Update `plans/02-events-companies-and-team-management.md` living sections.
- Update `docs/implementation-status.md` with Phase 2 backend status only when verified.

Forbidden in Phase 2:

- No migrations unless Phase 1 is discovered incomplete and the owner explicitly redirects you.
  Owner redirect received on 2026-07-30 for the Phase 1 corrective migration `0013`; do not add
  further Phase 2 migrations unless a new blocker is found and the owner redirects again.
- No model schema changes.
- No `client/` changes.
- No company normalization or company/contact routes/services/validators.
- No Plan 3 sponsorship case, assignment, interaction, follow-up, attachment, notification,
  analytics, report, recommendation, or fake sponsorship-history code.
- No controllers directory.
- No repositories/data-access abstraction layer.
- No generic policy engine.
- No new production dependency.
- No TypeScript.
- No direct Supabase client/database access from React.
- No commits unless the current user explicitly asks for one in the execution task.

## Files To Create

- `server/src/services/eventAccessService.js`
- `server/src/services/eventService.js`
- `server/src/services/eventMemberService.js`
- `server/src/services/sponsorshipPackageService.js`
- `server/src/validators/eventValidators.js`
- `server/src/routes/eventRoutes.js`
- `server/tests/eventAccessService.test.js`
- `server/tests/events.test.js`
- `server/tests/sponsorshipPackages.test.js`

If a test file becomes too large, split only by behavior: access helper, event API, package API.
Do not create a test utilities module until two test files duplicate the same setup in a meaningful
way.

## Files To Modify

- `server/src/app.js`
- `server/src/services/userService.js`
- `docs/api-conventions.md`
- `docs/roles-and-access.md`
- `plans/02-events-companies-and-team-management.md`
- `docs/implementation-status.md`

Do not modify any other file without first proving it is necessary for Phase 2 acceptance.

## Access Semantics

Build one central access path. Do not duplicate role/membership checks in every service.

Implement `server/src/services/eventAccessService.js` with these exports or tighter equivalents:

- `buildEventListAccess({ user, includeArchived })`
- `getEventPermissions({ user, event, membership })`
- `getAccessibleEvent({ eventId, user, access = 'read', transaction })`

Required behavior:

- Admin can read/manage every event.
- Leader can read/manage events where `events.leader_id === user.id`.
- Member/Supervisor can read events where they have an active `event_members` row.
- Member/Supervisor can never manage events, memberships, status, leadership, or packages.
- For inaccessible direct event reads, return 404 `EVENT_NOT_FOUND`, not 403.
- For a user who can read an event but cannot perform the attempted mutation, return 403
  `AUTH_FORBIDDEN`.
- The event leader is not duplicated in `event_members`.
- Archived events are excluded from normal lists.
- `archived=true` on `GET /api/events` is Admin-only in this MVP.
- Direct read of an archived event is allowed for Admin and the event leader, but not for
  members/supervisors.
- Every returned event detail includes permission flags useful to the UI, such as `canEdit`,
  `canManageMembers`, `canManagePackages`, `canTransferLeadership`, and `canChangeStatus`.

If Phase 1 used a different archived-event decision, follow Phase 1 and record the difference in
Plan 2 Surprises.

## Route Table

Create `server/src/routes/eventRoutes.js` using the existing route style: thin inline
`asyncHandler` closures, `authenticate`, `authorizeRoles` where useful, `validateRequest`, and
service calls. Mount it in `server/src/app.js` as:

```js
app.use('/api/events', eventRouter);
```

Routes:

| Method | Path                            | Auth Middleware                           | Service Function               |
| ------ | ------------------------------- | ----------------------------------------- | ------------------------------ |
| GET    | `/`                             | `authenticate`                            | `listEvents`                   |
| POST   | `/`                             | `authenticate`, `authorizeRoles(...)`     | `createEvent`                  |
| GET    | `/:eventId`                     | `authenticate`                            | `getEventDetails`              |
| PATCH  | `/:eventId`                     | `authenticate`, `authorizeRoles(...)`     | `updateEvent`                  |
| PATCH  | `/:eventId/status`              | `authenticate`, `authorizeRoles(...)`     | `updateEventStatus`            |
| PATCH  | `/:eventId/leader`              | `authenticate`, `authorizeRoles('ADMIN')` | `transferEventLeader`          |
| GET    | `/:eventId/members`             | `authenticate`                            | `listEventMembers`             |
| POST   | `/:eventId/members`             | `authenticate`, `authorizeRoles(...)`     | `addEventMember`               |
| DELETE | `/:eventId/members/:userId`     | `authenticate`, `authorizeRoles(...)`     | `removeEventMember`            |
| GET    | `/:eventId/packages`            | `authenticate`                            | `listSponsorshipPackages`      |
| POST   | `/:eventId/packages`            | `authenticate`, `authorizeRoles(...)`     | `createSponsorshipPackage`     |
| PATCH  | `/:eventId/packages/:packageId` | `authenticate`, `authorizeRoles(...)`     | `updateSponsorshipPackage`     |
| DELETE | `/:eventId/packages/:packageId` | `authenticate`, `authorizeRoles(...)`     | `deactivateSponsorshipPackage` |

Use `authorizeRoles('ADMIN', 'LEADER')` for event/member/package writes except leadership transfer,
which is Admin-only. Services still enforce event ownership and view/manage access; frontend-hidden
controls are never security.

## Validators

Create `server/src/validators/eventValidators.js` with Zod schemas and Arabic messages for every
user-reachable validation failure. Reuse the current convention: blank query-string filters become
`undefined`, UUID params are lowercased, and tests assert on `error.code`.

Required schemas:

- `eventIdParamsSchema`
- `eventMemberParamsSchema`
- `eventPackageParamsSchema`
- `listEventsQuerySchema`
- `createEventSchema`
- `updateEventSchema`
- `updateEventStatusSchema`
- `transferEventLeaderSchema`
- `addEventMemberSchema`
- `createSponsorshipPackageSchema`
- `updateSponsorshipPackageSchema`

Validation decisions:

- `page`: coerced integer, min 1, default 1.
- `pageSize`: coerced integer, min 1, max 100, default 20.
- `search`: blank becomes absent, trimmed, max 100.
- `status`: blank becomes absent, event status enum.
- `fromDate` and `toDate`: blank becomes absent, ISO date string.
- `archived`: blank becomes absent, coerced boolean, default false.
- `eventDate` and `sponsorshipDeadline`: ISO date strings matching Phase 1 date-only semantics.
- `financialTarget` and package `amount`: accept string or number, normalize to a decimal string,
  allow at most two decimal places, reject negatives.
- `targetSectors` and `targetCities`: arrays of trimmed non-empty strings, default empty arrays.
- `leaderId`, `eventId`, `userId`, and `packageId`: UUID strings transformed to lowercase.
- General event update schema must be strict and must not accept `leaderId`, `leader_id`, `status`,
  `createdBy`, `created_by`, or archive fields.
- Package update schema must require at least one patchable field.
- Event update schema must require at least one patchable field.

Do not add event category/sector/city database migrations in Phase 2.

## Event Service Requirements

Create `server/src/services/eventService.js`.

Export:

- `listEvents({ query, user })`
- `createEvent({ payload, user, requestId })`
- `getEventDetails({ eventId, user })`
- `updateEvent({ eventId, patch, user, requestId })`
- `updateEventStatus({ eventId, status, user, requestId })`
- `transferEventLeader({ eventId, leaderId, reason, user, requestId })`

Behavior:

- `listEvents` returns `{ data, meta }` in the existing paginated envelope shape.
- List search matches event `name`, `category`, and `location` with `Op.iLike`.
- List filters support `status`, `fromDate`, and `toDate`.
- List order is predictable: `eventDate ASC`, then `createdAt DESC`, then `name ASC`.
- `createEvent` allows only Admin/Leader.
- A Leader-created event is always led by the actor. If a Leader sends another `leaderId`, reject
  with 403 `AUTH_FORBIDDEN`.
- An Admin-created event must provide `leaderId` for an active user whose role is `LEADER`.
- `createEvent` accepts initial status `DRAFT` or `ACTIVE` only; default is `DRAFT`.
- Date/deadline and non-negative financial target validation are enforced by the backend, not only
  the database.
- `getEventDetails` returns event fields, leader summary, active member/supervisor summaries, and
  permission flags.
- `updateEvent` allows Admin or event leader only.
- `updateEvent` rejects leader/status/archive changes through validation or service checks.
- `updateEventStatus` follows the status matrix exactly:
  - `DRAFT` -> `ACTIVE` or `CANCELLED`
  - `ACTIVE` -> `COMPLETED`, `CANCELLED`, or `ARCHIVED`
  - `COMPLETED` -> `ARCHIVED`
  - `CANCELLED` -> `ARCHIVED`
  - `ARCHIVED` -> `ACTIVE`, Admin-only restore for the MVP
- When status becomes `ARCHIVED`, set `archivedAt`.
- When status leaves `ARCHIVED`, clear `archivedAt`.
- Invalid transitions return 422 `EVENT_STATUS_TRANSITION_INVALID`.
- `transferEventLeader` is Admin-only.
- The new leader must be active and have global role `LEADER` or `ADMIN`.
- If the new leader has an event membership row, deactivate it in the same transaction instead of
  hard-deleting it.
- Leadership transfer must not touch sponsorship cases or assignments.
- Every mutation and its audit row must share one `sequelize.transaction()`.

Audit actions:

- `EVENT_CREATED`
- `EVENT_UPDATED`
- `EVENT_STATUS_CHANGED`
- `EVENT_LEADER_TRANSFERRED`

Use `createAuditLog` with `entityType: 'event'`, `entityId: event.id`, and `metadata.requestId`.
Record meaningful before/after values, not whole Sequelize instances.

## Event Member Service Requirements

Create `server/src/services/eventMemberService.js`.

Export:

- `listEventMembers({ eventId, user })`
- `addEventMember({ eventId, memberUserId, user, requestId })`
- `removeEventMember({ eventId, memberUserId, user, requestId })`

Behavior:

- Reads require event read access.
- Writes require Admin or event leader.
- Only active global `MEMBER` and `SUPERVISOR` users can be added.
- Adding the event leader as a member returns 409 `EVENT_MEMBER_LEADER_CONFLICT`.
- Adding a missing/inactive/wrong-role user returns a stable error; use `USER_NOT_FOUND` for a
  missing user and `EVENT_MEMBER_USER_INVALID` for inactive or wrong role.
- If an inactive membership exists, re-activate it by setting `isActive = true` and `removedAt =
null`.
- If an active membership already exists, return the existing membership as an idempotent success.
- Removing a member sets `isActive = false` and `removedAt = new Date()`.
- Removing a missing/inactive membership returns 404 `EVENT_MEMBER_NOT_FOUND`.
- Do not hard-delete membership rows.
- Do not add Plan 3 ownership checks for active sponsorship cases.
- Every add/reactivate/remove and audit row shares one transaction.

Audit actions:

- `EVENT_MEMBER_ADDED`
- `EVENT_MEMBER_REACTIVATED`
- `EVENT_MEMBER_REMOVED`

## Sponsorship Package Service Requirements

Create `server/src/services/sponsorshipPackageService.js`.

Export:

- `listSponsorshipPackages({ eventId, user })`
- `createSponsorshipPackage({ eventId, payload, user, requestId })`
- `updateSponsorshipPackage({ eventId, packageId, patch, user, requestId })`
- `deactivateSponsorshipPackage({ eventId, packageId, user, requestId })`

Behavior:

- Reads require event read access.
- Writes require Admin or event leader.
- Package lookup must include both `eventId` and `packageId` so a package cannot be modified
  through the wrong event URL.
- Return packages ordered by `displayOrder ASC`, then `amount DESC`, then `name ASC`.
- Creating or updating to a duplicate active package name within the same event returns 409
  `EVENT_PACKAGE_NAME_TAKEN`.
- The same active package name in a different event remains allowed.
- `DELETE` deactivates with `isActive = false`; it never hard-deletes.
- Updating package `amount` is a template edit only and does not imply any Plan 3 case update.
- Every create/update/deactivate and audit row shares one transaction.

Audit actions:

- `EVENT_PACKAGE_CREATED`
- `EVENT_PACKAGE_UPDATED`
- `EVENT_PACKAGE_DEACTIVATED`

## User Deactivation Guard

Modify only `server/src/services/userService.js`.

In `updateUserStatus`, when `isActive === false`, reject deactivation if the target user leads any
event whose status is not `ARCHIVED` or `CANCELLED`.

Return:

- status `409`
- code `USER_LEADS_ACTIVE_EVENTS`
- Arabic user-facing message
- `details: { blockingEventCount: <number> }`

Do not block reactivation. Do not block users who lead only `ARCHIVED` or `CANCELLED` events. Do
not transfer leadership automatically.

## Error Codes To Document

Add these to `docs/api-conventions.md` when the implementation introduces them:

| Code                              | Status | Meaning                                                 |
| --------------------------------- | :----: | ------------------------------------------------------- |
| `EVENT_NOT_FOUND`                 |  404   | Event is missing or hidden from this user.              |
| `EVENT_STATUS_TRANSITION_INVALID` |  422   | Requested event status transition is not allowed.       |
| `EVENT_LEADER_INVALID`            |  400   | Selected event leader is missing, inactive, or invalid. |
| `EVENT_MEMBER_USER_INVALID`       |  400   | Event member target is inactive or has the wrong role.  |
| `EVENT_MEMBER_LEADER_CONFLICT`    |  409   | Event leader cannot also be added as event member.      |
| `EVENT_MEMBER_NOT_FOUND`          |  404   | Event membership is missing or already inactive.        |
| `EVENT_PACKAGE_NOT_FOUND`         |  404   | Sponsorship package is missing for that event.          |
| `EVENT_PACKAGE_NAME_TAKEN`        |  409   | Active package name already exists in that event.       |
| `USER_LEADS_ACTIVE_EVENTS`        |  409   | User cannot be deactivated while leading active events. |

Reuse `AUTH_FORBIDDEN`, `VALIDATION_ERROR`, `USER_NOT_FOUND`, and `RESOURCE_CONFLICT` where those
existing codes fit.

## Testing Requirements

Use strict TDD. Write the failing test first, run it, confirm the expected failure, then implement
the smallest slice.

Recommended slices:

1. Access helper behavior.
2. Event list/create/detail/update/status API.
3. Leadership transfer and user deactivation guard.
4. Event membership API.
5. Sponsorship package API.
6. Documentation/status updates and full validation.

Minimum tests:

- Admin lists all non-archived events.
- Leader lists only led non-archived events.
- Member/Supervisor list only events with active membership.
- Unrelated member cannot discover an event through list.
- Unrelated member direct event read returns 404 `EVENT_NOT_FOUND`.
- Member with access can read event detail but cannot update it.
- Event detail includes leader summary, active member summaries, and permission flags.
- Leader creates an event led by self.
- Leader cannot create an event led by someone else.
- Admin creates an event for an active `LEADER`.
- Admin cannot create an event for an inactive or wrong-role leader.
- Event create/update reject invalid deadline/target.
- `PATCH /api/events/:eventId` cannot change `leaderId` or `status`.
- Valid status transitions pass.
- Invalid status transition returns 422 `EVENT_STATUS_TRANSITION_INVALID`.
- Archived restore is Admin-only.
- Leadership transfer requires Admin, requires reason, requires active `LEADER` or `ADMIN`,
  deactivates any membership row for the new leader, and audits before/after.
- User deactivation guard returns 409 `USER_LEADS_ACTIVE_EVENTS` with blocking count.
- Event member add accepts only active `MEMBER`/`SUPERVISOR`.
- Adding the event leader as a member returns 409 `EVENT_MEMBER_LEADER_CONFLICT`.
- Re-adding an inactive membership reactivates it.
- Removing a member soft-removes it.
- Package list is ordered by `displayOrder`, then `amount` descending.
- Duplicate active package name in the same event returns 409 `EVENT_PACKAGE_NAME_TAKEN`.
- Same package name in another event is allowed.
- Deleting a package deactivates it and does not hard-delete it.
- Every meaningful mutation writes an `audit_logs` row with the expected action.
- Non-admin write routes are rejected on every mounted event write endpoint.

Use `supertest` API tests for route behavior and at least one direct service test for
`eventAccessService` so access logic is proven independently of Express routing.

Do not add client tests in Phase 2.

## Response Shape

Use the current API envelope:

- Single resource: `{ success: true, data: ... }`
- Paginated list: `{ success: true, data: [...], meta: { page, pageSize, total, totalPages } }`
- Errors go through `AppError` and `errorHandler`.

Do not return password hashes, token versions, raw Sequelize instances, or internal error details.
Use small user summaries for leaders/members:

- `id`
- `fullName`
- `email`
- `role`

## Documentation Updates

At the end of Phase 2 only:

- In `plans/02-events-companies-and-team-management.md`, check:
  - `Event access service implemented and tested.`
  - `Event API implemented and tested.`
  - Leave `Event frontend implemented and tested.` unchecked.
- Add Phase 2 surprises and decisions if archive restore semantics or Phase 1 deviations were
  discovered.
- Update `docs/api-conventions.md` with the Phase 2 endpoints and error codes.
- Update `docs/roles-and-access.md` with the event endpoint matrix.
- Update `docs/implementation-status.md` to say Plan 2 backend event API is complete only if the
  verification commands passed.

## Verification Commands

For red/green loops, run focused tests such as:

```powershell
npm --workspace server run test -- tests/eventAccessService.test.js
npm --workspace server run test -- tests/events.test.js
npm --workspace server run test -- tests/sponsorshipPackages.test.js
```

Before declaring Phase 2 complete, run from the repo root:

```powershell
npm run lint
npm run format:check
npm run test
npm run build
```

If Phase 1 migrations are not applied in the target database yet, run `npm run db:migrate` before
API tests. Do not run `db:migrate:undo` against the normal shared dev database. The Supabase test DB
may be used for targeted rollback/reapply verification only when the owner explicitly directs it and
the migrations being undone are the latest applied migrations.

## Stop Conditions

Stop and report instead of improvising if:

- Phase 1 files/models/migrations are not present.
- Event access behavior conflicts with Phase 1 decisions.
- The archived-event restore target is disputed by owner feedback.
- A required behavior needs a migration.
- A test would require frontend code.
- You are tempted to add company/contact backend code.
- You are tempted to add Plan 3 sponsorship case/assignment behavior.
- You need a new dependency.
- Full validation fails and the failure is outside Phase 2 scope.

## Final Report Required

Report:

- Changed files.
- Tests added.
- Event endpoints implemented.
- Error codes added.
- Commands run with pass/fail result.
- Remaining issues or deferred decisions.
- Confirmation that no client, company/contact API, migrations, or Plan 3 scope were added.

## Prompt Self-Review Notes

- Scope target: canonical Plan 2 Milestone 2 / phased Plan 2 Phase 2 only.
- This prompt depends on Phase 1 and deliberately stops if Phase 1 is not landed.
- This prompt excludes frontend/React skills because Phase 2 is backend-only.
- This prompt keeps authorization centralized in `eventAccessService`.
- This prompt avoids controllers, repositories, generic policy engines, and new dependencies.
- This prompt uses existing API envelopes, Arabic validation messages, `AppError`, and transaction
  plus audit patterns.

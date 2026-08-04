# SponsorSync Implementation Plan 3: Sponsorship Cases, Assignment Conflict Prevention, Interactions, Follow-Ups, Files, and Notifications

This is the third of four sequential implementation plans. Begin only after Plan 2 is accepted and the event, membership, company, and contact modules are stable on `develop`.

This plan implements the core value of SponsorSync. If Plan 3 is incomplete, the product is only an event and company directory. Completion requires a demonstrable workflow in which a leader links a company to an event, assigns it safely, a member records communication and follow-up activity, files are protected, sponsorship values advance through a controlled pipeline, and duplicate contact is prevented by the backend under concurrent requests.

Keep the living sections current. Stop and repair failed validation before moving forward.

## Purpose and Big Picture

At the end of Plan 3, each event can have one sponsorship case per company. A sponsorship case represents that company’s event-specific negotiation and contains its assigned member, status, priority, sponsorship type, requested/offered/approved/received values, follow-up state, and activity history.

A leader can assign or reassign a case. An optional claiming action can allow a member to claim an unassigned case. The database and backend transaction must guarantee that two users cannot successfully claim the same case. Members can work only on cases assigned to them. Leaders and administrators can oversee all cases for events they manage. Supervisors can view but not modify.

Members can record calls, emails, WhatsApp messages, meetings, proposals, and notes; schedule follow-ups; upload files to a private Supabase Storage bucket through the backend; and see upcoming or overdue work. The application creates in-app notifications without depending on an always-running hosted Node server.

## Prerequisites

Preserve the following from Plans 1 and 2:

- Backend authentication and fixed roles
- Event access service
- Events and event memberships
- Companies and contacts
- Audit log service
- API and error conventions
- Sequelize migrations
- React application shell and feature patterns
- Search, pagination, forms, and loading/error components

## Scope

### Included

- Event-company sponsorship cases
- One case per event/company constraint
- Assignment, claiming, reassignment, and assignment history
- Concurrency-safe conflict prevention
- Append-only case status history, and a single exported status-rank module
- Declined reason codes
- Guards preventing user deactivation, event-member removal, or company archive from orphaning
  active sponsorship cases
- Sponsorship status workflow and transition rules
- Financial and in-kind sponsorship values
- Interaction timeline
- Follow-up dates and completion
- Private file uploads and downloads through Supabase Storage
- In-app notifications generated on demand
- Member work queue
- Event sponsorship pipeline UI
- Company sponsorship history
- Audit logging
- Tests, including concurrent assignment test

### Excluded

- External email or WhatsApp sending
- Background jobs that require a permanently hosted backend
- Electronic signatures
- Payment processing
- Sponsor self-service portal
- Analytics dashboards and report exports beyond simple Plan 3 summaries
- AI-generated emails
- Sponsor recommendation algorithm, which belongs to Plan 4

## Ownership

**Plan 3 has one owner: Person 3.** One plan, one person, start to finish. Do not begin until
Plan 2 has passed acceptance and its migrations are applied to the shared dev database — this
plan builds directly on the `events`, `event_members`, and `companies` tables Plan 2 creates.
Plan 4 begins when this one is accepted. See `docs/team-model.md`.

Work on one branch:

    feature/plan3-sponsorship-workflow

Migration numbers `0020`–`0039` are yours.

**This is the largest of the three plans.** Read it end to end before writing anything, and pay
particular attention to the assignment transaction: it is the one place in the system where two
concurrent requests can corrupt state, and it is specified here rather than left to judgement.

### The four areas this plan covers

An earlier draft assigned these to four concurrent people. They are the four concerns **the
single owner must cover**, separated because each carries its own acceptance criteria.

1. **Transactions, security, storage, audit.** The assignment transaction design, file-storage
   service, secure signed-download endpoint, authorization review, and audit-event integrity.
   Every endpoint that changes assignment, approval, received value, or file access belongs
   here. Establish these patterns first — the rest of the plan calls them.
2. **Sponsorship case domain.** Case schema, services, assignment and reassignment rules, status
   transitions, financial and in-kind values, case endpoints, assignment history, company
   sponsorship history, and domain tests.
3. **Pipeline and member work interface.** The event case list or board, filtering, case detail
   layout, assignment controls, status presentation, financial forms, member workload view, and
   responsive behavior. Depends on area 2's endpoints.
4. **Interactions, follow-ups, notifications, attachments.** Interaction schema and API, timeline
   UI, follow-up logic, member task list, notification records and UI, attachment metadata,
   upload forms, and related tests.

## Domain Model

### Sponsorship case

A sponsorship case is the unique relationship between one event and one company. It is the central operational record.

### Assignment

Assignment identifies the PR member responsible for the case. Assignment is not the same as event membership. A user must be an active event member with global role MEMBER before being assigned.

### Interaction

An interaction is an immutable historical activity entry, such as a call, email, meeting, proposal sent, or internal note. Corrections may be supported through an audited edit, but the preferred model is append-oriented history.

### Follow-up

A follow-up is a task connected to a sponsorship case, usually created from an interaction. It has a due date and completion state. Use a dedicated table rather than only a `next_follow_up_at` field so history and multiple tasks are not lost.

### Attachment

An attachment is metadata in PostgreSQL linked to an object stored in a private Supabase Storage bucket. The frontend never receives a service-role key.

## Database Additions

### `sponsorship_cases`

Required columns:

- `id`: UUID primary key
- `event_id`: required UUID referencing `events.id`
- `company_id`: required UUID referencing `companies.id`
- `assigned_member_id`: nullable UUID referencing `users.id`
- `package_id`: nullable UUID referencing `sponsorship_packages.id` — the tier this company was
  offered, when the ask matches one of the event's packages. Nullable because a bespoke ask is
  normal. **Copy, do not join, for money:** set `requested_amount` from the package at selection
  time and store it on the case. A leader editing the package price later must not silently
  rewrite what a sponsor was historically asked for.
- `status`: constrained value listed below
- `declined_reason`: nullable constrained value — `NO_RESPONSE`, `NO_BUDGET`, `TIMING`,
  `NOT_RELEVANT`, `SPONSORING_COMPETITOR`, `INTERNAL_POLICY`, or `OTHER`
- `declined_note`: nullable text, free-form detail
- `priority`: `LOW`, `MEDIUM`, or `HIGH`
- `sponsorship_type`: `FINANCIAL`, `IN_KIND`, or `MIXED`
- `requested_amount`: numeric(14,2), default zero, non-negative
- `offered_amount`: numeric(14,2), default zero, non-negative
- `approved_amount`: numeric(14,2), default zero, non-negative
- `received_amount`: numeric(14,2), default zero, non-negative
- `in_kind_description`: nullable text
- `estimated_in_kind_value`: numeric(14,2), default zero, non-negative
- `last_activity_at`: nullable timestamp
- `created_by`: required UUID referencing `users.id`
- `archived_at`: nullable timestamp
- `created_at`
- `updated_at`

Constraints and indexes:

- Unique `(event_id, company_id)`.
- Index event/status, event/assigned member, assigned member/status, and last activity.
- Monetary checks prevent negative values.
- `received_amount` must not exceed `approved_amount` unless a documented override workflow exists. The recommended MVP rejects it.
- `approved_amount` should not exceed `offered_amount` unless the leader provides an override reason. The service can enforce this semantic rule.
- In-kind or mixed cases require an in-kind description before approval.
- `declined_reason` is **required** when moving to `DECLINED` and must be null otherwise.
  Enforce in the service; a CHECK constraint tying it to `status` is acceptable but the service
  is the authority. Every CRM surveyed treats a lost deal as a terminal state with a required
  _enumerated_ reason rather than free text, because "why do we lose sponsors" is the question
  the data is for — and free text cannot be grouped. `NO_RESPONSE` is listed first deliberately:
  a target list is built expecting most companies never to reply, and a ghost is not a rejection.
- `package_id`, when set, must belong to the same event as the case.

### `assignment_history`

Required columns:

- `id`
- `sponsorship_case_id`
- `previous_member_id`: nullable
- `new_member_id`: nullable
- `changed_by`: required user
- `change_type`: `ASSIGNED`, `CLAIMED`, `REASSIGNED`, or `UNASSIGNED`
- `reason`: nullable for first assignment, required for reassignment or unassignment
- `created_at`

This table is append-only through application behavior.

### `case_status_history`

**This table is not optional, and it is the one addition Plan 4 cannot be built without.**

`sponsorship_cases.status` holds only the _current_ value. Plan 4 specifies five metrics that
need to know **when** a status was reached, or **what it was before**:

| Plan 4 metric                                      | What it needs                                    |
| -------------------------------------------------- | ------------------------------------------------ |
| `approvedSponsors` — "or closed after approval"    | the status before `CLOSED`                       |
| `declinedCases` — "closed with a declined outcome" | the status before `CLOSED`                       |
| Average days from case creation to first contact   | the timestamp of → `CONTACTED`                   |
| Average days from first contact to approval        | the timestamps of → `CONTACTED` and → `APPROVED` |
| Any "how long did we sit in negotiation" view      | time between transitions                         |

None of that is recoverable from a single current-status column, and interactions are not a
substitute: an interaction records that somebody made a call, not that the case advanced.
Writing this row costs one insert inside a transaction that already exists.

Required columns:

- `id`
- `sponsorship_case_id`
- `from_status`: nullable — null for the row recording case creation
- `to_status`: required
- `changed_by`: required user
- `reason`: nullable; **required** when the transition is a reopen from `DECLINED` or `CLOSED`,
  and when moving to `DECLINED` carry the same reason recorded on the case
- `created_at`

Indexes:

- `(sponsorship_case_id, created_at)`
- `(to_status, created_at)` — Plan 4 aggregates across all cases by target status

Rules:

- Append-only through application behaviour, exactly like `assignment_history`.
- Written in the **same transaction** as the status change. A status change that commits without
  its history row is a silent data loss, and it is invisible until Plan 4 tries to compute an
  average months later.
- Insert one row at case creation (`from_status` null, `to_status` the initial status) so
  "days from creation to first contact" has a start point that does not depend on `created_at`
  semantics.

### Status ordering

Plan 4 asks for cases "at or beyond `CONTACTED`". The fourteen statuses below are a **branching
graph, not a scale** — `DECLINED` and `CLOSED` have no natural position in a progression, and
"beyond" is undefined without an explicit answer.

Export one module, owned here because Plan 3 owns the status model:

    // server/src/constants/caseStatus.js
    export const CASE_STATUS_RANK = { NOT_CONTACTED: 0, CONTACTED: 1, ... }
    export const TERMINAL_STATUSES = ['DECLINED', 'CLOSED']

Give every pipeline status an integer rank in pipeline order, and give the terminal statuses a
rank of `null` rather than a high number — a declined case is not "further along" than a
contacted one, and giving it rank 99 silently inflates every "at or beyond" count.

Plan 4 must import this module rather than redefine the ordering. Two definitions of "contacted"
that disagree is exactly how a dashboard ends up contradicting the pipeline board on the same
screen.

### `interactions`

Required columns:

- `id`
- `sponsorship_case_id`
- `created_by`
- `interaction_type`: `CALL`, `EMAIL`, `WHATSAPP`, `MEETING`, `PROPOSAL_SENT`, `FOLLOW_UP`, `COMPANY_RESPONSE`, `INTERNAL_NOTE`, `CONTRACT_DISCUSSION`, or `OTHER`
- `occurred_at`: required timestamp
- `notes`: required text
- `result`: nullable text
- `contact_id`: nullable UUID referencing `company_contacts.id`
- `created_at`
- `updated_at`

Rules:

- Contact, when provided, must belong to the same company as the sponsorship case.
- Members may create interactions only on their assigned active cases.
- Interactions should not be hard-deleted. If editing is allowed, audit it.
- Update sponsorship case `last_activity_at` when an interaction is created.

### `follow_ups`

Required columns:

- `id`
- `sponsorship_case_id`
- `assigned_to`: required member user
- `created_by`
- `source_interaction_id`: nullable
- `title`
- `description`: nullable
- `due_at`
- `status`: `PENDING`, `COMPLETED`, or `CANCELLED`
- `completed_at`: nullable
- `completed_by`: nullable
- `created_at`
- `updated_at`

Indexes:

- assigned user/status/due date
- case/status

Rules:

- Only the assigned case member, event leader, or admin can be assigned a follow-up; recommended MVP assigns the case member.
- Completing sets `completed_at` and `completed_by` transactionally.
- Overdue is derived: status is PENDING and due date is earlier than current time. Do not store a drifting `OVERDUE` status.

### `attachments`

Required columns:

- `id`
- `sponsorship_case_id`
- `interaction_id`: nullable
- `uploaded_by`
- `original_file_name`
- `storage_path`: unique
- `mime_type`
- `size_bytes`
- `category`: `PROPOSAL`, `CONTRACT`, `INVOICE`, `PAYMENT_PROOF`, `COMPANY_PROFILE`, `MEETING_DOCUMENT`, or `OTHER`
- `access_level`: `CASE_TEAM`, `LEADER_ONLY`, or `ADMIN_ONLY`
- `created_at`

Rules:

- Store no binary data in PostgreSQL.
- Storage paths must be generated by the backend, not trusted from the client.
- Use a private bucket such as `sponsorship-files`.
- Files are not publicly readable.

### `notifications`

Required columns:

- `id`
- `user_id`
- `type`
- `title`
- `message`
- `related_entity_type`
- `related_entity_id`
- `dedupe_key`: nullable unique key for generated reminders
- `is_read`: boolean default false
- `read_at`: nullable
- `created_at`

Notification types include:

- `CASE_ASSIGNED`
- `CASE_REASSIGNED`
- `FOLLOW_UP_DUE_SOON`
- `FOLLOW_UP_OVERDUE`
- `SPONSORSHIP_APPROVED`
- `CONTRACT_UPLOADED`
- `ASSIGNMENT_CONFLICT`

## Sponsorship Status Workflow

Use these statuses:

1. `UNASSIGNED`
2. `ASSIGNED`
3. `NOT_CONTACTED`
4. `CONTACTED`
5. `WAITING_RESPONSE`
6. `FOLLOW_UP_REQUIRED`
7. `PROPOSAL_SENT`
8. `NEGOTIATION`
9. `PENDING_APPROVAL`
10. `APPROVED`
11. `CONTRACT_SIGNED`
12. `CONTRIBUTION_RECEIVED`
13. `DECLINED`
14. `CLOSED`

The database stores the current status. The service enforces transitions.

**Every transition writes a `case_status_history` row in the same transaction as the status
change**, and a move to `DECLINED` additionally requires a `declined_reason`. A status change
that commits without its history row destroys data Plan 4 depends on, and the loss is invisible
until Plan 4 tries to compute an average months later — so test the pairing, not just the
status update.

Recommended transition matrix:

- `UNASSIGNED` -> `ASSIGNED`
- `ASSIGNED` -> `NOT_CONTACTED`, `UNASSIGNED`
- `NOT_CONTACTED` -> `CONTACTED`, `DECLINED`, `CLOSED`
- `CONTACTED` -> `WAITING_RESPONSE`, `FOLLOW_UP_REQUIRED`, `PROPOSAL_SENT`, `DECLINED`
- `WAITING_RESPONSE` -> `FOLLOW_UP_REQUIRED`, `PROPOSAL_SENT`, `NEGOTIATION`, `DECLINED`
- `FOLLOW_UP_REQUIRED` -> `CONTACTED`, `WAITING_RESPONSE`, `PROPOSAL_SENT`, `DECLINED`
- `PROPOSAL_SENT` -> `WAITING_RESPONSE`, `NEGOTIATION`, `PENDING_APPROVAL`, `DECLINED`
- `NEGOTIATION` -> `PENDING_APPROVAL`, `APPROVED`, `DECLINED`
- `PENDING_APPROVAL` -> `APPROVED`, `NEGOTIATION`, `DECLINED`
- `APPROVED` -> `CONTRACT_SIGNED`, `CLOSED`
- `CONTRACT_SIGNED` -> `CONTRIBUTION_RECEIVED`, `CLOSED`
- `CONTRIBUTION_RECEIVED` -> `CLOSED`
- `DECLINED` -> `CLOSED`; reopening is Leader/Admin only with a reason
- `CLOSED` -> no normal transition; reopen is Leader/Admin only with a reason

Do not force every event to use every status in the interface. Display a filtered useful pipeline while retaining the explicit state model.

## Sponsorship Case API

### Add company to event

    POST /api/events/:eventId/sponsorship-cases

Input:

    {
      "companyId": "uuid",
      "priority": "MEDIUM",
      "sponsorshipType": "FINANCIAL",
      "requestedAmount": "5000.00",
      "inKindDescription": null
    }

Allowed: Admin or event leader.

Rules:

- Event must be accessible and not archived/cancelled.
- Company must be active.
- Unique event/company constraint rejects duplicates with HTTP 409.
- Initial status is `UNASSIGNED` unless an assignment is included through an explicitly transactional endpoint.
- Audit creation.

### List event cases

    GET /api/events/:eventId/sponsorship-cases?page=&pageSize=&search=&status=&priority=&assignedMemberId=

Access:

- Admin and event leader see all.
- Event supervisor sees all read-only.
- Event member sees only assigned cases, unless the product decision permits unassigned claimable cases. Recommended: members may also view a limited unassigned queue without private contacts until claimed.

Return safe company summary, assigned member, current status, amount summary, last activity, next pending follow-up, and permission flags.

### Read case detail

    GET /api/sponsorship-cases/:caseId

Return:

- Case fields
- Event summary
- Company and permitted contacts
- Assignment history
- Interactions
- Pending/completed follow-ups
- Attachment metadata according to access level
- Permission flags

### Update case metadata

    PATCH /api/sponsorship-cases/:caseId

Allowed fields depend on role and state. Leader/Admin can update priority, type, request values, and in-kind description. Assigned member may update limited operational fields but not approved/received amounts.

### Change status

    POST /api/sponsorship-cases/:caseId/status

Input:

    {
      "status": "PROPOSAL_SENT",
      "reason": "Proposal emailed to the primary contact"
    }

Rules:

- Validate transition.
- Assigned member can perform operational transitions on their case.
- Only Leader/Admin can set `APPROVED`, `CONTRACT_SIGNED`, `CONTRIBUTION_RECEIVED`, reopen `DECLINED`, or reopen `CLOSED`.
- Approval requires appropriate amount or in-kind details.
- Contribution received requires contract signed or an explicit Leader/Admin override reason.
- Audit status change.
- Add a system interaction or status-history audit entry so the timeline can display the transition.

### Update financial values

Use a focused endpoint:

    PATCH /api/sponsorship-cases/:caseId/financials

Fields:

- requested amount
- offered amount
- approved amount
- received amount
- estimated in-kind value
- override reason where required

Permissions:

- Assigned member may update requested and offered values if the event leader allows it; recommended MVP permits requested/offered only.
- Leader/Admin controls approved and received values.
- Supervisor read-only.

## Assignment and Conflict Prevention

### Assign

    POST /api/sponsorship-cases/:caseId/assign

Input:

    {
      "memberId": "uuid"
    }

Allowed: Admin or event leader.

The service transaction must:

1. Lock or atomically update the case.
2. Confirm the target member is active, has global role MEMBER, and is an active member of the same event.
3. Confirm the case is not archived.
4. Assign the member.
5. Move status from `UNASSIGNED` to `ASSIGNED` when appropriate.
6. Insert assignment history.
7. Insert audit log.
8. Insert notification for the assigned member.
9. Commit all or nothing.

### Claim unassigned case

    POST /api/sponsorship-cases/:caseId/claim

Allowed: Active MEMBER belonging to the event.

Implement with a single atomic condition, not a read-then-write race. With Sequelize, one acceptable approach is an `UPDATE` whose `WHERE` includes `id = caseId` and `assigned_member_id IS NULL`, executed inside a transaction. Exactly one concurrent caller should observe one updated row. The loser receives HTTP 409 `SPONSORSHIP_CASE_ALREADY_ASSIGNED`.

The transaction then records history, audit, and notification. If side-effect inserts fail, roll back the assignment.

### Reassign or unassign

    POST /api/sponsorship-cases/:caseId/reassign

Input:

    {
      "memberId": "new uuid or null",
      "reason": "Required explanation"
    }

Allowed: Admin or event leader.

Rules:

- Require reason.
- Preserve prior interactions and follow-ups.
- Pending follow-ups should be reassigned to the new member or cancelled according to an explicit documented rule. Recommended: reassign pending follow-ups to the new case owner and record the change.
- Notify previous and new members.
- Audit all before/after values.

### Guards against orphaning owned records

Once sponsorship cases exist, three earlier operations can strand them. All three answer the
same question — _what happens to the records a person or company owns when that person or
company goes away_ — and the answer is always the same shape: **block, name what is blocking,
require an explicit reassignment.** Never silently orphan a record, and never cascade-delete one.

**1. Event member removal.** Modify the Plan 2 removal service:

- If a member owns active sponsorship cases, reject removal with HTTP 409
  `EVENT_MEMBER_HAS_ACTIVE_CASES` and list the number of cases requiring reassignment.
- After cases are reassigned or closed, removal may proceed.

**2. Global user deactivation.** Modify the Plan 1 service behind `PATCH /api/users/:id/status`.

Event membership is per-event; deactivation is global, so the guard above does not fire. A user
deactivated while holding assigned cases leaves those cases pointing at an account that can no
longer log in — invisible on the users page and only discovered when someone asks why a case has
gone quiet. Reject with HTTP 409 `USER_HAS_ACTIVE_CASES`, returning the count and the events
involved. (Plan 2 adds the sibling guard for a user who leads active events.)

**3. Company archive.** Modify the Plan 2 archive service.

Plan 2 defines company archiving before sponsorship cases exist, so its rule — "archived
companies cannot be newly selected for events later" — only considers _future_ selection.
Archiving a company that is mid-negotiation right now silently removes it from the directory
underneath a live case. Reject with HTTP 409 `COMPANY_HAS_ACTIVE_CASES`, listing the events.
Archiving is still allowed once every case for that company is `DECLINED` or `CLOSED`, which is
the normal end-of-relationship path.

## Interaction API

    GET  /api/sponsorship-cases/:caseId/interactions
    POST /api/sponsorship-cases/:caseId/interactions
    PATCH /api/interactions/:interactionId

Create input includes type, occurred time, notes, result, optional company contact, and optional follow-up request.

Creation should use a transaction to:

1. Validate case access and assignment.
2. Validate contact ownership.
3. Create the interaction.
4. Update `last_activity_at`.
5. Optionally create a follow-up.
6. Optionally change status only if the requested transition is valid.
7. Audit significant activity.

Editing interactions should be limited. Recommended MVP: creator may edit notes/result within 24 hours while Leader/Admin may edit later with an audit reason. Never hard-delete interactions through normal UI.

## Follow-Up API

    GET   /api/follow-ups?scope=mine&status=PENDING&from=&to=
    POST  /api/sponsorship-cases/:caseId/follow-ups
    PATCH /api/follow-ups/:followUpId
    POST  /api/follow-ups/:followUpId/complete
    POST  /api/follow-ups/:followUpId/cancel

Member work queue must provide:

- Due today
- Upcoming
- Overdue
- Completed history

Completion rules:

- Assigned member, event leader, or Admin may complete.
- Record completion user and time.
- Optionally create a `FOLLOW_UP` interaction from completion notes.

## Notification Generation Without Hosted Background Jobs

Because the Node backend may run only on developers’ machines, do not depend solely on cron.

Implement an idempotent service such as:

    notificationService.syncDueFollowUpNotifications(userId)

Call it when:

- User logs in
- User loads notification center
- User loads their follow-up queue

For each pending follow-up:

- Create one due-soon notification for a configured window, such as 24 hours, using a deterministic dedupe key.
- Create one overdue notification when due date passes, using a deterministic dedupe key.
- Repeated sync calls must not create duplicates.

Provide endpoints:

    GET   /api/notifications
    PATCH /api/notifications/:id/read
    POST  /api/notifications/read-all

## Supabase Storage Through Backend

Create one private bucket through documented setup. Store bucket name in `SUPABASE_STORAGE_BUCKET`.

Backend environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

The service-role key is server-only and never appears in `client/.env`, API output, logs, screenshots, or Git history.

### Upload endpoint

    POST /api/sponsorship-cases/:caseId/attachments

Use multipart form data. The backend must:

1. Authenticate and authorize case access.
2. Enforce role and access-level rules.
3. Validate category, MIME type, extension, and maximum size.
4. Sanitize the original name for display only.
5. Generate an opaque storage path, for example `eventId/caseId/uuid.extension`.
6. Upload bytes to the private bucket.
7. Insert attachment metadata in PostgreSQL.
8. If metadata insert fails, attempt to delete the uploaded object.
9. Audit the upload.

Recommended MVP size limit: 10 MB. Allow PDF and common office/image types needed for proposals and contracts. Reject executables, HTML, scripts, and unknown binary types.

### Download endpoint

    GET /api/attachments/:attachmentId/download

The backend must:

1. Load metadata.
2. Confirm user access to the sponsorship case.
3. Enforce `CASE_TEAM`, `LEADER_ONLY`, or `ADMIN_ONLY`.
4. Generate a short-lived signed URL or stream the file.
5. Return no service credential.

### Delete/archive attachment

Prefer metadata archive plus storage deletion by Admin/Leader with audit. If deletion fails after metadata change, record a recoverable error. Do not allow ordinary members to delete contracts or payment proof.

## Frontend Structure

Add routes:

- `/app/events/:eventId/sponsors`
- `/app/events/:eventId/sponsors/new`
- `/app/sponsorship-cases/:caseId`
- `/app/my-work`
- `/app/notifications`

### Event sponsor pipeline

Provide list or board modes. For scope control, a table/list with status grouping is sufficient; a drag-and-drop Kanban board is optional and must not replace accessible controls.

Show:

- Company
- Assigned member
- Status
- Priority
- Sponsorship type
- Requested/approved/received values
- Last activity
- Next follow-up
- Conflict or overdue indicators

Filters:

- Status
- Assigned member
- Priority
- Sector
- Search company

### Case creation

Leader selects an active company from the reusable directory and adds it to the event. If the case already exists, show the existing case link from the 409 response.

### Case detail page

Sections:

- Header and status
- Company and contact information
- Assignment and history
- Financial and in-kind values
- Interaction timeline
- Follow-ups
- Attachments
- Audit-aware status actions

### Member work page

Show:

- Assigned active cases
- Due today follow-ups
- Overdue follow-ups
- Recently active cases
- Unassigned claimable queue only if enabled

### Notification center

Show unread/read state, related-record navigation, mark read, and mark all read.

## Milestone 1: Add Core Sponsorship Schema

Create migrations and models for sponsorship cases and assignment history. Add associations and constraints.

Acceptance:

- Same company cannot be added twice to one event.
- Same company can be added to different events.
- Negative monetary values fail.
- Assignment history references valid cases and users.

## Milestone 2: Implement Case Creation, Listing, Detail, and Access

Build case access helpers that combine event access and assignment scope.

Acceptance:

- Leader/Admin can add companies to events.
- Member sees only assigned cases and explicitly allowed unassigned queue data.
- Supervisor sees all event cases read-only.
- Unrelated users receive 404.

## Milestone 3: Implement Atomic Assignment and Concurrency Test

Build assign, claim, reassign, unassign, history, notifications, and audit logic.

Create an automated concurrency test that launches two claim requests against the same unassigned case at nearly the same time. Expected result:

- One response succeeds.
- One response is HTTP 409.
- Case has exactly one assigned member.
- Assignment history contains exactly one successful claim entry.
- No partial duplicate notifications or audit entries exist.

Do not accept a test that only calls the endpoint sequentially.

## Milestone 4: Implement Sponsorship Status and Financial Rules

Create transition service, status endpoint, financial endpoint, and UI controls. Return available transitions to the frontend based on role and current state, but validate again on the backend.

Acceptance:

- Invalid transitions return 422.
- Member cannot approve or record received funds.
- Leader can approve with required values.
- Received amount cannot exceed approved amount.
- In-kind approval requires description.
- Every sensitive change is audited.

## Milestone 5: Implement Interactions and Follow-Ups

Create migrations, services, endpoints, timeline, follow-up queue, completion flow, and tests.

Acceptance:

- Assigned member records an interaction.
- Contact belongs to the same company.
- Case last activity updates.
- Follow-up appears in the member queue.
- Completing follow-up records actor and timestamp.
- Overdue calculation is derived correctly around UTC boundaries.

## Milestone 6: Implement Private Attachments

Create bucket setup documentation, storage service, metadata migration, upload/download endpoints, access-level enforcement, cleanup behavior, and UI.

Acceptance:

- Valid file uploads through backend.
- Direct public URL is unavailable.
- Authorized download works through short-lived access.
- Unauthorized member cannot download leader-only contract.
- Oversized or disallowed file is rejected before storage metadata is committed.
- Service key never reaches frontend.

## Milestone 7: Implement Notifications

Create notification migration, service, due-follow-up synchronization, endpoints, unread badge, and notification center.

Acceptance:

- Assignment creates one notification.
- Reassignment notifies affected users.
- Repeated reminder synchronization does not duplicate notifications.
- Read state persists.
- Related links open authorized pages.

## Milestone 8: Complete the Core SponsorSync Demo Workflow

Required end-to-end scenario:

1. Leader creates or opens an active event with members.
2. Leader adds an existing company as a sponsorship case.
3. A duplicate add returns the existing case conflict.
4. Leader assigns the case to Member A.
5. Member B cannot edit or contact the case.
6. Two concurrent claim attempts on another unassigned case produce one winner.
7. Member A records a call and schedules a follow-up.
8. Member A moves the case to waiting response, then proposal sent.
9. Member A uploads a proposal with case-team access.
10. Leader records offered and approved values and moves the case to approved.
11. Leader uploads a leader-only contract.
12. Member A cannot download the leader-only contract unless policy grants access.
13. Follow-up becomes due and one notification appears without duplication.
14. Leader reassigns a different case with a reason and history is preserved.
15. Company detail displays event sponsorship history.

## Required Tests

### Assignment and access

- Unique event/company
- Assign target membership validation
- Concurrent claim
- Reassign reason
- Event-member removal conflict
- Member case isolation
- Supervisor read-only

### Status and financials

- Every allowed transition
- Representative forbidden transitions
- Role restrictions
- Numeric boundaries
- In-kind requirements
- Audit entries

### Interactions and follow-ups

- Contact-company validation
- Timeline ordering
- Edit window or audit behavior
- Due, upcoming, and overdue queries
- Complete and cancel permissions
- Reassignment of pending follow-ups

### Files

- MIME and size validation
- Storage failure rollback
- Metadata failure cleanup
- Access levels
- Signed download expiration behavior where practical

### Notifications

- Dedupe keys
- Due-soon and overdue generation
- Read and read-all
- Assignment and status notifications

## Required Commands

    npm run lint
    npm run format:check
    npm run test
    npm run build
    npm run db:migrate
    npm run dev

Add a focused command for the concurrency test if useful, such as:

    npm run test:concurrency

## Validation and Acceptance

Plan 3 is accepted only when:

- One sponsorship case exists per event/company.
- Assignment and claim operations are atomic.
- A real concurrent test proves only one claimant succeeds.
- Case access is correctly scoped.
- Sponsorship statuses follow a validated workflow.
- Financial and in-kind fields have clear meanings and permissions.
- Interactions form a readable history.
- Follow-ups produce useful work queues.
- Files are private and accessed only through authorized backend logic.
- Notifications work without an always-hosted scheduler.
- Audit and assignment history are complete.
- The core demo workflow passes through the UI.
- Tests, lint, and build pass.

## Idempotence and Recovery

- Duplicate case creation returns the existing case conflict and creates no duplicate.
- Notification sync is idempotent through dedupe keys.
- Mark-read and complete-follow-up actions are safe to retry.
- Upload service must delete the object when metadata creation fails.
- If storage deletion fails, record a recoverable state for manual cleanup rather than hiding the failure.
- Never edit assignment history or audit history to “fix” a demo; create a corrective action.
- If a status change and related side effects fail, roll back the entire transaction.

## Handoff to Plan 4

Provide:

- Stable status transition matrix
- **The `CASE_STATUS_RANK` module**, which Plan 4 imports rather than redefining, and the rule
  that terminal statuses rank `null` rather than high
- **Confirmation that `case_status_history` is populated for every transition**, including the
  creation row — Plan 4's date-difference metrics are unbuildable without it, so verify with a
  real query before declaring this plan accepted, not by reading the service code
- `declined_reason` values, so Plan 4 can report why sponsors are lost
- Case and financial field definitions
- Assignment transaction explanation and test evidence
- Dashboard-ready query fields
- Interaction and follow-up semantics
- Attachment access model
- Notification behavior
- Latest migrations
- Demo seed requirements
- Known performance issues or missing indexes

## Progress

- [ ] Sponsorship case and assignment migrations verified.
- [ ] Case access and CRUD implemented.
- [ ] Atomic assign, claim, and reassign implemented.
- [ ] Concurrent claim test passes.
- [ ] Status workflow implemented and tested.
- [ ] Financial and in-kind rules implemented and tested.
- [ ] Interactions implemented and tested.
- [ ] Follow-ups implemented and tested.
- [ ] Private attachments implemented and tested.
- [ ] Notifications implemented and deduplicated.
- [ ] Plan 3 end-to-end workflow passed.

## Surprises and Discoveries

- Observation:
  Evidence:

## Decision Log

- Decision: Add `case_status_history`, append-only, written in the same transaction as every
  status change.
  Rationale: `sponsorship_cases.status` holds only the current value, but Plan 4 specifies five
  metrics that need to know when a status was reached or what preceded it - "closed after
  approval", "days from creation to first contact", "days from first contact to approval". None is
  recoverable from a single column, and interactions are not a substitute: an interaction records
  that somebody made a call, not that the case advanced. Plan 4 was unbuildable as written without
  this. Cost is one insert inside a transaction that already exists.
  Date/Author: 2026-07-25, Person 1 (pre-handoff system review).

- Decision: Status ordering lives in one exported `CASE_STATUS_RANK` module owned by Plan 3, with
  terminal statuses ranked null.
  Rationale: The fourteen statuses are a branching graph, not a scale, so Plan 4's "at or beyond
  CONTACTED" is undefined without an explicit answer. Ranking DECLINED high would silently inflate
  every "at or beyond" count. Two definitions of contacted that disagree is how a dashboard ends up
  contradicting the pipeline board on the same screen.
  Date/Author: 2026-07-25, Person 1 (pre-handoff system review).

- Decision: A declined case requires an enumerated reason, with `NO_RESPONSE` as a first-class
  value.
  Rationale: Every CRM surveyed treats a lost deal as a terminal state with a required enumerated
  reason; omitting it is the standard way a project loses the ability to answer "why do we lose
  sponsors", because free text cannot be grouped. A target list is built expecting most companies
  never to reply, and a ghost is a different problem from a rejection.
  Date/Author: 2026-07-25, Person 1 (pre-handoff system review).

- Decision: Extend three earlier services with orphan guards - global user deactivation, and
  company archive, alongside the event-member removal rule already specified.
  Rationale: All three answer one question: what happens to the records a person or company owns
  when they go away. Plan 2 defines company archiving before cases exist, so its rule only
  considers future selection; and event membership is per-event while deactivation is global, so
  the member guard never fires for it. Blocking with a named reason beats silently orphaning a
  live case.
  Date/Author: 2026-07-25, Person 1 (pre-handoff system review).

- Decision: Use a dedicated sponsorship case as the event-company relationship.
  Rationale: Permanent company identity must remain reusable while each event keeps independent assignment, status, amount, and interaction history.
  Date/Author: Initial product design.

- Decision: Generate follow-up reminders on demand with dedupe keys.
  Rationale: The graduation workflow does not include a permanently hosted Node server, so reminders must remain correct when the backend runs locally.
  Date/Author: Initial architecture decision.

## Outcomes and Retrospective

Complete at Plan 3 finish. State whether SponsorSync now solves duplicate contact and follow-up loss, include concurrency evidence, list remaining gaps, and prepare Plan 4 analytics assumptions.

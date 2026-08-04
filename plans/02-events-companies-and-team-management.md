# SponsorSync Implementation Plan 2: Events, Event Teams, Companies, Contacts, and Reusable Sponsorship Data

This is the second of four sequential implementation plans. Begin only after Plan 1 has passed its acceptance scenario, its migrations are applied to the shared Supabase development database, and the authentication and user-management foundation is merged into `develop`.

This plan is a living execution document. Keep **Progress**, **Surprises and Discoveries**, **Decision Log**, and **Outcomes and Retrospective** accurate throughout implementation. The plan must end with a complete user-visible workflow, not disconnected CRUD endpoints.

## Purpose and Big Picture

At the end of Plan 2, a PR leader will be able to create an event, define its sponsorship target and deadline, add members and supervisors to the event, and maintain a reusable company directory with multiple contact people. Team members and supervisors will see only the events available to them. Leaders will be able to select companies for later sponsorship work without duplicating permanent company records for every event.

This plan establishes the two sides of SponsorSync that all sponsorship work depends on: events and companies. It deliberately stops before implementing sponsor assignment and interaction tracking; those workflows belong to Plan 3.

## Prerequisites from Plan 1

The executing agent must first inspect and preserve:

- Root `AGENTS.md` and `.agent/PLANS.md`
- Root npm scripts
- Express route, service, middleware, validation, and error patterns (there is no controllers/ layer — see docs/architecture.md)
- Sequelize migration conventions
- Auth cookie behavior
- `authenticate` and `authorizeRoles` middleware
- `users` and `audit_logs` models
- React auth provider, application shell, routing, API client, form components, and table components
- Standard API response and error format

Do not rebuild or replace the Plan 1 foundation. When a defect is found, repair it in a focused commit and record it in this plan.

## Scope

### Included

- Event database model and lifecycle
- Event team membership
- Leader ownership and supervisor/member access
- Event CRUD and archive behavior
- Event target, date, deadline, category, location, target sectors, and target cities
- Event sponsorship packages (tiers) with names, amounts, and listed benefits
- Event leadership transfer, and a guard preventing deactivation of a user who leads active events
- Company directory
- Multiple contacts per company
- Company normalization and duplicate warnings
- Company search, filtering, pagination, archive behavior, and history placeholder
- Event and company frontend pages
- Role-scoped backend queries
- Audit logs for important event, membership, company, and contact actions
- Tests and complete acceptance scenario

### Excluded

- Adding a company to an event as a sponsorship case
- Assigning companies to members
- Sponsorship statuses and financial offers
- Interaction timeline and follow-ups
- Attachments
- Notifications
- Analytics and reports
- Automatic AI company matching

## Ownership

**Plan 2 has one owner: Person 2.** One plan, one person, start to finish — schema, backend,
frontend, and tests. Plan 3 does not begin until this plan passes acceptance, at which point
Person 3 picks it up. See `docs/team-model.md`.

Work on one branch:

    feature/plan2-events-companies

Migration numbers `0008`–`0019` are yours; the whole range, since nobody else is writing
migrations while this plan is open.

### The four areas this plan covers

An earlier draft assigned these to four different people working at the same time. They are not
four people — they are the four concerns **the single owner must cover**, and they are listed
separately because each one has its own acceptance criteria and is easy to leave half-done.

1. **Data and access.** Migrations for event access relationships, model associations,
   role-scoped queries, audit logging, and the shared ownership helper the event and company
   modules both call. Build this first: areas 2 and 3 depend on it.
2. **Events and event teams.** The complete event module — leader ownership, member and
   supervisor assignment, target settings, event lifecycle, event overview — from migration
   through endpoints, pages, and tests.
3. **Companies and contacts.** The complete company directory and contact module — normalized
   values, duplicate warnings, filters, archive rules, reusable history structure — likewise
   end to end. Depends on area 1's schema but not on area 2, so it can follow immediately.
4. **Cross-module quality.** Integration tests, shared search and pagination behavior,
   empty/loading/error states, responsive review, API documentation, and the end-to-end Plan 2
   scenario. **Do not save this for the end.** It was written as a separate person's job
   precisely because it is the part that gets skipped under time pressure; with one owner, that
   risk is higher, not lower. Write each module's tests and acceptance fixtures as that module
   is built.

## Domain Definitions

### Event

An event is the university activity, conference, competition, ceremony, or campaign for which the PR team seeks sponsorship. It contains the financial goal and team context but does not itself represent a company negotiation.

### Company

A company is a reusable organization record. The same company may be considered for many events over time. Permanent company information must not be copied into each event.

### Company contact

A company contact is a person working at or representing a company. A company can have multiple contacts. A contact belongs to one company.

### Event membership

Event membership grants an existing SponsorSync user access to one event. Global role controls what kind of actions the person may perform; event membership controls which event they may access.

## Access Model

Keep fixed global roles from Plan 1.

### Admin

- Can view and manage all events.
- Can manage all event memberships.
- Can view and manage all companies and contacts.
- Can access archived records.

### Leader

- Can create events.
- Becomes the `leader_id` of events they create unless an admin explicitly creates an event for another active leader.
- Can read and update events they lead.
- Can archive events they lead.
- Can add active `MEMBER` and `SUPERVISOR` users to events they lead.
- Can remove event members subject to later data-integrity rules.
- Can create and manage companies and contacts.

### Member

- Can list and view events where they have an active event membership.
- Cannot create, update, archive, or delete events.
- Can view company directory records required for PR work.
- Cannot archive companies or contacts.
- Company edit permission should be conservative in Plan 2: members may suggest or create a company only if the agreed role matrix allows it. The recommended scope is read-only for members until Plan 3 assigns a sponsorship case.

### Supervisor

- Can list and view events where they have an active event membership.
- Has read-only event and company access.
- Cannot modify events, memberships, companies, or contacts.

### Resource hiding

For a user without access to a specific event, prefer a 404 response rather than revealing that the event exists through a 403. Use 403 when the user may know the resource but lacks permission for an operation, such as a member attempting to edit an event they can view.

## Database Additions

Create separate reversible migrations. Coordinate migration order to avoid two branches creating conflicting associations.

### `events`

Required columns:

- `id`: UUID primary key
- `name`: required string
- `description`: nullable text
- `category`: required string; use a controlled application list but allow safe expansion without a database migration
- `event_date`: required date or timestamp, with the chosen semantics documented
- `location`: nullable string
- `financial_target`: numeric with two decimal places, required, default zero, non-negative
- `sponsorship_deadline`: nullable date
- `target_sectors`: JSONB array of normalized sector strings, default empty array
- `target_cities`: JSONB array of normalized city strings, default empty array
- `status`: constrained value `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`, or `ARCHIVED`
- `leader_id`: required UUID referencing `users.id`
- `created_by`: required UUID referencing `users.id`
- `archived_at`: nullable timestamp
- `created_at`
- `updated_at`

Constraints and indexes:

- Financial target must be non-negative.
- Deadline should not be nonsensically after the event date unless the product decision explicitly allows post-event sponsorship collection. The recommended validation is deadline on or before event date.
- Index `leader_id`, `status`, `event_date`, and `archived_at`.
- Do not hard-delete events that have or may later have sponsorship history.

### `event_members`

Required columns:

- `id`: UUID primary key
- `event_id`: required UUID referencing `events.id`
- `user_id`: required UUID referencing `users.id`
- `added_by`: required UUID referencing `users.id`
- `is_active`: boolean default true
- `removed_at`: nullable timestamp
- `created_at`
- `updated_at`

Constraints:

- Unique active or total pair for `event_id` and `user_id`. The simplest approved model is one row per pair that is reactivated rather than duplicated.
- Do not add the event leader to this table unless the chosen query design requires it. The recommended design treats `events.leader_id` as direct leader access and `event_members` as member/supervisor access.
- Only users with global role `MEMBER` or `SUPERVISOR` may be added through the standard membership endpoint. Admin reassignment of event leader is a separate action if implemented.

### `companies`

Required columns:

- `id`: UUID primary key
- `name`: required display name
- `normalized_name`: required normalized name used for matching
- `sector`: required controlled string
- `city`: nullable string
- `website`: nullable URL string
- `website_domain`: nullable normalized domain
- `general_email`: nullable normalized email
- `phone`: nullable normalized phone string
- `address`: nullable text
- `notes`: nullable text
- `created_by`: required UUID referencing `users.id`
- `archived_at`: nullable timestamp
- `created_at`
- `updated_at`

Indexes:

- `normalized_name`
- `website_domain`
- `sector`
- `city`
- `archived_at`

Do not create a strict global unique constraint on normalized company name alone. Two legal organizations can have similar names. Duplicate detection is advisory at company creation and definitive later at the event-company level.

### `company_contacts`

Required columns:

- `id`: UUID primary key
- `company_id`: required UUID referencing `companies.id`
- `full_name`: required string
- `position`: nullable string
- `email`: nullable normalized email
- `phone`: nullable normalized phone
- `preferred_contact_method`: constrained value `EMAIL`, `PHONE`, `WHATSAPP`, `MEETING`, or `OTHER`
- `notes`: nullable text
- `is_primary`: boolean default false
- `created_by`: required UUID referencing `users.id`
- `archived_at`: nullable timestamp
- `created_at`
- `updated_at`

Rules:

- At most one active primary contact per company. Enforce through a transaction in the service when creating or changing primary contact.
- A contact requires at least one of email or phone unless the product team records an explicit reason in notes. The recommended MVP rule is require email or phone.
- Archiving a company hides its contacts from normal selection but does not delete them.

### `sponsorship_packages`

The sponsorship tiers an event offers — "Gold, 5000, includes logo on stage backdrop and two
booth passes". A case may reference one, or none.

**Why this exists.** Nothing is being sold here and there is no product catalogue — a package is
simply **the standard ask**: "contribute 5000 and we put your logo on the stage backdrop and give
you two passes." Sponsorship for conferences and university events is normally presented as 3–4
named tiers like this rather than as an arbitrary number typed into a box.

Without this table the team can record _that_ a company contributed 5000 but not _what was
promised in return_, so the proposal lives outside the tool and the post-event question "what did
we commit to Gold sponsors?" has no answer. Commercial products model this as reusable Inventory composed into Packages; that is
correct at scale and overkill here. One event-scoped table is the version that fits.

Required columns:

- `id`: UUID primary key
- `event_id`: required UUID referencing `events.id`
- `name`: required string, e.g. `Gold`
- `amount`: numeric(14,2), required, non-negative — the contribution this tier asks for
- `benefits`: required text — what the sponsor receives, free text, one per line is fine
- `display_order`: integer, default zero, for presenting tiers high-to-low
- `is_active`: boolean default true
- `created_by`: required UUID referencing `users.id`
- `created_at`
- `updated_at`

Constraints and indexes:

- Unique `(event_id, name)` among active packages.
- Index `event_id`.
- Amount must be non-negative.
- Do not hard-delete a package. Deactivate it, because Plan 3 cases will reference it and the
  record of what a sponsor was promised must survive.

Rules:

- Packages are optional. An event with no packages behaves exactly as this plan did before they
  existed, and a case may always carry a free-form amount with no package.
- Only the event leader or an admin may manage an event's packages.
- Editing a package's `amount` does **not** retroactively change any sponsorship case. Plan 3
  copies the agreed figures onto the case; the package is a template, not a live link.

## Currency

**All monetary values in SponsorSync are in a single currency (JOD) and no currency column
exists anywhere.** Every product surveyed stores amount and currency together as a pair, so this
is a deliberate simplification, not an oversight: the system serves one organisation running
local events. If multi-currency is ever needed it is a schema change, not a display change.
State this on any screen showing money.

## Normalization Rules

Create reusable utilities and unit tests.

### Company name

- Trim leading and trailing whitespace.
- Convert repeated whitespace to one space.
- Lowercase for normalized comparison.
- Remove punctuation that does not distinguish identity.
- Normalize common legal suffixes only if the team documents the behavior. Do not aggressively remove words in a way that merges unrelated companies.

Example:

    "  Jordan   Telecom Co.  " -> "jordan telecom co"

### Website domain

- Accept full URLs or domain input.
- Lowercase the hostname.
- Remove protocol, path, query, fragment, leading `www.`, and trailing slash.
- Reject invalid values instead of storing malformed URLs.

### Email

- Trim and lowercase.
- Validate format.

### Phone

- Trim spaces and formatting characters while preserving an optional leading plus sign.
- Do not invent a country code.
- Keep display formatting separate if needed.

## Event API

### List accessible events

    GET /api/events?page=1&pageSize=20&search=&status=&fromDate=&toDate=

Behavior:

- Admin sees all matching events, including archived only when explicitly requested.
- Leader sees events they lead.
- Member and supervisor see active memberships.
- Search name, category, and location.
- Return summary values only; sponsorship metrics arrive later.

### Create event

    POST /api/events

Allowed roles: Admin and Leader.

Input includes name, description, category, event date, location, financial target, sponsorship deadline, target sectors, target cities, status, and optional leader for admin.

Rules:

- Leader can only create an event led by themselves.
- Admin may select an active leader.
- Validate dates and non-negative target.
- Audit `EVENT_CREATED`.

### Read event

    GET /api/events/:eventId

Return event details, leader summary, active member summaries, and permission flags useful to the UI, such as `canEdit` and `canManageMembers`. Permission flags are convenience only; backend routes remain protected.

### Update event

    PATCH /api/events/:eventId

Allowed: Admin or event leader.

Rules:

- Reject unknown fields.
- Do not allow changing `leader_id` through the general update endpoint. Use the dedicated
  transfer endpoint below.
- Audit meaningful before and after values.

### Transfer event leadership

    PATCH /api/events/:eventId/leader

Input:

    {
      "leaderId": "uuid",
      "reason": "Required explanation"
    }

Allowed: **Admin only.**

**Why this endpoint is required, not optional.** `events.leader_id` is required and cannot be
changed through the general update endpoint. Without a transfer path, an event whose leader is
deactivated, leaves the organisation, or simply hands over responsibility becomes permanently
unmanageable: the leader is the only role that can edit the event, manage its team, and (in
Plan 3) add and assign sponsorship cases. An earlier draft listed this as "a separate action if
implemented", which would have left the hole open.

Rules:

- The new leader must be an active user with global role `LEADER` or `ADMIN`.
- Reason is required and is audited with before and after values.
- If the new leader is currently an event member, remove that membership row — leadership is
  granted through `events.leader_id`, not `event_members`.
- Do not change any sponsorship-case assignment. Leadership and case ownership are separate.

### Guard: a user who leads active events cannot be deactivated

Extend the Plan 1 service behind `PATCH /api/users/:id/status`.

If the target user is `leader_id` of any event that is not `ARCHIVED` or `CANCELLED`, reject
deactivation with HTTP 409 `USER_LEADS_ACTIVE_EVENTS` and return the count of blocking events.
Transfer leadership first, then deactivate.

This is the same shape as the guard Plan 3 adds for event members who own active sponsorship
cases. Both answer one question — _what happens to the records a person owns when that person
goes away_ — and the answer is always: block, name what is blocking, and require an explicit
reassignment. Never silently orphan a record.

### Change status or archive

Use a focused endpoint or well-validated update. Recommended:

    PATCH /api/events/:eventId/status

Allowed transitions:

- `DRAFT` to `ACTIVE` or `CANCELLED`
- `ACTIVE` to `COMPLETED`, `CANCELLED`, or `ARCHIVED`
- `COMPLETED` to `ARCHIVED`
- `CANCELLED` to `ARCHIVED`
- `ARCHIVED` may be restored only by Admin in the MVP

Record status changes in audit logs.

### Manage event members

    GET    /api/events/:eventId/member-candidates?page=1&pageSize=20&search=&role=
    GET    /api/events/:eventId/members
    POST   /api/events/:eventId/members
    DELETE /api/events/:eventId/members/:userId

Allowed: Admin or event leader for candidate lookup and writes; accessible event roles for
membership reads.

Rules:

- Candidate lookup returns active global `MEMBER` and `SUPERVISOR` users who are not the event
  leader and are not already active event members. Existing inactive memberships are included
  with `membershipStatus: "INACTIVE"` so the UI can present reactivation without requiring a
  raw UUID input or broad admin user-management access.
- Only active users may be added.
- Only users with role MEMBER or SUPERVISOR may be added through this endpoint.
- Adding an existing inactive membership reactivates it.
- Removing sets `is_active` false and `removed_at`; do not hard-delete.
- Prevent adding the event leader as a duplicate member.
- Plan 3 will add rules preventing unsafe removal when a member owns active sponsorship cases.

### Manage sponsorship packages

    GET    /api/events/:eventId/packages
    POST   /api/events/:eventId/packages
    PATCH  /api/events/:eventId/packages/:packageId
    DELETE /api/events/:eventId/packages/:packageId

Allowed: Admin or event leader for writes; any accessible event role for read.

Input for create and update:

    {
      "name": "Gold",
      "amount": "5000.00",
      "benefits": "Logo on stage backdrop\nTwo booth passes\nLogo in the printed programme",
      "displayOrder": 1
    }

Rules:

- `DELETE` deactivates (`is_active = false`); it never removes the row, because Plan 3 cases
  reference packages and the record of what a sponsor was promised must survive.
- Reject a duplicate active name within the same event with HTTP 409.
- Audit create, update, and deactivate.
- Read returns packages ordered by `display_order`, then `amount` descending.

## Company API

### List companies

    GET /api/companies?page=1&pageSize=20&search=&sector=&city=&archived=false

Requirements:

- Authenticated users with company-directory access.
- Search name, website domain, email, and phone.
- Include primary contact summary if available.
- Paginate and order predictably.

### Duplicate suggestion

    GET /api/companies/duplicates?name=&website=&email=&phone=

Return possible matches with reasons and a confidence label, not a false claim that they are definitely duplicates.

Example:

    {
      "companyId": "...",
      "name": "Jordan Telecom",
      "reasons": ["same normalized name", "same website domain"],
      "confidence": "HIGH"
    }

### Create company

    POST /api/companies

Allowed: Admin and Leader. Member creation is excluded unless explicitly approved in the role matrix.

Behavior:

1. Normalize match fields.
2. Search for potential duplicates.
3. If a high-confidence duplicate exists, return HTTP 409 with match details unless the request contains an admin/leader-confirmed override reason.
4. Create the company.
5. Optionally create one initial contact in the same transaction.
6. Audit the creation and any duplicate override.

### Read company

    GET /api/companies/:companyId

Return company data and active contacts. Historical event sponsorships are not available until Plan 3; return an empty or explicitly unavailable history section rather than fake data.

### Update company

    PATCH /api/companies/:companyId

Allowed: Admin and Leader.

Normalize changed fields, run duplicate checks, and audit changes.

### Archive and restore company

    PATCH /api/companies/:companyId/archive

Archive for Admin and Leader. Restore may be Admin only in the MVP. Archived companies cannot be newly selected for events later, but historical records remain readable.

## Company Contact API

    GET    /api/companies/:companyId/contacts
    POST   /api/companies/:companyId/contacts
    PATCH  /api/companies/:companyId/contacts/:contactId
    PATCH  /api/companies/:companyId/contacts/:contactId/archive
    POST   /api/companies/:companyId/contacts/:contactId/make-primary

Allowed writes: Admin and Leader.

The make-primary operation must use a transaction that clears the previous active primary contact and sets the selected contact as primary.

## Frontend Page Structure

Add these protected routes:

- `/app/events`
- `/app/events/new`
- `/app/events/:eventId`
- `/app/events/:eventId/edit`
- `/app/events/:eventId/packages`
- `/app/companies`
- `/app/companies/new`
- `/app/companies/:companyId`
- `/app/companies/:companyId/edit`

### Event list page

Display:

- Name
- Category
- Event date
- Leader
- Financial target
- Status
- Accessible action menu

Provide search, status filter, date filter, pagination, loading skeleton, empty state, and role-aware create button.

### Event form

Sections:

- Basic details
- Dates and location
- Sponsorship target
- Target sectors and cities
- Initial status

Validate on the client for usability and again on the backend for authority.

### Event detail page

Display:

- Event summary header
- Status
- Financial target
- Deadline
- Leader
- Active members and supervisors
- Team management controls for authorized users
- Sponsorship packages for the event, ordered high to low, with management controls for the
  leader and admin. Show an empty state that explains packages are optional rather than an
  error, because an event may legitimately have none.
- A clearly labeled sponsorship-work placeholder that Plan 3 will replace

### Company list page

Display:

- Company name
- Sector
- City
- Website/domain
- Primary contact
- Archived state where permitted

Provide search, sector filter, city filter, pagination, and create button for authorized roles.

### Company form

When the user leaves the name or website field, debounce a duplicate-suggestion request. Show possible matches before submission. Allow an authorized override with a required reason when the backend classifies a match as high confidence.

### Company detail page

Display:

- Company information
- Contact list
- Primary contact
- Add/edit/archive contact controls
- Placeholder for sponsorship history, clearly marked as available after sponsorship cases are implemented

## Milestone 1: Add Event and Company Schema

Create migrations, models, associations, and indexes. Add model tests or database verification for constraints.

Required associations include:

- User has many led Events through `leader_id`.
- Event belongs to leader User.
- Event has many EventMembers.
- EventMember belongs to Event and User.
- Event has many SponsorshipPackages.
- SponsorshipPackage belongs to Event.
- Company has many CompanyContacts.
- CompanyContact belongs to Company.

Acceptance:

- Migrations apply cleanly after Plan 1.
- Latest migrations can be undone and reapplied in a disposable environment.
- Invalid role/status values and negative targets are rejected.
- Duplicate event memberships are rejected or reactivated according to the chosen design.
- A duplicate active package name within one event is rejected; the same name in a different
  event is allowed.

## Milestone 2: Implement Event Access Helpers and API

Build a central service helper such as `eventAccessService.getAccessibleEvent` rather than duplicating role logic across route handlers.

The helper must distinguish:

- Admin access
- Leader ownership
- Active event membership
- Read versus manage permission

Implement event list, create, detail, update, status, and membership endpoints with validation, audit logging, and tests.
Membership management includes an event-scoped candidate lookup so the frontend can search
eligible users without calling the admin-only `/api/users` endpoint.

Acceptance scenario:

1. Admin creates one leader, one member, and one supervisor if not already seeded.
2. Leader creates an event.
3. Leader adds the member and supervisor.
4. Member and supervisor can view it.
5. Another unrelated member cannot discover it through list or direct ID.
6. Member cannot update it.
7. Leader can update target and deadline.
8. Status transition rules reject an invalid transition.

## Milestone 3: Build Event Frontend

Implement list, create, detail, edit, member management, role-aware actions, and responsive states.

Acceptance:

- Event operations can be completed through the UI without manual API calls.
- Unauthorized buttons do not render.
- A manual unauthorized API call still fails.
- Event form preserves server validation messages.
- Refreshing an event detail page works directly through the URL.

## Milestone 4: Implement Company Normalization and Duplicate Detection

Build tested normalization utilities and duplicate query logic before creating the company write endpoints.

Suggested confidence rules:

- HIGH: same non-empty website domain, or same normalized name plus same phone/email.
- MEDIUM: same normalized name and city, or same email domain with similar name.
- LOW: similar normalized name only.

Do not use an external AI API. Use deterministic rules that can be explained and tested.

Acceptance:

- Unit tests cover punctuation, whitespace, website paths, case, empty values, and invalid input.
- Duplicate endpoint returns reasons.
- High-confidence duplicate creation requires an authorized override reason.

## Milestone 5: Implement Company and Contact API

Implement CRUD, archive, contact management, primary-contact transaction, audit logging, and tests.

Acceptance scenario:

1. Leader creates a company with a primary contact.
2. A second create attempt with the same domain is blocked as a likely duplicate.
3. Leader creates a second contact.
4. Making the second contact primary removes primary state from the first within one transaction.
5. Member can read but not edit the company.
6. Supervisor can read but not edit.
7. Archived company disappears from normal lists but remains available to Admin with archived filter.

## Milestone 6: Build Company Frontend

Implement company list, duplicate suggestions, create/edit forms, detail page, contact management, and archive behavior.

Acceptance:

- Duplicate suggestions appear before submission when possible.
- Backend conflict details remain understandable if a race or stale client bypasses the suggestion.
- Contact validation and primary selection work.
- Empty, loading, and error states are present.
- Pages remain usable on tablet-sized layouts.

## Milestone 7: Integrate and Verify the Plan 2 Workflow

Run the complete workflow with realistic development data.

Required end-to-end scenario:

1. Admin signs in and confirms the four role accounts.
2. Leader signs in and creates “University Technology Conference 2026.”
3. Leader sets an event date, sponsorship deadline, financial target, target sectors, and target cities.
4. Leader adds two members and one supervisor.
5. One unrelated member cannot access the event.
6. Leader creates “Jordan Telecom” and two contacts.
7. The system warns when a similar company is entered again.
8. Leader views the event and company detail pages after refreshing direct URLs.
9. Supervisor views event and company data but sees no edit controls.
10. Audit logs contain the event, membership, company, and contact actions.

## Required Tests

### Backend unit and service tests

- Event date and target validation
- Status transition matrix
- Event access matrix for all roles
- Membership add, reactivate, and remove
- Company normalization
- Duplicate confidence rules
- Contact primary transaction
- Archive behavior

### API tests

- Accessible event list per role
- Inaccessible event direct request
- Event create/update permissions
- Invalid status transition
- Company create conflict
- Contact CRUD permissions
- Safe pagination and filtering

### Frontend tests

- Role-aware event actions
- Event form validation
- Member management interactions
- Company duplicate suggestion display
- Company conflict display
- Primary contact behavior
- Direct URL loading

## Required Commands

From the repository root:

    npm run lint
    npm run format:check
    npm run test
    npm run build
    npm run db:migrate
    npm run dev

Use the documented migration undo/reapply procedure only in a disposable environment.

## Validation and Acceptance

Plan 2 is accepted only when:

- Events, event members, companies, and contacts exist through migrations.
- Access is scoped by global role and event relationship.
- A leader can complete the event workflow through the UI.
- Member and supervisor event access is read-only as defined.
- An unrelated user cannot discover a private event.
- Company records are reusable and independent from events.
- Duplicate-company suggestions are deterministic and explainable.
- Primary contact changes are transactional.
- Important changes are audited.
- All tests, lint, and build pass.
- No sponsorship case, assignment, or fake analytics logic has leaked into Plan 2.

## Idempotence and Recovery

- Re-adding an existing event member should reactivate the existing membership or return a clear idempotent result.
- Making an already-primary contact primary should succeed without creating inconsistent state.
- Archive operations should be safe to retry.
- Do not hard-delete records referenced by audit logs.
- If two migrations conflict, rebase before either is applied to the shared database; do not rename an already applied migration.
- If duplicate normalization proves too aggressive, record examples, correct the utility, and preserve original company display names.

## Handoff to Plan 3

Plan 2 is complete locally and ready for Plan 3 to add sponsorship cases. Test and development
Supabase migrations were verified on 2026-07-30 with `NODE_ENV=test npm run db:migrate` and
`npm run db:migrate`; both exited 0.

Latest migrations:

- `0008-create-events.js`
- `0009-create-event-members.js`
- `0010-create-sponsorship-packages.js`
- `0011-create-companies.js`
- `0012-create-company-contacts.js`
- `0013-harden-plan2-phase1-schema.js`

Stable model names and associations:

- `Event` belongs to `User` as `leader` through `leader_id`, and to `User` as `creator` through
  `created_by`.
- `Event` has many `EventMember` rows as `memberships`; `EventMember` belongs to `Event` as
  `event`, to `User` as `user`, and to `User` as `addedByUser`.
- `Event` has many `SponsorshipPackage` rows as `sponsorshipPackages`; `SponsorshipPackage`
  belongs to `Event` as `event` and `User` as `creator`.
- `Company` belongs to `User` as `creator`, has many `CompanyContact` rows as `contacts`, and
  `CompanyContact` belongs to `Company` as `company` and `User` as `creator`.
- There is intentionally no Plan 2 association between `Event` and `Company`. Plan 3 owns that
  link through `sponsorship_cases`, unique on `(event_id, company_id)`.

API and access references:

- Final endpoint shapes and error codes are in `docs/api-conventions.md`.
- The Plan 2 role and event-relationship matrix is in `docs/roles-and-access.md`.
- Confirmed frontend routes are `/app/events`, `/app/events/:eventId`, `/app/companies`, and
  `/app/companies/:companyId`.
- Event writes are `ADMIN` or the managed event `LEADER`; `MEMBER` and `SUPERVISOR` can read only
  active assigned events. Inaccessible direct event reads return `EVENT_NOT_FOUND`.
- Company records are reusable directory records. All authenticated roles can read active
  companies/contacts; only `ADMIN` and `LEADER` can write. Archived company restore is admin-only.

Status lists and constants:

- Event statuses: `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `ARCHIVED`.
- Contact methods: `EMAIL`, `PHONE`, `WHATSAPP`, `MEETING`, `OTHER`.
- Duplicate confidence values: `HIGH`, `MEDIUM`, `LOW`.
- Currency is JOD only; there is no currency column in Plan 2.

Normalization and duplicate detection:

- Company normalization lives in `server/src/services/companyNormalization.js`:
  `normalizeCompanyName`, `normalizeWebsiteDomain`, `normalizeCompanyEmail`,
  `normalizeCompanyPhone`, and `normalizeCompanyIdentity`.
- Duplicate detection lives in `server/src/services/companyDuplicateService.js` as
  `findCompanyDuplicates`; focused tests are `server/tests/companyNormalization.test.js` and
  `server/tests/companyDuplicates.test.js`.
- `GET /api/companies/duplicates` accepts `name`, `website`, `generalEmail`/`email`, `phone`,
  `city`, and `excludeCompanyId`; duplicate conflict responses preserve
  `error.details.matches`.

Rules Plan 3 must preserve:

- `sponsorship_packages` are event-scoped package templates. Plan 3 must copy agreed package
  figures and benefits onto sponsorship cases rather than reading package values live.
- Event leadership is transferable through the admin-only leader endpoint, and active event
  leaders cannot be deactivated.
- Companies are independent from events until Plan 3 creates `sponsorship_cases`.
- Sponsorship history in company detail is an explicit `{ status: 'UNAVAILABLE', items: [] }`
  placeholder until Plan 3 replaces it.

Known limitations:

- No audit-log endpoint or UI; Phase 7 verified audit rows by querying `audit_logs` directly.
- No company merge workflow.
- No sponsorship cases, assignment/claiming, interactions, attachments, notifications, analytics,
  reports, or recommendations.

## Progress

- [x] Event, membership, and sponsorship package migrations created and verified.
- [x] Company and contact migrations created and verified.
- [x] Event access service implemented and tested.
- [x] Event API implemented and tested.
- [x] Event frontend implemented and tested.
- [x] Company normalization implemented and tested.
- [x] Company and contact API implemented and tested.
- [x] Company frontend implemented and tested.
- [x] Audit logging verified.
- [x] Plan 2 end-to-end scenario passed.

## Surprises and Discoveries

- Observation: Phase 1 stayed entirely in the backend schema/model layer.
  Evidence: The implementation added migrations, Sequelize models, Plan 2 constants, model
  associations, reset helper coverage, and `server/tests/plan2Schema.test.js`; no routes,
  services, validators, client files, or Plan 3 sponsorship-case structures were added.

- Observation: Phase 2 review found Phase 1 drift before the event API started: package benefits
  and company sector were nullable, and three Plan 2 child FKs cascaded on hard delete.
  Evidence: `0013-harden-plan2-phase1-schema.js` now makes `companies.sector` and
  `sponsorship_packages.benefits` required and changes `event_members.event_id`,
  `sponsorship_packages.event_id`, and `company_contacts.company_id` delete behavior to
  `RESTRICT`; `server/tests/plan2Schema.test.js` covers the corrected contract.

- Observation: Phase 2 stayed backend-only.
  Evidence: The implementation added event access, event, event-member, and sponsorship-package
  services; event validators and routes; focused backend tests; and API/access documentation. It
  did not add client files, company/contact endpoints, or Plan 3 sponsorship-case behavior.

- Observation: Phase 3 review exposed a missing event-member discovery contract.
  Evidence: The membership mutation correctly accepts a `userId`, but the only existing user list
  endpoint is admin-only. Phase 2 now adds `GET /api/events/:eventId/member-candidates`, an
  event-scoped search for eligible active `MEMBER` and `SUPERVISOR` users, including inactive
  memberships as reactivation candidates. This prevents Phase 3 from shipping a raw UUID field or
  widening `/api/users` access for leaders.

- Observation: Phase 3 stayed within the event frontend surface.
  Evidence: The implementation added event API client methods, authenticated event routes, event
  list/create/edit/detail pages, member-candidate team management, package management UI, focused
  client tests, and navigation updates. It did not add company/contact UI, sponsorship cases,
  assignments, interaction tracking, notifications, analytics, schema migrations, or direct
  Supabase access from React.

- Observation: Phase 4 stayed service-only and deferred endpoint/override behavior to Phase 5.
  Evidence: The implementation added company normalization and duplicate-detection services,
  duplicate confidence constants, and focused server tests. It did not add company routes,
  validators, company/contact CRUD services, frontend files, migrations, or Plan 3 sponsorship
  behavior. The canonical Milestone 4 acceptance bullets for duplicate endpoint responses and
  high-confidence create override are covered by Phase 5 in the phased plan.

- Observation: Phases 5 and 6 were implemented together as one company-directory slice.
  Evidence: The implementation added company/contact validators, services, routes, API client
  methods, company list/create/edit/detail pages, role-aware navigation, focused server/client
  tests, and company API/access documentation. It did not add migrations, sponsorship cases,
  event-company links, assignments, interactions, attachments, notifications, analytics, or direct
  Supabase access from React.

- Observation: Company duplicate suggestions now pass city through the API.
  Evidence: Phase 4 duplicate detection uses same normalized name plus city as a medium-confidence
  signal, so `GET /api/companies/duplicates` accepts city and caps returned suggestions at ten
  matches for predictable UI output.

- Observation: Phase 7 closed Plan 2 with evidence rather than product scope.
  Evidence: `server/tests/plan2Acceptance.test.js` now executes the full event, package, team,
  company, contact, duplicate-suggestion, direct-read, negative-write, and audit-log workflow
  against the test Supabase database. A direct `audit_logs` query after the focused run returned:
  `EVENT_CREATED=1`, `EVENT_UPDATED=1`, `EVENT_MEMBER_ADDED=3`,
  `EVENT_PACKAGE_CREATED=1`, `COMPANY_CREATED=1`, `COMPANY_CONTACT_CREATED=2`, and
  `COMPANY_CONTACT_PRIMARY_CHANGED=1`. Scope scans found no React Supabase client usage, no
  event-company link, and no Plan 3 sponsorship-case, assignment, interaction, attachment,
  notification, analytics, report, or recommendation implementation.

## Decision Log

- Decision: Events offer named sponsorship packages (tiers), and a package is a template rather
  than a live link.
  Rationale: A package is the standard ask, not a product - nothing is sold and there is no
  catalogue. Sponsorship for conferences and university events is normally presented as 3-4 named
  tiers with listed inclusions rather than an arbitrary number typed into a box. Without them the
  team can record that a company contributed 5000 but not what was promised in return, so the
  proposal lives outside the tool. Commercial products model reusable inventory composed into packages, which is
  right at scale and overkill here; one event-scoped table is the version that fits. Plan 3 copies
  agreed figures onto the case, so editing a tier's price never rewrites sponsorship history.
  Date/Author: 2026-07-25, Person 1 (pre-handoff system review).

- Decision: Event leadership is transferable through a dedicated admin-only endpoint, and a user
  who leads active events cannot be deactivated.
  Rationale: `leader_id` is required and cannot be changed through the general update endpoint. An
  earlier draft listed transfer as "a separate action if implemented", which left an event whose
  leader departs permanently unmanageable, since the leader is the only role that can edit it,
  manage its team, and add sponsorship cases.
  Date/Author: 2026-07-25, Person 1 (pre-handoff system review).

- Decision: Single currency (JOD); no currency column anywhere.
  Rationale: Every product surveyed stores amount and currency as a pair, so this is a deliberate
  simplification for one organisation running local events, recorded rather than left implicit.
  Adding multi-currency later is a schema change, not a display change.
  Date/Author: 2026-07-25, Person 1 (pre-handoff system review).

- Decision: `events.event_date` and `events.sponsorship_deadline` are date-only fields, and a
  sponsorship deadline must be null or on/before the event date.
  Rationale: Plan 2 describes event dates and sponsorship deadlines as day-level planning data,
  not time-of-day scheduling. Date-only storage avoids timezone drift in the UI and the database
  constraint rejects a deadline after the event.
  Date/Author: 2026-07-29, Person 2 Phase 1 implementation.

- Decision: `event_members` stores one total row per `(event_id, user_id)`, while the event leader
  is represented only by `events.leader_id`.
  Rationale: A total unique pair makes later reactivation deterministic and prevents duplicate
  membership history. Leader access is direct event ownership, so duplicating the leader into
  `event_members` would create two sources of truth.
  Date/Author: 2026-07-29, Person 2 Phase 1 implementation.

- Decision: Sponsorship packages are event-scoped templates with a unique active name per event,
  and inactive packages may reuse the same name.
  Rationale: Plan 3 copies agreed figures onto sponsorship cases, so a package is the standard ask
  at proposal time rather than a live financial record. The partial unique index blocks confusing
  duplicate active choices without preventing historical inactive tiers.
  Date/Author: 2026-07-29, Person 2 Phase 1 implementation.

- Decision: `companies.normalized_name` is indexed but not globally unique, and the one-active
  primary-contact rule remains a later service transaction.
  Rationale: The Plan 2 scope calls for advisory duplicate detection because similar company
  names can be different organizations. Primary-contact replacement needs a transaction that
  clears the previous active primary contact, which belongs to the company/contact service phase
  rather than the Phase 1 schema.
  Date/Author: 2026-07-29, Person 2 Phase 1 implementation.

- Decision: Permanent companies remain independent from event-specific sponsorship work.
  Rationale: The same company may be contacted for many events, and company history must remain reusable without duplicating company identity data.
  Date/Author: Initial product design.

- Decision: Archived event reads are still allowed for ADMIN and the event leader, but not for
  member/supervisor memberships; restoring an archived event to `ACTIVE` is ADMIN-only in the MVP.
  Rationale: This preserves management recovery without exposing stale assigned-event membership
  views or giving event leaders unilateral archive restoration.
  Date/Author: 2026-07-30, Person 2 Phase 2 implementation.

- Decision: Event member mutations remain ID-based internally, while the UI consumes an
  event-scoped candidate lookup.
  Rationale: `POST /api/events/:eventId/members` should stay a precise backend mutation with a
  validated target user id and service-level event access checks. The usability and authorization
  gap is discovery, so leaders get only a narrow candidate endpoint for events they manage rather
  than broad access to admin user management.
  Date/Author: 2026-07-30, Person 2 Phase 2 bridge review.

- Decision: Company-name matching produces warnings rather than a universal unique constraint.
  Rationale: Similar legal names may represent different organizations, while website domains and combined signals provide stronger duplicate evidence.
  Date/Author: Initial product design.

- Decision: Company duplicate detection is deterministic, service-layer-only in Phase 4, and keeps
  legal suffix words in normalized names.
  Rationale: Plan 2 requires explainable duplicate warnings, not AI matching or schema-level
  identity certainty. Keeping suffix words such as `co`, `llc`, `bank`, and `group` prevents
  over-merging unrelated organizations, while exact domains and combined name/contact signals give
  stronger confidence for later Phase 5 create/update decisions.
  Date/Author: 2026-07-30, Person 2 Phase 4 implementation.

- Decision: Company creation accepts one optional initial contact in the same backend transaction.
  Rationale: The Phase 5 acceptance scenario starts with a leader creating a company with a primary
  contact. A nested initial contact keeps that first user flow atomic while later contact changes
  still use the dedicated contact endpoints.
  Date/Author: 2026-07-30, Person 2 Phase 5/6 implementation.

- Decision: Company records stay globally readable to authenticated users in Plan 2, but writable
  only by Admin and Leader; archived company lists and company restore remain Admin-only.
  Rationale: Companies are reusable directory records rather than event-private sponsorship work.
  This gives Members and Supervisors the read-only context Plan 2 promises without introducing
  Plan 3 case ownership or broad write access.
  Date/Author: 2026-07-30, Person 2 Phase 5/6 implementation.

## Outcomes and Retrospective

Plan 2 delivered the foundation it was meant to deliver: events with scoped teams and sponsorship
package templates, plus a reusable company directory with contacts, duplicate warnings, and
transactional primary-contact changes. The implementation stays inside the documented architecture:
React calls the Express API, Express services own business rules and transactions, and every
schema change landed as a Sequelize/umzug migration.

The highest-value correction during the plan was the event-member discovery bridge. Keeping
`POST /api/events/:eventId/members` ID-based while adding
`GET /api/events/:eventId/member-candidates` avoided both a raw UUID UI and a broad leader-visible
user-management API.

Plan 3 can now add sponsorship cases without reworking Plan 2. It should link `events` and
`companies` through `sponsorship_cases`, copy selected package terms onto each case, and replace
the company sponsorship-history placeholder with real case history. It should not assume a direct
event/company association already exists.

Remaining deliberate gaps are audit-log UI/API, company merge, notifications, attachments,
analytics, reports, recommendations, and multi-currency. Those are outside Plan 2 rather than
unfinished Plan 2 work.

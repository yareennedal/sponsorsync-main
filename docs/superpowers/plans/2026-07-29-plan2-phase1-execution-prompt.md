# Plan 2 Phase 1 Execution Prompt

Use this prompt to execute only Phase 1 of Plan 2. It is intentionally narrower than the full
Plan 2 phased implementation plan.

You are working in `D:\graduation` on SponsorSync.

Execute ONLY Phase 1 of Plan 2: schema, Sequelize models, associations, Plan 2 constants,
schema/model tests, and milestone documentation updates. Do not implement endpoints, services,
validators, frontend routes/pages/API clients, duplicate-detection utilities, audit workflows, or
any Plan 3 sponsorship-case behavior.

## Required Skill Setup

Before touching files, load and follow the relevant skills:

- `using-superpowers`
- `supabase`
- `supabase-postgres-best-practices`
- `sequelize`
- `nodejs-backend-patterns`
- `test-driven-development`
- `verification-before-completion`

React/frontend skills are intentionally not needed for Phase 1 because this phase must not touch
`client/`. If you discover a genuine frontend requirement, stop and report the mismatch instead of
expanding the phase.

For Supabase: this repo uses Supabase PostgreSQL through Sequelize/umzug migrations. Do not use
Supabase CLI migration generation, dashboard edits, `supabase-js`, storage, Edge Functions, Data API
grants, or RLS policy work in this phase. If you believe RLS must be introduced for new public-schema
tables, record it as a Surprises/Decision item and stop for owner review; do not silently add policy
scope.

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

Then inspect the current patterns in:

- `server/migrations/0001-create-users.js`
- `server/migrations/0005-harden-user-indexes-and-email-uniqueness.js`
- `server/src/models/User.js`
- `server/src/models/AuditLog.js`
- `server/src/models/index.js`
- `server/tests/helpers.js`
- `server/tests/migrations.test.js`
- `server/package.json`
- root `package.json`

`AGENTS.md` is authoritative where docs drift. In particular, `server/.env` and `client/.env` are
intentionally committed in this private repo; do not delete them, re-ignore them, or rotate values as
part of Phase 1.

## Hard Scope Boundary

Allowed in Phase 1:

- Create migrations `0008` through `0012`.
- Create Sequelize model files for the five Plan 2 tables.
- Append Plan 2 associations/exports in `server/src/models/index.js`.
- Add one small server constants file for status/contact-method literals.
- Update `server/tests/helpers.js` so `resetDb()` truncates every new table.
- Add focused server tests for schema/model constraints and association viability.
- Update `plans/02-events-companies-and-team-management.md` living sections for Phase 1 decisions,
  progress, surprises, and outcomes.
- Update `docs/implementation-status.md` with Phase 1 status.

Forbidden in Phase 1:

- No `server/src/routes/*` event/company files.
- No `server/src/services/*` event/company files.
- No `server/src/validators/*` event/company files.
- No `server/src/app.js` router mounts.
- No `client/` changes.
- No `docs/api-conventions.md` error-code additions unless a Phase 1 test exposes an existing
  code/documentation bug.
- No sponsorship cases, assignments, interactions, follow-ups, files, notifications, analytics,
  reports, AI matching, fake sponsorship history, or package-to-case behavior.
- No new production dependency.
- No TypeScript.
- No `sequelize.sync()` or `sync({ alter: true })`.
- No manual Supabase dashboard edits.
- No destructive reset/undo commands against the shared dev or shared test database.
- No commits unless the current user explicitly asks for one in the execution task.

## Phase 1 Data Design Decisions To Apply

Use these choices so later phases do not have to guess:

- `events.event_date` and `events.sponsorship_deadline` use date-only semantics (`DATE`) for this
  graduation-project MVP. Document this in Plan 2's Decision Log.
- `events.sponsorship_deadline` must be null or on/before `events.event_date`.
- `event_members` uses the "one total row per event/user pair" design. Re-add in later phases will
  reactivate the same row instead of creating duplicates. Document this in Plan 2's Decision Log.
- The event leader is represented by `events.leader_id`, not duplicated in `event_members`.
- Sponsorship packages are event-scoped templates. They are not live-linked to future Plan 3 cases.
- Company `normalized_name` is indexed but not globally unique.
- At most one active primary company contact is a Phase 5 service-transaction rule. Do not add a
  Phase 1 partial unique primary-contact index unless the owner explicitly changes the scope.

## Files To Create

- `server/migrations/0008-create-events.js`
- `server/migrations/0009-create-event-members.js`
- `server/migrations/0010-create-sponsorship-packages.js`
- `server/migrations/0011-create-companies.js`
- `server/migrations/0012-create-company-contacts.js`
- `server/src/models/Event.js`
- `server/src/models/EventMember.js`
- `server/src/models/SponsorshipPackage.js`
- `server/src/models/Company.js`
- `server/src/models/CompanyContact.js`
- `server/src/constants/plan2Constants.js`
- `server/tests/plan2Schema.test.js`

## Files To Modify

- `server/src/models/index.js`
- `server/tests/helpers.js`
- `plans/02-events-companies-and-team-management.md`
- `docs/implementation-status.md`

Do not modify any other file without first proving it is necessary for Phase 1 acceptance.

## Migration Requirements

Follow the existing migration style:

- ESM JavaScript only.
- Use `import Sequelize, { DataTypes } from 'sequelize';` when `Sequelize.literal(...)` is needed.
- Export `async function up(queryInterface)` and `async function down(queryInterface)`.
- Use PostgreSQL `gen_random_uuid()` for UUID primary-key defaults.
- Use lowercase `snake_case` table and column names.
- Add every foreign-key-side index explicitly.
- Prefer raw SQL for check constraints and partial unique indexes that Sequelize cannot express
  clearly.
- Every `down` must drop its table. Drop raw indexes first when needed.

### `0008-create-events.js`

Create `events`:

- `id` UUID primary key, default `gen_random_uuid()`.
- `name` required string.
- `description` nullable text.
- `category` required string. Do not use a DB enum; categories must expand without a migration.
- `event_date` required `DATEONLY`.
- `location` nullable string.
- `financial_target` required `DECIMAL(14, 2)`, default `0`, with DB check `>= 0`.
- `sponsorship_deadline` nullable `DATEONLY`, with DB check null or `<= event_date`.
- `target_sectors` required JSONB, default empty JSON array.
- `target_cities` required JSONB, default empty JSON array.
- `status` required string, default `DRAFT`, with DB check limited to:
  `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `ARCHIVED`.
- `leader_id` required FK to `users.id`.
- `created_by` required FK to `users.id`.
- `archived_at` nullable date.
- `created_at`, `updated_at` required dates, default `CURRENT_TIMESTAMP`.

Add indexes:

- `events_leader_id_idx` on `leader_id`.
- `events_created_by_idx` on `created_by`.
- `events_status_idx` on `status`.
- `events_event_date_idx` on `event_date`.
- `events_archived_at_idx` on `archived_at`.

Use `onUpdate: 'CASCADE'`. Use `onDelete: 'RESTRICT'` for user FKs because users/events are not
hard-deleted in normal application behavior.

Use `Sequelize.literal("'[]'::jsonb")` for the JSONB array defaults.

### `0009-create-event-members.js`

Create `event_members`:

- `id` UUID primary key, default `gen_random_uuid()`.
- `event_id` required FK to `events.id`.
- `user_id` required FK to `users.id`.
- `added_by` required FK to `users.id`.
- `is_active` required boolean, default `true`.
- `removed_at` nullable date.
- `created_at`, `updated_at` required dates, default `CURRENT_TIMESTAMP`.

Add constraints/indexes:

- Unique total pair `(event_id, user_id)` named `event_members_event_user_unique`.
- Index `event_id`, `user_id`, and `added_by`.
- Do not add removal-state checks in Phase 1; `removed_at` is managed by the Phase 2 membership
  service.
- Do not add role checks here; global user-role eligibility is enforced by Phase 2 service logic.

Use `onUpdate: 'CASCADE'`. Use `onDelete: 'RESTRICT'` for all FKs.

### `0010-create-sponsorship-packages.js`

Create `sponsorship_packages`:

- `id` UUID primary key, default `gen_random_uuid()`.
- `event_id` required FK to `events.id`.
- `name` required string.
- `amount` required `DECIMAL(14, 2)`, default `0`, with DB check `>= 0`.
- `benefits` required text.
- `display_order` required integer, default `0`.
- `is_active` required boolean, default `true`.
- `created_by` required FK to `users.id`.
- `created_at`, `updated_at` required dates, default `CURRENT_TIMESTAMP`.

Add constraints/indexes:

- Partial unique index named `sponsorship_packages_event_name_active_unique`:
  `(event_id, name) WHERE is_active = true`.
- Index `event_id`.
- Index `created_by`.

Do not make the package-name unique index case-insensitive unless the owner explicitly records that
extra product decision. Plan 2 says unique `(event_id, name)` among active packages.

Use `onUpdate: 'CASCADE'`. Use `onDelete: 'RESTRICT'` for all FKs.

### `0011-create-companies.js`

Create `companies`:

- `id` UUID primary key, default `gen_random_uuid()`.
- `name` required string.
- `normalized_name` required string.
- `sector` required string.
- `city` nullable string.
- `website` nullable string.
- `website_domain` nullable string.
- `general_email` nullable string.
- `phone` nullable string.
- `address` nullable text.
- `notes` nullable text.
- `created_by` required FK to `users.id`.
- `archived_at` nullable date.
- `created_at`, `updated_at` required dates, default `CURRENT_TIMESTAMP`.

Add indexes:

- `companies_normalized_name_idx` on `normalized_name`.
- `companies_website_domain_idx` on `website_domain`.
- `companies_sector_idx` on `sector`.
- `companies_city_idx` on `city`.
- `companies_created_by_idx` on `created_by`.
- `companies_archived_at_idx` on `archived_at`.

Do not create a unique constraint on `normalized_name`.

Use `onUpdate: 'CASCADE'`. Use `onDelete: 'RESTRICT'` for `created_by`.

### `0012-create-company-contacts.js`

Create `company_contacts`:

- `id` UUID primary key, default `gen_random_uuid()`.
- `company_id` required FK to `companies.id`.
- `full_name` required string.
- `position` nullable string.
- `email` nullable string.
- `phone` nullable string.
- `preferred_contact_method` required string, default `EMAIL`, with DB check limited to:
  `EMAIL`, `PHONE`, `WHATSAPP`, `MEETING`, `OTHER`.
- `notes` nullable text.
- `is_primary` required boolean, default `false`.
- `created_by` required FK to `users.id`.
- `archived_at` nullable date.
- `created_at`, `updated_at` required dates, default `CURRENT_TIMESTAMP`.

Add constraints/indexes:

- DB check requiring at least one non-blank contact channel:
  `NULLIF(BTRIM(email), '') IS NOT NULL OR NULLIF(BTRIM(phone), '') IS NOT NULL`.
- Index `company_id`.
- Index `created_by`.
- Index `archived_at`.

Do not add a DB uniqueness constraint for primary contacts in Phase 1.

Use `onUpdate: 'CASCADE'`. Use `onDelete: 'RESTRICT'` for all FKs.

## Model Requirements

Create one model class per new table, matching `User.js` and `AuditLog.js` style:

- `import { Model, DataTypes } from 'sequelize';`
- `import { sequelize } from '../db/index.js';`
- `export class Event extends Model {}` etc.
- `tableName`, `modelName`, `underscored: true`, `timestamps: true`.
- Explicit camelCase model attributes with `field` mappings for snake_case columns.
- Model UUID defaults can use `DataTypes.UUIDV4`, matching current model style; migrations remain
  responsible for database `gen_random_uuid()` defaults.
- For DB money fields, use `DataTypes.DECIMAL(14, 2)` and expect string values from Sequelize.
- Use model-level `validate: { isIn: [...] }` for status/contact-method strings so invalid values
  fail before or at the database.

Create `server/src/constants/plan2Constants.js` and export only:

- `EVENT_STATUSES`
- `DEFAULT_EVENT_STATUS`
- `CONTACT_METHODS`
- `DEFAULT_CONTACT_METHOD`

Do not create broader configuration, registries, repository layers, DTO layers, or generic
normalization utilities in Phase 1.

## Association Requirements

Append imports, exports, and associations in `server/src/models/index.js`. Preserve existing
associations and append the Plan 2 block after them.

Required associations:

- `User.hasMany(Event, { foreignKey: 'leader_id', as: 'ledEvents' })`
- `Event.belongsTo(User, { foreignKey: 'leader_id', as: 'leader' })`
- `User.hasMany(Event, { foreignKey: 'created_by', as: 'createdEvents' })`
- `Event.belongsTo(User, { foreignKey: 'created_by', as: 'creator' })`
- `Event.hasMany(EventMember, { foreignKey: 'event_id', as: 'memberships' })`
- `EventMember.belongsTo(Event, { foreignKey: 'event_id', as: 'event' })`
- `User.hasMany(EventMember, { foreignKey: 'user_id', as: 'eventMemberships' })`
- `EventMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' })`
- `User.hasMany(EventMember, { foreignKey: 'added_by', as: 'addedEventMembers' })`
- `EventMember.belongsTo(User, { foreignKey: 'added_by', as: 'addedByUser' })`
- `Event.hasMany(SponsorshipPackage, { foreignKey: 'event_id', as: 'sponsorshipPackages' })`
- `SponsorshipPackage.belongsTo(Event, { foreignKey: 'event_id', as: 'event' })`
- `User.hasMany(SponsorshipPackage, { foreignKey: 'created_by', as: 'createdSponsorshipPackages' })`
- `SponsorshipPackage.belongsTo(User, { foreignKey: 'created_by', as: 'creator' })`
- `User.hasMany(Company, { foreignKey: 'created_by', as: 'createdCompanies' })`
- `Company.belongsTo(User, { foreignKey: 'created_by', as: 'creator' })`
- `Company.hasMany(CompanyContact, { foreignKey: 'company_id', as: 'contacts' })`
- `CompanyContact.belongsTo(Company, { foreignKey: 'company_id', as: 'company' })`
- `User.hasMany(CompanyContact, { foreignKey: 'created_by', as: 'createdCompanyContacts' })`
- `CompanyContact.belongsTo(User, { foreignKey: 'created_by', as: 'creator' })`

Export `Event`, `EventMember`, `SponsorshipPackage`, `Company`, and `CompanyContact`.

## Test-Driven Implementation

Use strict TDD:

1. Add `server/tests/plan2Schema.test.js` with focused tests first.
2. Run the focused test and verify it fails for the expected missing-model/table reason.
3. Implement the smallest migration/model/association slice to pass.
4. Re-run the focused test.
5. Repeat until all Phase 1 schema behaviors are covered.

Use existing `createUser()` from `server/tests/helpers.js` for user fixtures. Update `resetDb()` to
truncate:

```sql
TRUNCATE TABLE
  company_contacts,
  companies,
  sponsorship_packages,
  event_members,
  events,
  users,
  audit_logs
RESTART IDENTITY CASCADE
```

Keep the final SQL on one line if that matches local formatting.

Minimum tests in `server/tests/plan2Schema.test.js`:

- `migrator.up()` creates `events`, `event_members`, `sponsorship_packages`, `companies`, and
  `company_contacts`.
- Creating an event with an invalid `status` rejects.
- Creating an event with a negative `financialTarget` rejects.
- Creating an event with `sponsorshipDeadline` after `eventDate` rejects.
- Creating two `event_members` rows for the same `(eventId, userId)` rejects.
- Creating duplicate active package names in the same event rejects.
- Creating the same active package name in different events succeeds.
- Creating an inactive package with the same name as an active package succeeds.
- Creating two companies with the same `normalizedName` succeeds.
- Creating a contact with invalid `preferredContactMethod` rejects.
- Creating a contact with neither `email` nor `phone` rejects.
- At least one association include works, such as loading an event with its leader through alias
  `leader`.

Do not add route/API tests in Phase 1.

## Verification Commands

For the red/green loop, use focused server tests:

```powershell
npm --workspace server run test -- tests/plan2Schema.test.js
```

Before declaring Phase 1 complete, run from the repo root:

```powershell
npm run lint
npm run format:check
npm run test
npm run build
```

For migration reversibility, use only a disposable environment as required by
`docs/database-workflow.md`:

```powershell
npm run db:migrate
npm run db:migrate:undo
npm run db:migrate
```

Do not run migration undo against the shared Supabase dev or shared test database. If no
disposable database is available, report that reversibility was not verified and why.

## Documentation Updates

At the end of Phase 1 only:

- In `plans/02-events-companies-and-team-management.md`, check:
  - `Event and membership migrations created and verified.`
  - `Company and contact migrations created and verified.`
- Add Decision Log entries for:
  - date-only event/deadline semantics plus deadline-on-or-before-event-date validation.
  - one total `event_members` row per event/user pair, reactivated later instead of duplicated.
- Add any Supabase/RLS concern as a Surprises and Discoveries entry, not as implementation.
- Update `docs/implementation-status.md` to say Plan 2 Phase 1 schema/model foundation is complete
  only if verification actually passed.

## Stop Conditions

Stop and ask/report instead of improvising if:

- Any migration number `0008` through `0012` already exists with different content.
- The database is not disposable but reversibility verification would require `db:migrate:undo`.
- A required Phase 1 constraint conflicts with existing migrated schema.
- Implementing a test would require routes/services/frontend work.
- You are tempted to add Plan 3 tables or fake sponsorship history.
- You need a new dependency.

## Final Report Required

Report:

- Changed files.
- Migrations created.
- Tests added.
- Commands run with pass/fail result.
- Whether migration undo/reapply was verified and in what environment.
- Remaining issues or deferred decisions.
- Confirmation that no services, routes, client files, or Plan 3 scope were added.

## Prompt Self-Review Notes

- Scope target: only canonical Plan 2 Milestone 1 / phased Plan 2 Phase 1.
- This prompt deliberately excludes React skills and frontend files because Phase 1 is schema-only.
- This prompt uses Sequelize migrations, not Supabase CLI/schema generation, because the repo's
  database workflow is umzug-based.
- This prompt chooses DB string checks for event status/contact method rather than PostgreSQL enum
  types, avoiding enum-type down/reapply problems while still rejecting invalid values.
- This prompt leaves primary-contact uniqueness to Phase 5 service transactions because Plan 2
  assigns that rule to contact service behavior.
- This prompt does not add API error codes because Phase 1 should not expose new HTTP behavior.

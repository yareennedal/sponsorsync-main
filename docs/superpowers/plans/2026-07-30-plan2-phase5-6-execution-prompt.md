# Plan 2 Phase 5+6 Combined Execution Prompt

You are implementing SponsorSync Plan 2 Phase 5 and Phase 6 together on branch
`feature/plan2-events-companies`.

## Required Skill Order

Use these skills before and during execution:

1. `executing-plans`
2. `subagent-driven-development` for review checkpoints where useful
3. `test-driven-development`
4. `supabase`
5. `sequelize`
6. `nodejs-backend-patterns`
7. `express-rest-api`
8. `vitest-testing`
9. `security-review`
10. `vercel-react-best-practices`
11. `how-to-write-component`
12. `accessibility`
13. `frontend-code-review`
14. `requesting-code-review`

Supabase note: check the current Supabase changelog before database-adjacent work. These phases
use the existing Express/Sequelize path and should not introduce direct Supabase client usage.

## Must-Read Files

- `AGENTS.md`
- `docs/starting-a-plan.md`
- `plans/02-events-companies-and-team-management.md`
- `docs/superpowers/plans/2026-07-29-plan2-events-companies-phases.md`
- `docs/api-conventions.md`
- `docs/ui-conventions.md`
- `docs/database-workflow.md`
- `docs/roles-and-access.md`
- `docs/architecture.md`
- Existing Phase 4 services:
  - `server/src/services/companyNormalization.js`
  - `server/src/services/companyDuplicateService.js`
- Existing event backend/frontend patterns:
  - `server/src/routes/eventRoutes.js`
  - `server/src/services/eventService.js`
  - `server/src/services/eventMemberService.js`
  - `server/src/services/sponsorshipPackageService.js`
  - `server/src/validators/eventValidators.js`
  - `client/src/features/events/*`
  - `client/src/api/index.js`
  - `client/src/App.jsx`
  - `client/src/layouts/AppShell.jsx`

## Scope

Implement only Plan 2 Phase 5 and Phase 6:

- Company/contact backend services, validators, routes, and API tests.
- Company directory frontend routes/pages/components/API client methods and focused client tests.
- Documentation/living-section updates needed for these two phases.

This is one integrated company slice: backend contract first, then frontend consuming that
contract. Do not skip backend tests before writing backend code, and do not write frontend code
against imagined endpoints.

## Backend Requirements

Create:

- `server/src/services/companyService.js`
- `server/src/services/companyContactService.js`
- `server/src/validators/companyValidators.js`
- `server/src/routes/companyRoutes.js`
- `server/tests/companies.test.js`

Modify:

- `server/src/app.js`
- `docs/api-conventions.md`
- `docs/roles-and-access.md` if company matrix details are added in this phase
- Plan 2 living sections and `docs/implementation-status.md`

Implement:

- `GET /api/companies`
  - Authenticated company-directory read access for all four roles.
  - Search `name`, `websiteDomain`, `generalEmail`, and `phone`.
  - Filter `sector`, `city`, and archived state.
  - Normal list excludes archived rows.
  - `archived=true` list is Admin-only in MVP.
  - Include active primary contact summary when available.
  - Return standard paginated envelope.
- `GET /api/companies/duplicates`
  - Authenticated read access.
  - Accept `name`, `website`, `generalEmail`/`email`, `phone`, `city`, and optional
    `excludeCompanyId`. The canonical Plan 2 prose listed only name/website/email/phone, but
    Phase 4 duplicate detection already uses `city` for medium-confidence warnings; exposing it
    here keeps pre-submit UI suggestions aligned with create/update conflict behavior. Edit forms
    must pass `excludeCompanyId` so a company does not warn about itself.
  - Use `findCompanyDuplicates()` from Phase 4.
  - Return matches with `companyId`, `name`, `confidence`, and `reasons`.
  - Cap and sort results through the Phase 4 service output; do not add unbounded frontend-style
    search semantics.
- `POST /api/companies`
  - Admin/Leader only.
  - Normalize identity fields with Phase 4 helpers.
  - Detect duplicates before create.
  - If any high-confidence match exists and `overrideReason` is absent or blank, return HTTP 409
    with stable error code and match details. Do not create a company.
  - If `overrideReason` is present, create and audit the override reason.
  - Optionally create one initial contact in the same transaction.
  - If the initial contact is primary, enforce one active primary contact in the same transaction.
  - This prompt chooses the canonical plan's nested initial contact option for create. The UI may
    still add more contacts afterwards through the separate contact endpoints.
- `GET /api/companies/:companyId`
  - Authenticated company-directory read access for all four roles.
  - Return company data, active contacts, primary contact, permissions, and an explicit
    sponsorship-history unavailable/empty section. Do not fake Plan 3 data.
- `PATCH /api/companies/:companyId`
  - Admin/Leader only.
  - Reject unknown fields.
  - Normalize changed identity fields.
  - Re-run duplicate checks when identity fields change, excluding the current company.
  - High-confidence duplicate update requires `overrideReason`.
  - Preserve original display name semantics: `name` remains a trimmed display name, not the
    normalized name.
  - Audit meaningful before/after values and override reason when used.
- `PATCH /api/companies/:companyId/archive`
  - Body should explicitly carry `{ archived: true | false }`.
  - Archive: Admin/Leader.
  - Restore: Admin only in MVP.
  - Idempotent archive/restore is allowed.
  - Audit archive/restore.
- Contact endpoints:
  - `GET /api/companies/:companyId/contacts`
  - `POST /api/companies/:companyId/contacts`
  - `PATCH /api/companies/:companyId/contacts/:contactId`
  - `PATCH /api/companies/:companyId/contacts/:contactId/archive`
  - `POST /api/companies/:companyId/contacts/:contactId/make-primary`
- Contact rules:
  - Reads are allowed for all authenticated company-directory roles.
  - Writes are Admin/Leader only.
  - Contact email and phone are normalized with Phase 4 helpers.
  - A contact requires email or phone.
  - Archived contacts are excluded from normal contact lists/detail serialization.
  - Make-primary must run in one transaction that clears other active primary contacts for the
    company and sets the selected active contact primary.
  - Making an already-primary contact primary succeeds.
  - Archive/restore body should explicitly carry `{ archived: true | false }`.
  - Contact restore can be Admin/Leader unless implementation finds a Plan 2 rule requiring
    Admin-only; record the decision if chosen.
  - Audit create, update, archive, restore, and primary changes.

Backend error-code additions should be stable and documented. Expected codes include at least:

- `COMPANY_NOT_FOUND`
- `COMPANY_DUPLICATE_HIGH_CONFIDENCE`
- `COMPANY_CONTACT_NOT_FOUND`

Use `VALIDATION_ERROR` for schema/contact-channel validation and `AUTH_FORBIDDEN` for role
authorization failures.

Before frontend work, make the Phase 5 API contract explicit enough for Phase 6 to consume:

- Add company/contact endpoints to `docs/api-conventions.md`.
- Add company/contact error codes and specify duplicate-conflict details as
  `error.details.matches`.
- Update `docs/roles-and-access.md` so Leaders no longer say company powers arrive later and the
  matrix states Admin/Leader write plus Member/Supervisor read-only.
- In `companyRoutes.js`, register `/duplicates` before `/:companyId`.

## Frontend Requirements

Create:

- `client/src/features/companies/CompaniesPage.jsx`
- `client/src/features/companies/CompanyFormPage.jsx`
- `client/src/features/companies/CompanyDetailPage.jsx`
- Feature-local constants/formatters/components if they reduce real complexity.
- Focused tests for list/form/detail behavior.

Modify:

- `client/src/api/index.js`
- `client/src/App.jsx`
- `client/src/layouts/AppShell.jsx`

Implement:

- Protected routes:
  - `/app/companies`
  - `/app/companies/new` guarded to Admin/Leader
  - `/app/companies/:companyId`
  - `/app/companies/:companyId/edit` guarded to Admin/Leader
- Add an Arabic Companies nav item visible to all authenticated roles.
- Add breadcrumbs for the company routes.
- Company list:
  - Search, sector filter, city filter, pagination.
  - Loading skeleton, empty state, and error state.
  - Create button only for Admin/Leader.
  - Archived filter/state only where permitted by backend behavior.
  - Display name, sector, city, website/domain, primary contact, archived state where available.
- Company form:
  - Create and edit modes.
  - Debounced duplicate suggestion on name and/or website changes.
  - Show match confidence and reasons before submit.
  - If backend returns a high-confidence conflict, show the details and require an override reason
    before retrying.
  - Do not let Members/Supervisors access write routes through UI.
- Company detail:
  - Company information, active contacts, primary contact.
  - Contact add/edit/archive controls only when backend permissions allow.
  - Make-primary action.
  - Contact validation in UI, with backend errors preserved.
  - Plan 3 sponsorship-history placeholder only; no fake cases, assignments, interactions,
    analytics, recommendations, or financial sponsorship state.
  - Usable tablet-width layout.

Frontend conventions:

- Arabic user-facing copy.
- Role tokens remain English via existing role constants where applicable.
- Use `@mui/material/Grid2` for Grid.
- Use logical CSS properties in `sx`.
- Every `catch` uses `getErrorMessage(err, fallback)`.
- Client tests call `afterEach(cleanup)`.
- Use native buttons/links or MUI components with accessible labels for icon-only controls.

## Explicit Non-Scope

Do not add:

- Sponsorship cases, event-company linking, assignments, statuses, offers, interactions,
  follow-ups, attachments, notifications, analytics, reports, or recommendations.
- New database tables or migrations unless a real blocker is proven before implementation.
- A global unique constraint on `companies.normalized_name`.
- React direct Supabase access.
- A controllers layer.
- New production dependencies.
- Member/Supervisor company writes.
- Fake sponsorship history.

## TDD Execution

Backend first:

1. Add failing Supertest/API tests for the Phase 5 acceptance scenario.
2. Verify the tests fail for missing company routes/services.
3. Implement minimal validators/routes/services.
4. Re-run focused server tests until green.

Frontend second:

1. Add failing React Testing Library tests for Phase 6 acceptance behavior.
2. Verify they fail for missing company pages/API methods.
3. Implement minimal pages and client methods.
4. Re-run focused client tests until green.

After focused tests pass:

- Run `npm run lint`
- Run `npm run format:check`
- Run `npm run test`
- Run `npm run build`

`npm run db:migrate` is not expected for these phases if no migrations are added.

## Review Before Completion

Before claiming done:

- Run a read-only scope search proving no Plan 3 sponsorship-case code was added.
- Verify `server/src/app.js` mounts `/api/companies` after existing routers.
- Verify client does not import Supabase or query the DB directly.
- Verify all company/contact mutations audit inside the same transaction.
- Verify duplicate conflicts expose match details without creating records.
- Verify member/supervisor direct API writes fail.
- Update Phase 5 and Phase 6 checkboxes only after validation is green.
- Commit locally with a clear message. Do not push.

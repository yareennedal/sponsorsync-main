# Plan 2 Phase 4 Execution Prompt

You are implementing **only Phase 4** of SponsorSync Plan 2 on branch
`feature/plan2-events-companies`.

## Required Skills

- Use `supabase` because SponsorSync stores data in Supabase PostgreSQL through Sequelize.
- Use `sequelize` because duplicate detection reads the `Company` model.
- Use `nodejs-backend-patterns` for focused backend service structure.
- Use `test-driven-development` and `vitest-testing`; write failing tests before production code.
- Use `security-review` for user input normalization and query safety.

## Read First

Read these completely before editing:

- `AGENTS.md`
- `plans/02-events-companies-and-team-management.md`
- `docs/superpowers/plans/2026-07-29-plan2-events-companies-phases.md`
- `docs/api-conventions.md`
- `docs/database-workflow.md`
- `docs/roles-and-access.md`
- `docs/architecture.md`

## Current State

- Phase 1 created company and contact schema/models.
- Phase 2 implemented event backend only.
- Phase 3 implemented event frontend only.
- There are no company routes, validators, or company/contact services yet.
- `Company` already has fields needed for duplicate detection:
  `normalizedName`, `city`, `websiteDomain`, `generalEmail`, `phone`, and `archivedAt`.
- `server/tests/helpers.js` already truncates company tables.

## Scope

Implement only:

- `server/src/services/companyNormalization.js`
- `server/src/services/companyDuplicateService.js`
- `server/tests/companyNormalization.test.js`
- `server/tests/companyDuplicates.test.js`
- Minimal constants/docs updates needed to record Phase 4.

Do **not** implement:

- `companyRoutes.js`
- `companyValidators.js`
- `companyService.js`
- `companyContactService.js`
- `GET /api/companies/duplicates`
- `POST /api/companies`
- high-confidence duplicate HTTP 409 behavior
- override-reason handling
- company frontend
- sponsorship cases, event-company links, history, analytics, notifications, or Plan 3 behavior
- new migrations or schema changes
- a unique constraint on `companies.normalized_name`

The canonical Plan 2 Milestone 4 text mentions endpoint and create-override acceptance. Treat
those as Phase 5 API acceptance. Phase 4 only builds the deterministic service layer Phase 5 will
wire into routes.

## Required Behavior

### Normalization

Implement deterministic helpers:

- `normalizeCompanyName(value)`
  - trim leading/trailing whitespace
  - collapse repeated whitespace
  - lowercase
  - remove conservative non-identifying punctuation
  - do not remove legal suffix words such as `co`, `llc`, `bank`, or `group`
  - return an empty string for empty/null input

- `normalizeWebsiteDomain(value)`
  - accept full URLs or bare domains
  - lowercase hostname
  - strip protocol, path, query, fragment, credentials, port, trailing dot, and leading `www.`
  - reject malformed domains by throwing `AppError` with `VALIDATION_ERROR`
  - return `null` for empty/null input

- `normalizeCompanyEmail(value)`
  - trim and lowercase using the existing email style
  - validate basic email shape
  - throw `AppError` with `VALIDATION_ERROR` for malformed email
  - return `null` for empty/null input

- `normalizeCompanyPhone(value)`
  - trim spaces and common formatting separators
  - preserve one optional leading `+`
  - do not invent a country code
  - throw `AppError` with `VALIDATION_ERROR` for malformed leftovers
  - return `null` for empty/null input

- `normalizeCompanyIdentity(payload)`
  - preserve display fields where appropriate
  - return normalized fields useful for create/update later:
    `name`, `normalizedName`, `website`, `websiteDomain`, `generalEmail`, `phone`, `city`

### Duplicate Detection

Implement deterministic duplicate detection:

- Export confidence labels, preferably from `plan2Constants.js`:
  `COMPANY_DUPLICATE_CONFIDENCE = { HIGH, MEDIUM, LOW }`.
- `findCompanyDuplicates({ input, excludeCompanyId, includeArchived })`
  - normalize the input using Phase 4 helpers
  - query existing `Company` rows through Sequelize
  - exclude archived companies unless `includeArchived` is true
  - exclude `excludeCompanyId` when provided
  - return matches ordered by confidence (`HIGH`, `MEDIUM`, `LOW`) and then company name
  - each match includes `companyId`, `name`, `confidence`, and `reasons`
  - reasons should be specific and explainable, such as:
    `same website domain`, `same normalized name`, `same phone`, `same email`,
    `same city`, `same email domain`, `similar normalized name`

Confidence rules:

- `HIGH` for same non-empty website domain.
- `HIGH` for same normalized name plus same phone or same email.
- `MEDIUM` for same normalized name and same city.
- `MEDIUM` for same email domain with similar normalized name.
- `LOW` for similar normalized name only.
- Do not claim certainty. These are warnings.

Use deterministic string similarity only. Do not call external AI APIs or add dependencies.

## Tests First

Create tests before implementation and watch them fail:

- `server/tests/companyNormalization.test.js`
  - punctuation and whitespace
  - case normalization
  - website URL/path/query/fragment/leading-www handling
  - empty values
  - invalid website/email/phone input
  - phone separator stripping and leading-plus preservation

- `server/tests/companyDuplicates.test.js`
  - high confidence by same domain
  - high confidence by normalized name plus phone/email
  - medium confidence by normalized name plus city
  - medium confidence by same email domain plus similar name
  - low confidence by similar name only
  - archived rows excluded by default and included when requested
  - excluded company id is ignored
  - returns reasons and stable ordering

Run focused red tests first, then implement, then rerun focused tests.

## Documentation

When done, update:

- `docs/implementation-status.md`
- `plans/02-events-companies-and-team-management.md` living sections
- `docs/superpowers/plans/2026-07-29-plan2-events-companies-phases.md` Phase 4 checklist

Record that endpoint/override behavior stays Phase 5.

## Validation

Run:

```bash
npm --workspace server run test -- companyNormalization.test.js companyDuplicates.test.js
npm run lint
npm run format:check
npm run test
npm run build
```

Do not push.

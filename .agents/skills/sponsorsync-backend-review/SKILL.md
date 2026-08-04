---

name: sponsorsync-backend-review
description: Review completed or changed SponsorSync Node.js and Express backend code, API routes, authentication, authorization, Sequelize models and migrations, Supabase PostgreSQL queries, file handling, and business rules for correctness, security, transactions, validation, performance, and test quality. Activate when asked to review, audit, debug, verify, secure, QA, or approve backend, API, authentication, database, migration, or full-stack server changes. Do not activate for frontend-only work.
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# SponsorSync Backend Review

## Purpose

Perform an evidence-based review of SponsorSync backend and database changes.

The goal is to find real correctness, security, data-integrity, transaction, authorization, and maintainability problems before code is merged.

Do not modify code unless the user explicitly requests fixes.

## Required Companion Skills

After activation, inspect available skills and activate:

1. `code-reviewer`
2. `nodejs-backend-patterns`
3. `security-diff-scan`

When Sequelize, PostgreSQL, queries, migrations, indexes, constraints, transactions, or reporting are affected, activate `supabase-postgres-best-practices`, replacing the least relevant companion skill when necessary.

When Supabase Storage, signed URLs, buckets, service keys, or Supabase SDK behavior is affected, activate `supabase`.

Use `security-scan` only for milestone-level or repository-level audits, not ordinary single-feature diffs.

Use no more than three companion skills initially.

## Review Preparation

Before reviewing:

1. Read the user’s request.
2. Read the relevant SponsorSync implementation-plan milestone.
3. Inspect `git status`.
4. Inspect the backend and migration diff.
5. Identify affected routes.
6. Trace routes through middleware, controller, service, model, and database behavior.
7. Inspect related tests.
8. Inspect affected frontend API expectations when the response contract changed.
9. Identify environment and migration implications.

Review behavior outside the changed lines when the change affects shared middleware, models, or services.

## Architecture Checks

Verify that:

* The backend remains Node.js, Express, and JavaScript.
* No TypeScript architecture was introduced.
* Routes remain thin.
* Controllers handle HTTP concerns.
* Services own business logic.
* Database access follows existing repository conventions.
* Validation occurs before business logic.
* Authentication and authorization middleware execute in the correct order.
* Errors use the project’s established error format.
* The React client never receives database secrets.
* Supabase service credentials remain backend-only.
* Business rules are not moved into the frontend.
* New dependencies are justified and compatible.

## Authentication Review

Check:

* Passwords are never logged or returned.
* Password hashing uses the established secure mechanism.
* Login does not reveal whether an account exists unnecessarily.
* Inactive users cannot authenticate or continue privileged operations.
* Token or session verification is centralized.
* Token expiration is handled.
* Secrets are not hard-coded.
* Authentication middleware rejects malformed credentials.
* User identity is taken from verified authentication data, not request body fields.
* Password-reset or account-management paths cannot be abused.

## Authorization Review

For every changed protected route, identify:

* Who may call it
* Which event or record they may access
* Which role is required
* Whether ownership or event membership is required
* Whether inactive users are blocked
* Whether the database query itself is scoped safely

Check for:

* Missing authorization middleware
* Role-only checks without record-level checks
* Event members accessing unrelated events
* Members modifying another member’s sponsorship case
* Supervisors receiving write permissions
* Leaders controlling events they do not lead
* Identifier-based access to another user’s files or records
* Mass-assignment vulnerabilities
* Trusting `userId`, `createdBy`, `assignedMemberId`, or role values from the request

Hiding a frontend button is not authorization.

## Input Validation Review

Verify all external input:

* Request body
* Route parameters
* Query parameters
* File metadata
* Pagination
* Sort fields
* Filters
* Numeric values
* Dates
* Status values
* Role values
* UUIDs or identifiers

Check:

* Unknown fields
* Empty strings
* Incorrect types
* Negative sponsorship values
* Invalid status transitions
* Invalid dates
* Excessive string lengths
* Malformed pagination
* Unsafe sort-column selection
* SQL injection in raw queries
* Dangerous filenames or MIME assumptions

Validation must occur before database operations.

## Database Integrity Review

Inspect models and migrations for:

* Correct types
* Nullability
* Defaults
* Foreign keys
* Unique constraints
* Delete behavior
* Update behavior
* Indexes
* Check constraints where appropriate
* Timestamp behavior
* Archival strategy
* Money precision
* Enum or controlled-status behavior

For SponsorSync specifically, verify:

* One company cannot be added twice to the same event.
* Event membership cannot be duplicated.
* Company contacts reference valid companies.
* Sponsorship cases reference valid events and companies.
* Assigned members belong to the relevant event.
* Requested, offered, approved, and received amounts remain distinct.
* Financial values use appropriate decimal storage.
* In-kind records remain valid without cash values.
* Important historical records are not accidentally cascade-deleted.
* Audit records preserve critical changes.

Do not rely only on Sequelize model validation when PostgreSQL can enforce integrity.

## Migration Safety Review

For every migration, check:

* `up` behavior
* `down` behavior
* Existing-data compatibility
* Required backfill
* Locking impact
* Default values
* Nullability changes
* Constraint timing
* Index creation
* Rename safety
* Removal safety
* Deployment ordering
* Application compatibility during migration

Flag migrations that:

* Drop data without explicit approval.
* Add non-null fields to populated tables without a safe plan.
* Change meaning without migrating existing rows.
* Use irreversible operations without documenting them.
* Exist only in the shared database and not in Git.
* Depend on manual dashboard changes.

## Transaction and Concurrency Review

Use transactions for multi-step operations that must succeed or fail together.

Pay special attention to:

* Adding companies to events
* Claiming sponsors
* Assigning sponsors
* Reassigning sponsors
* Updating financial approvals
* Confirming received sponsorship
* Creating interaction and follow-up records together
* File metadata and storage coordination
* Audit-log creation

For sponsor claiming and assignment, verify:

1. Concurrent requests cannot both succeed.
2. The database locks or atomically updates the relevant record.
3. The result is verified after the update.
4. Assignment history is written consistently.
5. Audit logging is consistent.
6. Conflict responses use an appropriate status.
7. Failed operations roll back.

A frontend availability check does not prevent a race condition.

## Status Workflow Review

Verify that sponsorship transitions follow approved rules.

Check:

* Invalid jumps
* Reopening closed or declined records
* Approval without required data
* Receiving money before approval when prohibited
* Member permissions for sensitive transitions
* Leader override behavior
* Audit logging
* Reassignment effects
* Follow-up effects
* Date updates

Status must not be accepted blindly from arbitrary request input.

## Financial Review

Check:

* Decimal handling
* Rounding
* Currency assumptions
* Negative values
* Null versus zero
* Requested versus offered
* Offered versus approved
* Approved versus received
* Partial receipt
* In-kind estimated value
* Dashboard aggregation consistency
* Authorization for approvals and receipt confirmation
* Audit history

Avoid JavaScript floating-point calculations for authoritative stored financial totals when database decimal operations are more appropriate.

## File and Supabase Storage Review

When file behavior changes, verify:

* Allowed file types
* Size limits
* MIME validation
* Generated storage paths
* Filename sanitization
* Private buckets
* Signed URL expiration
* Authorization before URL creation
* Authorization before deletion
* Metadata consistency
* Failed upload cleanup
* Failed metadata cleanup
* Service-key confidentiality
* Cross-event and cross-user access prevention

A private bucket is insufficient when the backend generates signed URLs without record-level authorization.

## API Contract Review

For every changed endpoint, verify:

* HTTP method
* URL
* Authentication
* Authorization
* Request format
* Validation errors
* Conflict errors
* Not-found behavior
* Success status
* Response structure
* Pagination metadata
* Sorting behavior
* Backward compatibility

Check that the frontend and backend agree on:

* Field names
* Nullability
* Date format
* Numeric format
* Status values
* Error structure

## Error-Handling Review

Check for:

* Leaking stack traces
* Leaking SQL details
* Swallowed errors
* Incorrect status codes
* Generic success after partial failure
* Duplicate responses
* Unhandled promise rejection
* Missing async error propagation
* Logging sensitive values
* Missing request context
* Treating expected conflicts as server errors

Errors should be useful to developers without exposing sensitive internals to clients.

## Query and Performance Review

Inspect for:

* N+1 queries
* Unbounded result sets
* Missing pagination
* Missing indexes
* Filtering after loading all rows
* Large joins without limits
* Repeated aggregate queries
* Incorrect count behavior
* Expensive wildcard searches
* Loading unnecessary columns
* Dashboard waterfalls
* Inefficient report generation

Require evidence before suggesting premature optimization, but flag obvious scale and correctness problems.

## Audit Review

Critical actions should produce reliable audit records:

* User creation
* Role changes
* Activation changes
* Event changes
* Team changes
* Sponsor assignment
* Reassignment
* Sponsorship approval
* Received-value confirmation
* Sensitive file actions
* Administrative overrides

Verify:

* Actor identity
* Entity
* Action
* Timestamp
* Relevant before and after values
* Transaction consistency
* No password, token, or secret storage

## Required Negative Tests

For every protected feature, inspect or add tests for:

* No authentication
* Invalid authentication
* Inactive user
* Wrong role
* Correct role but wrong event
* Missing record
* Invalid identifier
* Missing field
* Malformed field
* Duplicate operation
* Concurrent operation
* Unexpected database failure

A happy-path controller test is not sufficient.

## Security Review Output

Findings must be ordered by severity:

* P0: Critical security issue, data loss, secret exposure, or complete authorization bypass
* P1: Serious authorization, transaction, integrity, or correctness defect
* P2: Important edge case, migration, performance, observability, or maintainability defect
* P3: Minor improvement

Each finding must include:

* Severity
* File and exact line
* Affected route or operation
* Vulnerability or defect
* Exploitation or failure scenario
* Impact
* Specific correction
* Regression test

Avoid speculative findings without a plausible execution path.

## Required Verification

Inspect repository scripts before running commands.

Run applicable:

* Backend unit tests
* API integration tests
* Authorization tests
* Database tests
* Migration checks
* Frontend contract tests
* Production build
* Security-focused tests
* Concurrency tests

For assignment concurrency, execute or inspect a test that launches at least two competing requests and proves only one succeeds.

## Completion Statement

End with:

Backend review scope:

* [reviewed files and workflows]

Skills activated:

* [skills]

Findings:

* [count by severity]

Commands executed:

* [commands and results]

Database and migration assessment:

* [assessment]

Security assessment:

* [assessment]

Unverified areas:

* [limitations]

When no material issue is found, say:

“No material backend defects found in the reviewed scope.”

Do not say the backend is secure in absolute terms.

# SponsorSync Implementation Plan 1: Repository Foundation, Database, Authentication, and Agent Workflow

This implementation plan is the first of four sequential plans. It must be completed and accepted before Plan 2 begins. The plan is intentionally self-contained so that a coding agent or a teammate who has not read the previous conversation can execute it from a clean Git repository.

This is a living execution document. While implementation proceeds, the sections named **Progress**, **Surprises and Discoveries**, **Decision Log**, and **Outcomes and Retrospective** must be updated. Do not mark this plan complete merely because the application compiles. Completion requires the observable behaviors and validation scenarios defined below.

## Purpose and Big Picture

At the end of this plan, SponsorSync will exist as a runnable full-stack JavaScript application with a React and Vite frontend, a Node.js and Express backend, and a shared Supabase-hosted PostgreSQL database. A seeded administrator will be able to sign in through the React interface, remain authenticated after refreshing the browser, access a protected dashboard shell, create and manage user accounts, assign one of four fixed roles, and sign out. Unauthorized users and disabled accounts will be rejected by the backend.

This plan also creates the repository rules that future coding agents must follow. It establishes the folder structure, scripts, coding standards, migration workflow, API conventions, testing approach, branch workflow, and persistent agent instructions. Later plans must build on these foundations rather than replacing them.

## Fixed Technical Decisions

These decisions are part of the approved SponsorSync architecture and must not be changed during this plan without recording the change in the Decision Log.

- The frontend uses React, Vite, and JavaScript. Do not introduce TypeScript files, TypeScript build configuration, or generated application code that requires TypeScript compilation.
- The backend uses Node.js, Express, and JavaScript with ECMAScript modules.
- The database is PostgreSQL hosted by Supabase. Supabase is used as managed database infrastructure and, in Plan 3, private object storage. React never connects directly to the database.
- The backend connects to PostgreSQL through Sequelize v6 and the `pg` driver.
- Database structure is managed only through JavaScript Sequelize migrations. Do not use `sequelize.sync()`, `sync({ alter: true })`, or manual dashboard edits as the team schema workflow.
- Authentication is implemented by the Node.js backend using bcrypt password hashes and a JWT stored in an HTTP-only cookie.
- The four fixed application roles are `ADMIN`, `LEADER`, `MEMBER`, and `SUPERVISOR`.
- Public self-registration is out of scope. An administrator creates accounts.
- The repository uses npm workspaces so one root installation can install the frontend and backend dependencies.
- The backend is the authority for authentication, authorization, validation, audit logging, and all database changes.
- The frontend may hide unauthorized controls, but hidden controls are not security. Every protected operation must also be rejected by backend middleware or service rules.
- All timestamps are stored in UTC and returned as ISO 8601 strings. The frontend formats them for the user.
- Monetary database fields introduced in later plans use PostgreSQL numeric values and are returned as strings or explicitly converted values to avoid silent floating-point errors.

## Scope

### Included in Plan 1

- Repository and workspace setup
- Persistent instructions for Codex, Copilot, Claude Code, or similar agents
- React/Vite JavaScript frontend scaffold
- Express JavaScript backend scaffold
- Shared scripts for local development, linting, formatting, testing, and building
- Supabase PostgreSQL connection through Sequelize
- JavaScript migrations and seeders
- Base database tables for users and audit logs
- Backend-managed login, logout, current-user, and password-change flows
- Fixed role-based authorization middleware
- Administrator user-management API and interface
- Protected frontend routes and role-aware navigation shell
- Standard error format and centralized error handling
- Health endpoint and database connectivity check
- Baseline unit and API tests
- GitHub pull-request and migration workflow documentation

### Explicitly Excluded from Plan 1

- Events and event teams
- Companies and contacts
- Sponsorship cases and assignments
- Interactions and follow-ups
- Attachments and Supabase Storage
- Dashboards, analytics, reports, leaderboard, or recommendations
- Password-reset emails or public signup
- Dynamic permission builders
- OAuth or social login
- Production hosting of the Node.js server

## Expected Repository Structure

The plan must produce this structure. Small supporting files may be added, but the main boundaries must remain recognizable.

    sponsorsync/
    ├── AGENTS.md
    ├── CLAUDE.md
    ├── README.md
    ├── package.json
    ├── package-lock.json
    ├── .nvmrc
    ├── .gitignore
    ├── .editorconfig
    ├── .prettierrc.json
    ├── eslint.config.js
    ├── .env.example
    ├── .agent/
    │   └── PLANS.md
    ├── .github/
    │   ├── copilot-instructions.md
    │   ├── pull_request_template.md
    │   └── workflows/
    │       └── validate.yml
    ├── docs/
    │   ├── architecture.md
    │   ├── api-conventions.md
    │   ├── database-workflow.md
    │   ├── roles-and-access.md
    │   ├── local-setup.md
    │   └── implementation-status.md
    ├── client/
    │   ├── package.json
    │   ├── vite.config.js
    │   ├── index.html
    │   └── src/
    │       ├── api/
    │       ├── app/
    │       ├── components/
    │       ├── features/auth/
    │       ├── features/users/
    │       ├── hooks/
    │       ├── layouts/
    │       ├── pages/
    │       ├── routes/
    │       ├── utils/
    │       ├── main.jsx
    │       └── App.jsx
    └── server/
        ├── package.json
        ├── .sequelizerc
        ├── migrations/
        ├── seeders/
        ├── tests/
        └── src/
            ├── config/
            ├── controllers/
            ├── db/
            ├── middleware/
            ├── models/
            ├── routes/
            ├── services/
            ├── utils/
            ├── validators/
            ├── app.js
            └── server.js

## Team Ownership During Plan 1

> **What actually happened:** Plan 1 was executed **solo by Person 1**, committing to `main`. The
> four-person split below was never used. From Plan 2 onward the team runs one plan per person,
> one at a time — see `docs/team-model.md`. This section is kept as a record of the original
> intent; it is not the model.

The four people work in parallel only where file ownership does not collide. Each person opens a separate feature branch from `develop` and submits a focused pull request.

### Person 1: Platform, Database, and Security Lead

Person 1 owns the root workspace, backend scaffold, Supabase connection, Sequelize migration setup, authentication services, user models, role middleware, seed administrator, and migration review. Person 1 is not allowed to silently absorb all backend work from later plans.

Suggested branch:

    feature/plan1-platform-auth

### Person 2: Frontend Foundation Lead

Person 2 owns the React/Vite scaffold, design system, routing, authentication context, login page, protected routes, navigation shell, and user-management interface. Person 2 must consume the documented API contract instead of importing backend code.

Suggested branch:

    feature/plan1-client-foundation

### Person 3: API Contract and Authorization Verification

Person 3 owns the API convention document, request validation patterns, authorization test matrix, and admin user-management backend endpoints after Person 1 has established the base auth middleware. Person 3 also reviews the database model names needed by future sponsorship modules.

Suggested branch:

    feature/plan1-user-api

### Person 4: Testing, CI, Documentation, and Developer Experience

Person 4 owns Vitest and Supertest configuration, frontend testing utilities, baseline tests, GitHub Actions validation, local setup documentation, pull-request template, and implementation-status document. Person 4 must verify the complete clean-clone workflow rather than testing only on an already configured machine.

Suggested branch:

    feature/plan1-quality-docs

## Agent Operating Rules

Create `AGENTS.md`, `.agent/PLANS.md`, `.github/copilot-instructions.md`, and `CLAUDE.md` during the first milestone. They should communicate the same project rules in formats recognized by different coding agents.

The root `AGENTS.md` must state at least the following:

- Read the active implementation plan completely before editing.
- Use JavaScript only. Do not add TypeScript.
- Keep React in `client/` and Node/Express in `server/`.
- React must call the backend API and must never query Supabase PostgreSQL directly.
- Use Sequelize migrations for schema changes. Never use automatic sync or manually edit the shared schema without a migration.
- Never edit an already merged migration. Create a new migration.
- Keep changes within the active milestone and record out-of-scope discoveries instead of implementing them.
- Run the validation commands listed in the active plan after every milestone.
- Stop and fix failed validation before starting the next milestone.
- Update `docs/implementation-status.md` and the active plan’s living sections before handing off.
- Never commit `.env`, database passwords, JWT secrets, Supabase service keys, generated uploads, or real sponsor data.
- Ask before introducing a new production dependency unless the active plan explicitly names it.
- Return a completion report listing changed files, migrations, tests, commands, results, remaining issues, and manual verification steps.

The `.agent/PLANS.md` file must define the expected execution-plan format used by all four plans. It should require purpose, context, milestones, exact commands, acceptance behavior, progress, discoveries, decisions, recovery, and final outcomes.

## API Conventions

Every API endpoint is prefixed by `/api`.

Successful responses use one of these shapes:

    {
      "success": true,
      "data": { ... }
    }

or

    {
      "success": true,
      "data": [ ... ],
      "meta": {
        "page": 1,
        "pageSize": 20,
        "total": 42,
        "totalPages": 3
      }
    }

Errors use this shape:

    {
      "success": false,
      "error": {
        "code": "AUTH_INVALID_CREDENTIALS",
        "message": "The email or password is incorrect.",
        "details": null
      }
    }

Rules:

- Controllers translate HTTP input and output.
- Services contain business rules and database transactions.
- Models contain Sequelize definitions and associations, not business workflows.
- Validators define request schemas with Zod.
- Middleware handles authentication, authorization, validation, and errors.
- Do not leak raw Sequelize, PostgreSQL, JWT, or stack-trace details to clients.
- Log server-side errors with a request identifier.
- Use HTTP 400 for malformed input, 401 for missing or invalid authentication, 403 for authenticated users without permission, 404 for inaccessible or missing resources, 409 for state or uniqueness conflicts, 422 for semantically invalid transitions, and 500 for unexpected failures.

## Database Naming and Data Rules

Use snake_case table and column names in PostgreSQL. Use singular PascalCase model names in JavaScript. Configure Sequelize model options explicitly so naming is predictable.

Use UUID primary keys generated by PostgreSQL for application entities. Enable the required PostgreSQL capability through the first migration if necessary, then use `gen_random_uuid()` as the default. Do not generate sequential public identifiers that expose record counts.

All mutable tables include:

- `id`
- `created_at`
- `updated_at`

Archivable records introduced later use `archived_at` instead of hard deletion. The user table uses `is_active` because disabled users must remain connected to historical records.

## Initial Database Schema

### `users`

Required columns:

- `id`: UUID primary key
- `full_name`: string, required, trimmed
- `email`: case-insensitive unique email; store normalized lowercase value
- `password_hash`: required string
- `role`: enum-like constrained string containing only `ADMIN`, `LEADER`, `MEMBER`, or `SUPERVISOR`
- `is_active`: boolean, default true
- `must_change_password`: boolean, default true for admin-created accounts and false for the seeded administrator only when explicitly configured
- `last_login_at`: nullable timestamp
- `created_by`: nullable UUID referencing `users.id`; null for the first seed administrator
- `created_at`
- `updated_at`

Required indexes and constraints:

- Unique normalized email
- Check constraint or database enum for role values
- Foreign key on `created_by` with `ON DELETE SET NULL`

### `audit_logs`

Required columns:

- `id`: UUID primary key
- `actor_user_id`: nullable UUID referencing `users.id`
- `action`: required string, such as `AUTH_LOGIN_SUCCESS`, `USER_CREATED`, or `USER_ROLE_CHANGED`
- `entity_type`: required string
- `entity_id`: nullable UUID
- `before_values`: nullable JSONB
- `after_values`: nullable JSONB
- `metadata`: nullable JSONB containing safe context such as request ID, not secrets
- `created_at`: timestamp

Audit logs are append-only through application behavior. Do not expose update or delete endpoints for them.

## Authentication Behavior

### Login

Endpoint:

    POST /api/auth/login

Input:

    {
      "email": "admin@example.com",
      "password": "a password"
    }

Required behavior:

1. Normalize the email to lowercase and trim whitespace.
2. Validate input before querying the database.
3. Find the user by normalized email.
4. Return the same generic 401 message for a missing user and an incorrect password.
5. Reject inactive users with a 403 response and a non-sensitive message.
6. Compare the password with bcrypt.
7. Update `last_login_at` only after a successful login.
8. Create an audit entry for successful login and a safe failed-login entry that does not record passwords.
9. Sign a JWT containing only the user identifier and a token version if implemented. Do not put the full user object or sensitive data in the token.
10. Set the token in an HTTP-only cookie.
11. Return the safe user profile: id, full name, email, role, active state, and password-change requirement.

Cookie settings:

- `httpOnly: true`
- `sameSite: "lax"`
- `secure: false` in local development and true when served over HTTPS
- a clear expiration, such as eight hours
- a stable cookie name such as `sponsorsync_session`

The backend CORS configuration must allow only the configured client origin and must allow credentials.

### Current user

Endpoint:

    GET /api/auth/me

Required behavior:

- Read the JWT from the HTTP-only cookie.
- Validate signature and expiration.
- Load the current user from the database so a changed role or disabled account takes effect without waiting for token expiration.
- Reject inactive or missing users.
- Return the safe profile.

### Logout

Endpoint:

    POST /api/auth/logout

Required behavior:

- Clear the session cookie using matching cookie options.
- Return success even if the cookie is already missing.
- Record an audit entry when the user identity is known.

### Change password

Endpoint:

    POST /api/auth/change-password

Input:

    {
      "currentPassword": "...",
      "newPassword": "...",
      "confirmPassword": "..."
    }

Rules:

- Require authentication.
- Verify the current password.
- Require the new password and confirmation to match.
- Define a documented minimum password policy without pretending it guarantees security. A practical project policy is at least 10 characters and at least three of uppercase, lowercase, number, and symbol categories.
- Reject reuse of the current password.
- Hash the new password.
- Set `must_change_password` to false.
- Audit the change without storing any password material.
- Clear the old session and require a new login, or increment a token version if that mechanism is implemented. Choose one behavior and document it.

## Authorization Behavior

Create two middleware layers:

- `authenticate`: proves the request belongs to an active database user.
- `authorizeRoles(...allowedRoles)`: rejects authenticated users whose current database role is not in the allowed list.

Examples:

- `GET /api/auth/me`: any authenticated role
- `GET /api/users`: `ADMIN` only
- `POST /api/users`: `ADMIN` only
- `PATCH /api/users/:id`: `ADMIN` only
- `PATCH /api/users/:id/status`: `ADMIN` only
- `GET /api/audit-logs`: `ADMIN` only in Plan 1

Do not create a dynamic permission table in this project phase. The role matrix belongs in `docs/roles-and-access.md` and backend route definitions.

## Administrator User Management

### User listing

Endpoint:

    GET /api/users?page=1&pageSize=20&search=&role=&status=

Requirements:

- Admin only
- Paginated
- Search by full name or email
- Optional role and active-status filters
- Never return password hashes
- Stable default ordering by newest created record, with a documented secondary order

### User creation

Endpoint:

    POST /api/users

Input:

    {
      "fullName": "Example Member",
      "email": "member@example.com",
      "role": "MEMBER",
      "temporaryPassword": "..."
    }

Requirements:

- Admin only
- Normalize email
- Reject duplicate email with HTTP 409
- Hash temporary password
- Set `must_change_password` to true
- Audit creation
- Return safe profile

### User update

Endpoint:

    PATCH /api/users/:id

Allowed fields:

- Full name
- Email
- Role

Rules:

- Admin only
- Reject unknown fields
- Prevent the currently authenticated admin from removing their own final administrative access if no other active admin exists.
- Audit before and after values excluding secrets.

### Activate or deactivate user

Endpoint:

    PATCH /api/users/:id/status

Input:

    {
      "isActive": false
    }

Rules:

- Admin only
- Prevent deactivation of the only active administrator.
- Prevent a user from deactivating themselves through this endpoint.
- Keep historical data.
- Audit the action.

### Temporary password reset by admin

Endpoint:

    POST /api/users/:id/reset-password

Rules:

- Admin only
- Accept a new temporary password
- Hash it and set `must_change_password` to true
- Do not return the hash
- Audit the reset

## Frontend Behavior

### Routing

Use React Router with at least these routes:

- `/login`
- `/change-password`
- `/app`
- `/app/users`
- `/app/profile`
- `/unauthorized`
- catch-all not-found route

The application must initialize authentication by calling `/api/auth/me`. While this request is pending, show a stable application loading state rather than briefly rendering protected content.

### Authentication state

Create a focused auth provider or equivalent state module containing:

- `user`
- `isLoading`
- `isAuthenticated`
- `login(credentials)`
- `logout()`
- `refreshUser()`

Axios must use the configured `VITE_API_URL` and `withCredentials: true`. Add a response interceptor that handles 401 by clearing client auth state and redirecting to login without causing redirect loops.

### Login page

The page must include:

- Email field
- Password field
- Submit button
- Loading state
- Accessible validation errors
- Generic invalid-credentials message
- No public registration link

After successful login:

- If `mustChangePassword` is true, redirect to `/change-password`.
- Otherwise redirect to `/app`.

### Protected application shell

The shell contains:

- SponsorSync branding
- Current user name and role
- Role-aware navigation
- Logout action
- Responsive sidebar or drawer
- Placeholder dashboard content explaining that event modules arrive in Plan 2

Navigation rules in Plan 1:

- All roles: Dashboard and Profile
- Admin only: Users
- No links yet for events, companies, or sponsorships

### User-management interface

Admin users must be able to:

- View a paginated user table
- Search by name or email
- Filter by role and active state
- Open a create-user form
- Edit name, email, and role
- Activate or deactivate an account
- Reset a temporary password

Forms must show server validation and conflict errors clearly. Do not optimistically claim success before the API returns.

## Milestone 1: Freeze the Repository Contract and Agent Instructions

Create the root workspace, documentation directories, agent instruction files, coding rules, branch rules, and the active plan location. Establish the rule that implementation plans are durable project memory and that failed verification blocks the next milestone.

Required work:

1. Initialize Git if needed and create `main` and `develop` conventions in documentation.
2. Create `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and `.agent/PLANS.md`.
3. Create `docs/architecture.md` describing the request path: React to Express to Sequelize to Supabase PostgreSQL.
4. Create `docs/database-workflow.md` with migration ownership and shared database rules.
5. Create `docs/api-conventions.md` with response and error formats.
6. Create `docs/roles-and-access.md` with the fixed role matrix.
7. Create `docs/implementation-status.md` with Plan 1 marked active.
8. Add `.gitignore`, `.editorconfig`, formatting config, and environment examples.

Acceptance:

- A fresh agent reading only the repository can identify the stack, commands, current plan, prohibited changes, and definition of done.
- No secret is committed.
- `git status` shows only intentional project files.

## Milestone 2: Scaffold the JavaScript Workspaces

Create the root npm workspace and both applications.

Root scripts should provide a stable interface such as:

    npm run dev
    npm run dev:client
    npm run dev:server
    npm run lint
    npm run format:check
    npm run test
    npm run build

Use `concurrently` or an equivalent explicitly approved package for running both development servers.

Client requirements:

- Scaffold using the React JavaScript template, not `react-ts`.
- Configure Vite proxy or use `VITE_API_URL`; choose one documented approach. The preferred approach is an explicit API URL so behavior remains clear.
- Add React Router, Axios, React Hook Form, Zod integration if used on the client, and Material UI or another single agreed UI library.
- Keep feature code grouped under `src/features`.

Server requirements:

- Express with ESM imports
- `helmet`, `cors`, `cookie-parser`, JSON parsing, request logging, and rate limiting
- A centralized error middleware registered last
- A 404 API handler
- `GET /api/health` returning application and database status
- Graceful shutdown that closes the Sequelize connection

Acceptance:

- `npm install` at the repository root installs all workspaces.
- `npm run dev` starts client and server.
- Opening the client displays the SponsorSync shell or login placeholder.
- `GET /api/health` returns HTTP 200 when the database is reachable and a clear non-200 result when it is not.
- `npm run build` produces a Vite production build.

## Milestone 3: Establish Sequelize and Reversible Migrations

Configure Sequelize using a Supabase PostgreSQL connection string kept only in `server/.env` or the chosen root environment file. Enable SSL as required by the Supabase connection. Limit the local connection pool to a sensible small number because four developers may run their own backend instances against one shared database.

Create JavaScript migrations for database capabilities, `users`, and `audit_logs`. Every migration must have a working `down` function.

Create Sequelize models and associations. Do not use automatic schema synchronization.

Create a seed file that reads seed administrator values from environment variables:

- `SEED_ADMIN_NAME`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

The seeder must be idempotent: rerunning it updates or leaves the same administrator rather than creating duplicates. Never place a real password in source control.

Migration workflow:

1. A developer creates a migration on a feature branch.
2. They run all migrations.
3. They undo the latest migration.
4. They rerun it.
5. They execute the relevant tests.
6. Person 1 reviews it.
7. After merge, one designated person applies it to the shared Supabase development database.
8. Nobody edits merged migration files.

Acceptance:

- A clean database can migrate from zero to the current schema.
- The last migration can be undone and reapplied without data corruption in a disposable environment.
- The seed produces exactly one configured administrator.
- The backend health endpoint confirms database connectivity.

## Milestone 4: Implement Backend Authentication and Authorization

Implement the authentication routes, user lookup, password verification, JWT cookie, current-user endpoint, logout, password change, rate limiting, and audit events.

Create reusable middleware:

- `authenticate`
- `authorizeRoles`
- `validateRequest`
- `notFoundHandler`
- `errorHandler`

Create utility functions for:

- normalized email
- safe user serialization
- async route handling
- application errors with code and status
- audit-log creation

Tests must cover:

- valid login
- invalid email
- invalid password
- inactive account
- missing cookie
- expired or malformed token
- current user whose role changed after token creation
- logout
- required password change
- password validation
- authorization success and failure

Acceptance:

- A valid seeded administrator receives the cookie and safe profile.
- An invalid login never reveals whether the email exists.
- A disabled user cannot continue using an old valid token because `/auth/me` and protected routes reload the active database user.
- Admin-only test routes reject all other roles.

## Milestone 5: Implement Administrator User Management

Create the user-management service, controllers, routes, validation, audit records, and tests. Then implement the matching frontend pages.

Backend tests must cover:

- admin lists users
- non-admin cannot list users
- duplicate email conflict
- role validation
- preventing deactivation of the only active admin
- preventing self-deactivation
- password hash never appears in responses
- reset password marks `must_change_password`

Frontend tests must cover:

- admin navigation includes Users
- member navigation excludes Users
- user table displays server data
- create-user form sends expected payload
- server conflict appears near the form
- disabled user status is visibly distinct

Acceptance:

- The seeded admin can create one user of each role.
- Each created user can log in with the temporary password and is directed to change it.
- A non-admin request to `/api/users` receives 403 even when manually sent outside the UI.

## Milestone 6: Complete Protected Frontend Authentication

Finish the auth provider, protected routing, login, password-change page, application shell, user menu, logout, API interceptors, loading behavior, and error boundaries.

Avoid these common failures:

- storing the JWT in localStorage
- briefly rendering protected content before `/auth/me` completes
- infinite redirects after a 401
- trusting the role stored in old frontend state after `/auth/me` changes it
- displaying raw backend stack traces

Acceptance scenario:

1. Start client and server.
2. Visit `/app` while signed out and observe redirect to `/login`.
3. Log in as the seeded admin.
4. Refresh the browser and remain signed in.
5. Create a member with a temporary password.
6. Sign out.
7. Sign in as the member and observe forced password change.
8. Complete the password change and sign in again.
9. Confirm the member cannot navigate to or call user-management endpoints.
10. Disable the member as admin, then verify their existing session is rejected on the next protected request.

## Milestone 7: Add Automated Validation and Clean-Clone Documentation

Configure JavaScript linting, formatting checks, Vitest, React Testing Library, Supertest, and GitHub Actions.

The CI workflow must:

1. Check out the repository.
2. Install the pinned Node version and dependencies with `npm ci`.
3. Run lint.
4. Run formatting check.
5. Run tests that do not require production secrets.
6. Build the client.

Database integration tests should use a clearly documented test connection and must clean up their own records. They must never run destructive reset commands against the shared development database. If a full database test is not safe in CI, keep service tests isolated and document the manual database verification command.

Person 4 must verify setup from a clean clone using only `README.md`, `.env.example`, and `docs/local-setup.md`.

Acceptance:

- CI passes on the plan branch.
- A teammate with the required environment values can clone, install, migrate, seed, run, and log in without undocumented steps.
- All root commands work from the repository root.

## Required Commands

The exact scripts may vary slightly, but the completed repository must support equivalent commands from the root.

    npm ci
    npm run lint
    npm run format:check
    npm run test
    npm run build
    npm run db:migrate
    npm run db:seed
    npm run dev

For migration verification in a disposable environment:

    npm run db:migrate
    npm run db:migrate:undo
    npm run db:migrate

The expected result of each validation command must be documented in `docs/local-setup.md`.

## Validation and Acceptance

Plan 1 is accepted only when all of the following are true:

- The repository contains durable agent instructions and this execution plan.
- No TypeScript application or config files were introduced.
- The frontend is React/Vite JavaScript.
- The backend is Node/Express JavaScript.
- The backend alone connects to Supabase PostgreSQL.
- Sequelize migrations can construct the schema from scratch.
- The seeded admin can log in through the UI.
- Authentication survives a browser refresh.
- Logout clears the session.
- Forced password change works.
- Fixed role middleware works on the backend.
- Admin user management works from interface to database.
- Non-admin requests are rejected even when sent manually.
- Password hashes and secrets never appear in API responses or logs.
- Lint, tests, and build pass.
- The clean-clone setup is documented and verified by someone other than the author.

## Idempotence and Recovery

- `npm install` and `npm ci` are safe to rerun.
- The seed administrator operation must be idempotent.
- Migrations must be reversible in a disposable environment.
- Never run `db:migrate:undo:all` against the shared Supabase database.
- If a migration has been merged and applied, repair it with a new migration rather than editing history.
- If the shared database drifts because of a manual dashboard edit, stop feature work, document the drift, produce a migration that reconciles the intended state, review it, and only then continue.
- If authentication cookies behave incorrectly, confirm the configured client origin, backend origin, CORS credentials, cookie `sameSite`, and browser secure-cookie rules before changing architecture.
- If a branch has broad unrelated changes, split it before review instead of accepting an unreviewable pull request.

## Pull Request and Handoff Requirements

Every pull request created during this plan must include:

- Plan and milestone identifier
- User-visible behavior implemented
- Files changed
- Migration files added
- API endpoints added or changed
- Security impact
- Tests added
- Validation commands and results
- Screenshots for frontend changes
- Known limitations
- Manual verification steps

The final Plan 1 handoff must also include:

- Shared Supabase environment setup instructions without exposing secrets
- The name of the latest migration
- Seed administrator procedure
- Route and role matrix
- Any deviations recorded in the Decision Log
- Confirmation that Plan 2 may begin

## Progress

Update this section while implementing. Use UTC timestamps.

- [x] Repository contract and agent instruction files created.
- [x] Root npm workspace and scripts created.
- [x] React/Vite JavaScript client scaffolded.
- [x] Express JavaScript server scaffolded.
- [x] Supabase PostgreSQL connection verified.
- [x] Sequelize migration and seeder workflow verified.
- [x] Users and audit-log schema created.
- [x] Authentication API implemented and tested.
- [x] Role authorization implemented and tested.
- [x] Protected frontend authentication implemented and tested.
- [x] Administrator user management implemented and tested.
- [x] CI and clean-clone documentation verified.
- [x] Plan 1 acceptance scenario passed.

## Surprises and Discoveries

Record unexpected behavior with concise evidence.

- Observation: Port 5173 was occupied on the dev machine by another app, so Vite silently fell back to 5174. With `CLIENT_ORIGIN=http://localhost:5173` in CORS, this would silently break auth cookies.
  Evidence: `curl http://localhost:5173` returned a different app's title ("Dispatch"); Vite logged "Port 5173 is in use, trying another one".
  Resolution: set `server.strictPort: true` in `client/vite.config.js` so Vite fails loudly if 5173 is taken, forcing the port to be freed instead of misconfiguring CORS.

- Observation: `eslint-plugin-react`'s recommended config enables `react/react-in-jsx-scope`, which errors under Vite's automatic JSX runtime (React need not be imported).
  Evidence: 12 `react/react-in-jsx-scope` errors on scaffold boot.
  Resolution: turned off that one rule in `eslint.config.js`; the rest of the recommended set (incl. `react/jsx-key`) stays on.

- Observation: `@testing-library/jest-dom`'s default entry calls `expect.extend` at import, requiring a global `expect`. Vitest was configured with globals off.
  Evidence: client test failed with `ReferenceError: expect is not defined` from `jest-dom/dist/index.mjs`.
  Resolution: setup imports the `/matchers` subpath and extends vitest's `expect` explicitly — no globals needed, no ESLint globals config.

- Observation: umzug's `resolve` passed bare Windows paths (`D:\\...`) to ESM `import()`, throwing `ERR_UNSUPPORTED_ESM_URL_SCHEME`.
  Evidence: `code: 'ERR_UNSUPPORTED_ESM_URL_SCHEME'` on first `db:migrate` after the connection succeeded.
  Resolution: convert migration paths with `pathToFileURL(path).href` before `import()` in `server/src/config/umzug.js`.

- Observation: `dotenv/config` loads `.env` from CWD, so root scripts (`npm run db:migrate`) couldn't see `server/.env`.
  Evidence: env check from repo root reported all keys MISSING despite `server/.env` being filled.
  Resolution: `server/src/config/env.js` loads `server/.env` by absolute path relative to the config file, robust to any CWD.

- Observation: seeder passed snake_case column names (`full_name`, `password_hash`) to `findOrCreate`, but Sequelize expects JS attribute names (`fullName`, `passwordHash`).
  Evidence: `Unknown attributes (full_name,password_hash,is_active,must_change_password) passed to defaults option` + `notNull Violation: User.fullName cannot be null`.
  Resolution: seeder uses camelCase JS attribute names.

- Observation: migration tests polluted across runs — leftover rows from a prior run made the unique-email test fail with `SequelizeUniqueConstraintError` on the second run.
  Evidence: 3 tests failed on the second `npm run test` despite passing on the first.
  Resolution: `beforeAll` truncates `users, audit_logs` so each run starts from a clean slate (tests must clean up their own rows, per the plan).

- Observation: `npm run test` relied on the shell having `NODE_ENV=test` set; without it, tests would hit the dev database.
  Evidence: server tests ran against dev when NODE_ENV was unset from the shell.
  Resolution: `server/vitest.config.js` sets `process.env.NODE_ENV = 'test'` so the test DB is selected regardless of shell env — CI-safe.

- Observation: the first connection attempt failed with `28P01 password authentication failed` even though host/port/SSL were correct.
  Evidence: `ConnectionError [SequelizeConnectionError]: password authentication failed for user "postgres"`, code `28P01`.
  Root cause: the dev DB password (leaked earlier in chat) had been rotated; the connection string still held the old value. A single-use password reset + URL-encoding of special characters resolved it.
  Resolution: user rotated and updated `DATABASE_URL_DEV` / `DATABASE_URL_TEST`. Recorded as a reminder that connection-string passwords must be URL-encoded when they contain `@:/#?%&` or spaces.

- Observation: vitest runs test files in parallel by default; the migration test's `TRUNCATE TABLE users` wiped the auth test's seeded admin mid-run.
  Evidence: auth test login returned 401 with `dbAdmin exists: false`; both files hit the same test DB.
  Resolution: `fileParallelism: false` in `server/vitest.config.js` — single shared test DB, sequential file execution. Cheaper than a per-test transaction isolation layer at this scale (ponytail).

- Observation: the `authzApp` test helper omitted `cookie-parser` and `errorHandler`, so `authenticate` saw no cookie (401) and `authorizeRoles`' AppError was unformatted (`out.body.error` undefined).
  Evidence: `Cannot read properties of undefined (reading 'code')`; `expected 401 to be 403`.
  Resolution: minimal test app now mounts `cookieParser()` and `errorHandler` so the guard chain behaves like the real app.

- Observation: the last-admin and self-deactivate guards overlap when only one active admin exists — any admin reaching the admin-only status endpoint to deactivate the only admin IS that admin, so self-deactivate always fires first; the independent last-admin path is effectively unreachable in Plan 1.
  Evidence: test expected `USER_LAST_ADMIN` but got `USER_SELF_DEACTIVATE`; analysis showed no HTTP path reaches last-admin without also hitting self-deactivate first.
  Resolution: test asserts either code (`['USER_SELF_DEACTIVATE','USER_LAST_ADMIN']`) and verifies the admin remains active — the effective protection, not the specific guard name.

- Observation: a redundant fresh-login in a user test produced `PATCH /api/users/undefined/status` (500) because the login/me sequence was fragile.
  Evidence: `me.body.data.id` was undefined on one run; the existing beforeAll admin session was already proven.
  Resolution: reuse the working `adminCookie` and resolve the actor id from the users list instead of re-logging-in.

- Observation: `@mui/icons-material` was a separate package from `@mui/material`; importing icons without installing it broke both build and test.
  Evidence: `Failed to resolve import "@mui/icons-material/Menu"`.
  Resolution: installed `@mui/icons-material@^6.4.0` (matches the material v6 line).

- Observation: client App test rendered `Loading…` (the auth init gate) instead of the login brand, because AuthProvider calls `/api/auth/me` on mount and jsdom has no backend.
  Evidence: `Unable to find an element with the text: /SponsorSync/i`; body showed `Loading…`.
  Resolution: test uses `waitFor` (async) so it waits for the me() promise to settle (fails in jsdom), after which isLoading flips false and the login page renders.

- Observation: GitHub Actions runners have no IPv6 outbound route; Supabase's direct connection (`db.<ref>.supabase.co:5432`) resolves to IPv6 first, so CI DB tests failed with `connect ENETUNREACH <ipv6>:5432`.
  Evidence: CI log `SequelizeConnectionError: connect ENETUNREACH 2a05:d01c:...:5432 - Local (:::0)` on all 3 DB test files; client test (no DB) passed.
  Resolution: CI secret `SUPABASE_TEST_DB_URL` must use Supabase's **Session pooler** URL (`aws-0-<region>.pooler.supabase.com:5432`, username `postgres.<ref>`) instead of the direct URL. The pooler is IPv4-friendly and is Supabase's documented connection for serverless/CI. Local dev may keep the direct URL (developer machines usually have IPv6). Applies to every future plan's CI.

## Decision Log

Record decisions made during implementation.

- Decision: Use Sequelize v6 and JavaScript migrations instead of current Prisma tooling.
  Rationale: SponsorSync has a strict JavaScript-only requirement, while current Prisma setup and generated client workflows center on TypeScript. Sequelize v6 is stable, supports PostgreSQL transactions and associations, and its migration files are reversible JavaScript.
  Date/Author: Initial architecture decision.

- Decision: Use backend-managed JWT authentication in an HTTP-only cookie.
  Rationale: The backend remains the authority, the token is not exposed to frontend JavaScript, and the local Vite/Express workflow remains simple enough for the graduation scope.
  Date/Author: Initial architecture decision.

- Decision: Add a `token_version` integer column to `users`; store it in the JWT and compare on every protected request.
  Rationale: A single bump invalidates all existing tokens on password change or account deactivation, satisfying the plan's "disabled user's existing session is rejected on the next protected request" requirement immediately, without waiting for token expiry and without a separate invalidation service per scenario.
  Date/Author: 2026-07-24, bashar (resolved in pre-execution grilling).

- Decision: Use two Supabase projects — `dev` for development, `test` for CI and local integration tests.
  Rationale: CI needs a real PostgreSQL to validate schema, auth, and (in Plan 3) concurrency, but must never destructive-reset the shared dev database. A separate free-tier project gives CI real teeth without risking shared dev data.
  Date/Author: 2026-07-24, bashar.

- Decision: Minimal npm workspaces + `concurrently` at the root. No Turborepo/NX/Lerna.
  Rationale: Two workspaces with no shared build-cache benefit do not need a task orchestrator. The plan explicitly approves `concurrently`; adding more is unrequested abstraction.
  Date/Author: 2026-07-24, bashar.

- Decision: Two environment files — `server/.env` (secrets) and `client/.env` (`VITE_*` only). No root `.env`.
  Rationale: A physical public/private boundary. Vite only ever sees `VITE_*` vars, so a stray Supabase service role key can never leak into the client bundle. Enforces the "React never connects to the database" rule at the file level.
  Date/Author: 2026-07-24, bashar.

- Decision: ESM throughout; migrations run via umzug (Sequelize's official ESM runner), not sequelize-cli.
  Rationale: Honors the plan's "ECMAScript modules" fixed decision and dissolves the known sequelize-cli + `"type": "module"` friction. Migrations are ESM `.js` files with `up`/`down`; one module system everywhere.
  Date/Author: 2026-07-24, bashar.

- Decision: Use the single direct Supabase connection (port 5432) for both migrations and runtime, not a separate pooler URL.
  Rationale: For a solo graduation project with a small connection pool (max 5), the direct Session-mode connection handles DDL locks and runtime fine. Adding a pooler URL doubles config surface for no benefit at this scale. Revisit only if Plan 4 hardening shows connection exhaustion.
  Date/Author: 2026-07-24, bashar.

- Decision: Solo Plan 1 work commits directly to `main`. The `develop` branch and PR template are created as artifacts for future team PRs, not used for self-review on an empty repo.
  Rationale: Solo work on an empty repo does not need a PR-to-merge ceremony. The structure exists when teammates arrive in Plan 2. Commits stay milestone-scoped for clean revert points.
  Date/Author: 2026-07-24, bashar.

## Outcomes and Retrospective

Complete this section when Plan 1 finishes. Summarize what works, what remains, test evidence, architectural lessons, and any changes Plan 2 must know.

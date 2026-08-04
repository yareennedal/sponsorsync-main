# SponsorSync Database Workflow

## Connection

- PostgreSQL on Supabase, accessed via Sequelize v6 with the `pg` driver.
- The connection string lives only in `server/.env` (`DATABASE_URL_DEV` / `DATABASE_URL_TEST`). It is never committed, never exposed to the client, never logged.
- Enable SSL as Supabase requires. A small local connection pool is used because multiple developers may run their own backend against one shared database.

## Migrations (ESM via umzug)

Schema changes are managed only through JavaScript migrations run via **umzug** (Sequelize's official migration runner, ESM-native). This honors the plan's "ECMAScript modules" fixed decision without the `sequelize-cli` + `"type": "module"` friction.

- Each migration is an ESM `.js` file exporting `async function up(queryInterface, Sequelize)` and `async function down(queryInterface, Sequelize)`.
- Every migration must have a working `down`.
- UUIDs come from PostgreSQL `gen_random_uuid()`: the first migration enables `pgcrypto` if needed.

### Never

- `sequelize.sync()` or `sync({ alter: true })`.
- Manual dashboard edits to the shared schema.
- Editing an already-merged migration. Fix drift with a new migration instead.
- Running `db:migrate:undo:all` against the shared Supabase dev or test database.

### Always

- Run `npm run db:migrate` then `npm run db:migrate:undo` then re-run, in a disposable environment, to verify reversibility.
- Coordinate migration order across feature branches so two branches don't create conflicting associations.

## Seeders

The seed administrator is idempotent. The seeder reads `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` from `server/.env` and upserts exactly one admin. Rerunning it updates or leaves the same administrator — never creates duplicates. No real password is committed to source control.

## Shared database rules

- Four developers may run their own backend against one shared Supabase dev database. Keep the pool small; never run destructive reset commands.
- The test database is a separate Supabase project. CI uses `DATABASE_URL_TEST` from GitHub Secrets. Tests clean up their own rows; they never `db:migrate:undo:all` against either database.
- If the shared database drifts from a manual edit, stop feature work, document the drift, write a reconciling migration, review it, then continue.

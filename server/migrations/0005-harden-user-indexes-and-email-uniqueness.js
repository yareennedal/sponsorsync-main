// Email case-insensitivity and index shapes that match the queries the app actually runs.
//
// Before this, "case-insensitive unique email" (plans/01, users table spec) was enforced
// only by normalizeEmail() in application code: the unique index was on the raw column, so
// any write path that skipped the helper could insert A@x.com beside a@x.com. Login
// lowercases its input, so that account could never sign in and the address could be
// registered twice.
//
// The index changes are not a performance emergency at graduation-project row counts. They
// are here because Plans 2-4 will copy these shapes, and the shipped ones did not match the
// shipped queries: users are sorted by created_at (unindexed) and filtered by role plus
// is_active together (two separate single-column indexes), while both OTP tables are queried
// by user_id first and indexed without it.

export async function up(queryInterface) {
  const q = queryInterface.sequelize;

  // 1. Case-insensitive uniqueness, enforced by the database rather than by discipline.
  await q.query('DROP INDEX IF EXISTS users_email_unique;');
  await q.query('CREATE UNIQUE INDEX users_email_unique ON users ((lower(email)));');
  // And make a non-normalized write fail loudly instead of accumulating silently.
  await q.query(
    'ALTER TABLE users ADD CONSTRAINT users_email_is_lowercase CHECK (email = lower(email));',
  );

  // 2. Index shapes matching the real queries.
  await q.query('DROP INDEX IF EXISTS users_role_idx;');
  await q.query('DROP INDEX IF EXISTS users_is_active_idx;');
  await q.query(
    'CREATE INDEX users_role_active_created_idx ON users (role, is_active, created_at DESC);',
  );

  await q.query('DROP INDEX IF EXISTS password_reset_otps_used_expires_idx;');
  await q.query(
    'CREATE INDEX password_reset_otps_lookup_idx ON password_reset_otps (user_id, used, expires_at);',
  );

  await q.query('DROP INDEX IF EXISTS email_change_otps_used_expires_idx;');
  await q.query(
    'CREATE INDEX email_change_otps_lookup_idx ON email_change_otps (user_id, used, expires_at);',
  );

  // 3. Plan 4 filters the audit log by action over the whole table.
  await q.query(
    'CREATE INDEX audit_logs_action_created_idx ON audit_logs (action, created_at DESC);',
  );
}

export async function down(queryInterface) {
  const q = queryInterface.sequelize;

  await q.query('DROP INDEX IF EXISTS audit_logs_action_created_idx;');

  await q.query('DROP INDEX IF EXISTS email_change_otps_lookup_idx;');
  await q.query(
    'CREATE INDEX email_change_otps_used_expires_idx ON email_change_otps (used, expires_at);',
  );

  await q.query('DROP INDEX IF EXISTS password_reset_otps_lookup_idx;');
  await q.query(
    'CREATE INDEX password_reset_otps_used_expires_idx ON password_reset_otps (used, expires_at);',
  );

  await q.query('DROP INDEX IF EXISTS users_role_active_created_idx;');
  await q.query('CREATE INDEX users_role_idx ON users (role);');
  await q.query('CREATE INDEX users_is_active_idx ON users (is_active);');

  await q.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_is_lowercase;');
  await q.query('DROP INDEX IF EXISTS users_email_unique;');
  await q.query('CREATE UNIQUE INDEX users_email_unique ON users (email);');
}

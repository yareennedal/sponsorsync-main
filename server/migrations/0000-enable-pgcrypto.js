// Enable the pgcrypto extension so gen_random_uuid() is available as a column default.
export async function up(queryInterface) {
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
}

// Deliberately a no-op. pgcrypto is provisioned and shared by Supabase, and the docs tell
// teammates to verify reversibility by undoing migrations — against the shared dev project.
// Dropping it there breaks Supabase internals for all four developers at once. PostgreSQL 13+
// also provides gen_random_uuid() in core, so nothing here depends on the extension anyway.
export async function down() {}

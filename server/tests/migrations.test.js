import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sequelize } from '../src/db/index.js';
import { User } from '../src/models/index.js';
import { migrator } from '../src/config/umzug.js';

// Runs against DATABASE_URL_TEST (set NODE_ENV=test). Never touches dev.
// ponytail: migration test is the one runnable check for the up/down round-trip.
describe('migrations and models (test database)', () => {
  beforeAll(async () => {
    if (!sequelize) throw new Error('DATABASE_URL_TEST must be set for migration tests');
    await migrator.up();
    // Clean slate: tests must not depend on leftover rows from prior runs.
    await sequelize.query('TRUNCATE TABLE users, audit_logs RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await sequelize?.close();
  });

  it('creates users and audit_logs tables', async () => {
    const [users] = await sequelize.query(
      "SELECT to_regclass('public.users') AS users, to_regclass('public.audit_logs') AS audit_logs",
    );
    const row = users[0];
    expect(row.users).toBe('users');
    expect(row.audit_logs).toBe('audit_logs');
  });

  it('enforces the role enum', async () => {
    await expect(
      User.create({
        fullName: 'Bad Role',
        email: 'badrole@test.local',
        passwordHash: 'x',
        role: 'WIZARD',
      }),
    ).rejects.toThrow();
  });

  it('enforces unique normalized email', async () => {
    await User.create({
      fullName: 'Dup One',
      email: 'dup@test.local',
      passwordHash: 'x',
      role: 'MEMBER',
    });
    await expect(
      User.create({
        fullName: 'Dup Two',
        email: 'dup@test.local',
        passwordHash: 'x',
        role: 'MEMBER',
      }),
    ).rejects.toThrow();
  });

  it('defaults is_active and must_change_password and token_version', async () => {
    const u = await User.create({
      fullName: 'Defaults User',
      email: 'defaults@test.local',
      passwordHash: 'x',
      role: 'MEMBER',
    });
    expect(u.isActive).toBe(true);
    expect(u.mustChangePassword).toBe(true);
    expect(u.tokenVersion).toBe(0);
  });

  it('has a UUID primary key', async () => {
    const u = await User.create({
      fullName: 'Uuid User',
      email: 'uuid@test.local',
      passwordHash: 'x',
      role: 'MEMBER',
    });
    expect(u.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  // The "case-insensitive unique email" rule used to live only in normalizeEmail(). Any
  // write path that skipped the helper — a seed script, a bulk import, a test fixture —
  // could create A@x.com beside a@x.com, and neither account could then log in reliably.
  describe('email uniqueness is enforced by the database', () => {
    it('rejects a duplicate that differs only in case', async () => {
      await User.create({
        fullName: 'Lower',
        email: 'case-test@test.local',
        passwordHash: 'x',
        role: 'MEMBER',
      });
      await expect(
        sequelize.query(
          `INSERT INTO users (id, full_name, email, password_hash, role, created_at, updated_at)
           VALUES (gen_random_uuid(), 'Upper', 'CASE-TEST@test.local', 'x', 'MEMBER', now(), now())`,
        ),
      ).rejects.toThrow();
    });

    it('rejects a non-normalized email outright', async () => {
      await expect(
        sequelize.query(
          `INSERT INTO users (id, full_name, email, password_hash, role, created_at, updated_at)
           VALUES (gen_random_uuid(), 'Mixed', 'MiXeD@test.local', 'x', 'MEMBER', now(), now())`,
        ),
      ).rejects.toThrow();
    });
  });
});

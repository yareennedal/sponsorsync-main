import bcrypt from 'bcryptjs';
import { sequelize } from '../src/db/index.js';
import { User } from '../src/models/index.js';
import { normalizeEmail } from '../src/utils/normalizeEmail.js';
import { migrator } from '../src/config/umzug.js';

// Test helpers. Run against the test database (NODE_ENV=test).
// Clean slate per file: truncate all application tables touched by tests.
// Every new table must be added to this list.
export async function resetDb() {
  await migrator.up();
  await sequelize.query(
    'TRUNCATE TABLE company_contacts, companies, sponsorship_packages, event_members, events, users, audit_logs RESTART IDENTITY CASCADE',
  );
}

export async function createUser({
  fullName = 'Test User',
  email,
  password = 'Password123!',
  role = 'MEMBER',
  isActive = true,
  mustChangePassword = false,
  tokenVersion = 0,
} = {}) {
  // Normalize like every production write path does. Fixtures that skip this are the
  // pattern teammates copy, and the DB now enforces lowercase with a CHECK constraint.
  return User.create({
    fullName,
    email: normalizeEmail(email),
    passwordHash: await bcrypt.hash(password, 10),
    role,
    isActive,
    mustChangePassword,
    tokenVersion,
  });
}

import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { User } from '../src/models/index.js';

function normalizeEmail(value) {
  return String(value).trim().toLowerCase();
}

// Idempotent: creates the seed admin if missing, or updates name/password/role/active
// if it already exists. Rerunning never creates duplicates.
export async function seedAdmin() {
  const { name, email, password } = env.seedAdmin;
  if (!email || !password || !name) {
    throw new Error('SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD must be set.');
  }

  const normalized = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, 10);

  const [admin, created] = await User.findOrCreate({
    where: { email: normalized },
    defaults: {
      fullName: name,
      email: normalized,
      passwordHash: passwordHash,
      role: 'ADMIN',
      isActive: true,
      // Seeded admin must change password on first login (securest default).
      mustChangePassword: true,
      createdBy: null,
    },
  });

  if (!created) {
    // Model attribute names, not column names. Sequelize silently drops keys that are not
    // attributes, so the snake_case version wrote only `role` while printing "updated" —
    // rotating SEED_ADMIN_PASSWORD appeared to work and did nothing.
    await admin.update({
      fullName: name,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    });
  }

  console.log(`Seed admin ${created ? 'created' : 'updated'}: ${admin.email} (id: ${admin.id})`);
  return admin;
}

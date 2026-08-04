import { migrator } from '../config/umzug.js';
import { sequelize } from '../db/index.js';
import { seedAdmin } from '../../seeders/seed-admin.js';

const cmd = process.argv[2];

try {
  if (!sequelize) throw new Error('Database not configured (DATABASE_URL_* missing).');
  if (cmd === 'migrate') {
    await migrator.up();
  } else if (cmd === 'undo') {
    await migrator.down();
  } else if (cmd === 'seed') {
    await seedAdmin();
  } else {
    console.error('usage: node src/scripts/db.js [migrate|undo|seed]');
    process.exitCode = 1;
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  if (sequelize) await sequelize.close();
}

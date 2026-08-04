import { Umzug, SequelizeStorage } from 'umzug';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { sequelize } from '../db/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../../migrations');

// ESM migrations: each file exports `up(queryInterface)` and `down(queryInterface)`.
// Data types are imported from 'sequelize' inside each migration.
// On Windows, import() needs file:// URLs — bare drive paths throw ERR_UNSUPPORTED_ESM_URL_SCHEME.
export const migrator = new Umzug({
  migrations: {
    glob: ['*.js', { cwd: migrationsDir }],
    resolve: ({ name, path }) => ({
      name,
      up: async () => {
        const m = await import(pathToFileURL(path).href);
        return m.up(sequelize.getQueryInterface());
      },
      down: async () => {
        const m = await import(pathToFileURL(path).href);
        return m.down(sequelize.getQueryInterface());
      },
    }),
  },
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

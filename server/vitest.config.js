import { defineConfig } from 'vitest/config';

// Force the test database. sequelize picks DATABASE_URL_TEST when NODE_ENV=test,
// so tests never touch the shared dev database — even if the shell env is unset.
process.env.NODE_ENV = 'test';

export default defineConfig({
  // Single shared test database: run files sequentially so one file's
  // TRUNCATE doesn't wipe another file's seeded rows. ponytail: cheaper
  // than a per-test transaction isolation layer at this scale.
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30000,
  },
});

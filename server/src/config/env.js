import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load server/.env by absolute path so scripts work from any CWD (root or server/).
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const VALID_NODE_ENVS = ['development', 'test', 'production'];
const nodeEnv = process.env.NODE_ENV || 'development';

// A typo ('prod', 'PRODUCTION') used to silently mean "not production", which turned off
// the secure cookie flag and switched debug behaviour on. Fail at boot instead.
if (!VALID_NODE_ENVS.includes(nodeEnv)) {
  throw new Error(`Invalid NODE_ENV: "${nodeEnv}". Expected one of ${VALID_NODE_ENVS.join(', ')}.`);
}

// Without this the app boots, /api/health reports ok, and every login throws a generic 500.
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required. See server/.env.example.');
}
if (nodeEnv === 'production' && process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5174',
  databaseUrlDev: process.env.DATABASE_URL_DEV,
  databaseUrlTest: process.env.DATABASE_URL_TEST,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'sponsorsync_session',
  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME,
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  },
};

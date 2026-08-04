import { Sequelize } from 'sequelize';
import { env } from '../config/env.js';

const url = env.nodeEnv === 'test' ? env.databaseUrlTest : env.databaseUrlDev;

// When no DATABASE_URL is configured (e.g. before Supabase credentials are
// provided), `sequelize` is null and /api/health reports a clear non-200.
export const sequelize = url
  ? new Sequelize(url, {
      dialect: 'postgres',
      // ponytail: Supabase requires SSL; their direct/pooler cert needs this.
      // Plan 4 hardening should revisit rejectUnauthorized for production.
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
      logging: false,
      // min: 1 keeps one connection warm. With min: 0 every request after 10s of
      // idle paid a fresh TLS handshake to Supabase — measured at ~1.7s cold
      // versus ~160ms warm, which is the pause users felt on the first login.
      pool: { max: 5, min: 1, idle: 10000 },
    })
  : null;

export default sequelize;

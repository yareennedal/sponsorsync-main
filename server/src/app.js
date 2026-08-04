import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { requestId } from './middleware/requestId.js';
import { healthRouter } from './routes/healthRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { eventRouter } from './routes/eventRoutes.js';
import { companyRouter } from './routes/companyRoutes.js';

export function createApp() {
  const app = express();

  // Rate limiters key on req.ip. Behind a proxy that is the proxy's own address, so without
  // this every user shares one bucket and ten failed logins lock out everybody. Kept at the
  // exact hop count: `true` would let a client spoof X-Forwarded-For and evade the limiter.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(requestId);
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
  // ponytail: single-process limiter; switch to Upstash if horizontally scaled.
  // Higher limit in development to avoid 429s during rapid HMR refreshes.
  const globalMax = env.nodeEnv === 'development' ? 1000 : 300;
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: globalMax,
      // GET /auth/me is idempotent and fires on every mount — exempt it from
      // the general quota so page refreshes don't drain the budget.
      skip: (req) => req.method === 'GET' && req.path === '/auth/me',
    }),
  );

  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/events', eventRouter);
  app.use('/api/companies', companyRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

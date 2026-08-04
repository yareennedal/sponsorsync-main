import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createApp } from '../src/app.js';
import { sequelize } from '../src/db/index.js';
import { resetDb, createUser } from './helpers.js';
import { cookieName } from '../src/utils/cookies.js';
import { signToken } from '../src/utils/jwt.js';
import { authenticate } from '../src/middleware/authenticate.js';
import { authorizeRoles } from '../src/middleware/authorizeRoles.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

const app = createApp();
const COOKIE = cookieName();

const ADMIN = { email: 'admin@auth.test', password: 'Password123!' };
const MEMBER = { email: 'member@auth.test', password: 'Password123!' };

beforeAll(async () => {
  if (!sequelize) throw new Error('DATABASE_URL_TEST must be set');
  await resetDb();
  await createUser({ email: ADMIN.email, password: ADMIN.password, role: 'ADMIN' });
  await createUser({ email: MEMBER.email, password: MEMBER.password, role: 'MEMBER' });
});

afterAll(async () => {
  await sequelize?.close();
});

async function loginAs(credentials) {
  return request(app).post('/api/auth/login').send(credentials);
}

describe('auth: login', () => {
  it('valid login returns cookie + safe profile', async () => {
    const res = await loginAs(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(ADMIN.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('invalid email gives generic 401 and never reveals existence', async () => {
    const res = await loginAs({ email: 'nope@auth.test', password: 'Password123!' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('invalid password gives the same generic 401', async () => {
    const res = await loginAs({ email: ADMIN.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('inactive account is rejected with 403', async () => {
    await createUser({
      email: 'disabled@auth.test',
      password: 'Password123!',
      role: 'MEMBER',
      isActive: false,
    });
    const res = await loginAs({ email: 'disabled@auth.test', password: 'Password123!' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_ACCOUNT_DISABLED');
  });
});

describe('auth: current user', () => {
  it('missing cookie → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('expired/malformed token → 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', `${COOKIE}=garbage`);
    expect(res.status).toBe(401);
  });

  it('role changed after token creation is reflected (DB reload)', async () => {
    const res = await loginAs(MEMBER);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    // Simulate role change directly in DB after token issue
    const { User } = await import('../src/models/index.js');
    const u = await User.findOne({ where: { email: MEMBER.email } });
    await u.update({ role: 'SUPERVISOR' });
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.body.data.user.role).toBe('SUPERVISOR');
  });
});

describe('auth: logout', () => {
  it('logout clears the cookie and returns success', async () => {
    const res = await loginAs(ADMIN);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    const out = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(200);
    expect(out.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
  });
});

describe('auth: change password', () => {
  it('requires password change: mustChangePassword flag returned', async () => {
    await createUser({
      email: 'forcepw@auth.test',
      password: 'Password123!',
      role: 'MEMBER',
      mustChangePassword: true,
    });
    const res = await loginAs({ email: 'forcepw@auth.test', password: 'Password123!' });
    expect(res.body.data.user.mustChangePassword).toBe(true);
  });

  it('password validation rejects weak passwords', async () => {
    const res = await loginAs(ADMIN);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    const out = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: ADMIN.password, newPassword: 'short', confirmPassword: 'short' });
    expect(out.status).toBe(400);
    expect(out.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 'short' above is caught by the route schema's min(10). This one is long
  // enough to pass the route and only fails the service-level category policy,
  // which throws a raw ZodError — that used to surface as a 500.
  it('a long but low-variety password is a 400 explaining the policy, not a 500', async () => {
    const res = await loginAs(ADMIN);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    const out = await request(app).post('/api/auth/change-password').set('Cookie', cookie).send({
      currentPassword: ADMIN.password,
      newPassword: 'alllowercaseonly',
      confirmPassword: 'alllowercaseonly',
    });
    expect(out.status).toBe(400);
    expect(out.body.error.code).toBe('VALIDATION_ERROR');
    expect(out.body.error.message).not.toMatch(/unexpected/i);
  });

  // The UI is Arabic; an English error string reaches the user verbatim.
  it('returns user-facing messages in Arabic', async () => {
    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: 'WrongPassword123!' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.message).toMatch(/[؀-ۿ]/);

    const unauth = await request(app).get('/api/auth/me');
    expect(unauth.status).toBe(401);
    expect(unauth.body.error.message).toMatch(/[؀-ۿ]/);
  });

  // Enforcement used to live entirely in LoginPage's post-login navigate(), so a user
  // holding an admin-issued temporary password could type /app or use curl and keep working.
  describe('forced password change is enforced server-side', () => {
    const TEMP = { email: 'mustchange@auth.test', password: 'TempPassword123!' };

    async function cookieFor(creds) {
      const res = await loginAs(creds);
      return res.headers['set-cookie'][0].split(';')[0];
    }

    it('blocks protected routes while the flag is set', async () => {
      await createUser({
        email: TEMP.email,
        password: TEMP.password,
        role: 'ADMIN',
        mustChangePassword: true,
      });
      const cookie = await cookieFor(TEMP);

      const users = await request(app).get('/api/users').set('Cookie', cookie);
      expect(users.status).toBe(403);
      expect(users.body.error.code).toBe('AUTH_PASSWORD_CHANGE_REQUIRED');
      expect(users.body.error.message).toMatch(/[؀-ۿ]/);
    });

    it('still allows /auth/me so the client can read the flag and redirect', async () => {
      const cookie = await cookieFor(TEMP);
      const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
      expect(me.status).toBe(200);
      expect(me.body.data.user.mustChangePassword).toBe(true);
    });

    it('lifts the block once the password is actually changed', async () => {
      const cookie = await cookieFor(TEMP);
      const changed = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', cookie)
        .send({
          currentPassword: TEMP.password,
          newPassword: 'BrandNewPassword123!',
          confirmPassword: 'BrandNewPassword123!',
        });
      expect(changed.status).toBe(200);

      const fresh = await cookieFor({ email: TEMP.email, password: 'BrandNewPassword123!' });
      const users = await request(app).get('/api/users').set('Cookie', fresh);
      expect(users.status).toBe(200);
    });
  });

  // The whole block below used to assert only 400s, so the bcrypt re-hash, the
  // mustChangePassword clear, the tokenVersion bump and the cookie clear were all untested
  // on the flow every first login is forced through.
  it('successfully changes the password and invalidates the old session', async () => {
    const creds = { email: 'rotate@auth.test', password: 'OriginalPass123!' };
    const next = 'RotatedPass456!';
    await createUser({ email: creds.email, password: creds.password, role: 'MEMBER' });

    const before = await loginAs(creds);
    const cookie = before.headers['set-cookie'][0].split(';')[0];

    const changed = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: creds.password, newPassword: next, confirmPassword: next });
    expect(changed.status).toBe(200);

    // The old session is dead, not merely logged out client-side.
    const stale = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(stale.status).toBe(401);

    // The new password works and the old one does not.
    expect((await loginAs({ email: creds.email, password: next })).status).toBe(200);
    expect((await loginAs(creds)).status).toBe(401);
  });

  it('rejects a wrong current password', async () => {
    const res = await loginAs(ADMIN);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    const out = await request(app).post('/api/auth/change-password').set('Cookie', cookie).send({
      currentPassword: 'NotTheCurrentPassword1!',
      newPassword: 'WhateverNew123!',
      confirmPassword: 'WhateverNew123!',
    });
    expect(out.status).toBe(400);
    expect(out.body.error.code).toBe('AUTH_WRONG_PASSWORD');
  });

  it('token-version bump invalidates the old session', async () => {
    const u = await createUser({
      email: 'version@auth.test',
      password: 'Password123!',
      role: 'MEMBER',
    });
    const token = signToken(u);
    // Bump tokenVersion (simulating password change / disable elsewhere)
    await u.update({ tokenVersion: u.tokenVersion + 1 });
    const res = await request(app).get('/api/auth/me').set('Cookie', `${COOKIE}=${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_TOKEN_VERSION_MISMATCH');
  });
});

describe('auth: authorization', () => {
  // Build a minimal app with an admin-only route so authorizeRoles can be
  // tested in isolation, ordered before the notFound handler (which createApp
  // registers last, making late-added routes unreachable).
  function authzApp() {
    const a = express();
    a.use(express.json());
    a.use(cookieParser());
    const r = express.Router();
    r.get('/_test/admin-only', authenticate, authorizeRoles('ADMIN'), (_req, res) =>
      res.json({ ok: true }),
    );
    a.use('/api', r);
    a.use(errorHandler);
    return a;
  }

  it('authorizeRoles rejects non-admin on an admin-only route (403)', async () => {
    const res = await loginAs(MEMBER);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    const out = await request(authzApp()).get('/api/_test/admin-only').set('Cookie', cookie);
    expect(out.status).toBe(403);
    expect(out.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('authorizeRoles allows admin on an admin-only route (200)', async () => {
    const res = await loginAs(ADMIN);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    const out = await request(authzApp()).get('/api/_test/admin-only').set('Cookie', cookie);
    expect(out.status).toBe(200);
    expect(out.body.ok).toBe(true);
  });
});

describe('auth: remember me', () => {
  // The cookie's Max-Age was the only thing rememberMe controlled; the JWT inside it always
  // expired in 8h, so the browser held a dead cookie for the remaining 29 days. Assert the
  // token lifetime, not just the cookie, or the same bug comes back invisibly.
  function tokenLifetimeSeconds(setCookieHeader) {
    const token = setCookieHeader.split(';')[0].split('=')[1];
    const { iat, exp } = jwt.decode(token);
    return exp - iat;
  }

  it('rememberMe: true returns a 30-day cookie AND a 30-day token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: ADMIN.password, rememberMe: true });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toContain('Max-Age=2592000');
    expect(tokenLifetimeSeconds(res.headers['set-cookie'][0])).toBe(30 * 24 * 60 * 60);
  });

  it('rememberMe omitted returns a session cookie and the short token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: ADMIN.password });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).not.toContain('Max-Age=');
    expect(tokenLifetimeSeconds(res.headers['set-cookie'][0])).toBe(8 * 60 * 60);
  });
});

describe('auth: session invalidation semantics', () => {
  // 401 not 403: the client interceptor only ends the session on 401, so a deactivated user
  // used to sit in a logged-in-looking UI where every request failed with a generic toast.
  it('a deactivated user with a valid cookie gets 401, not 403', async () => {
    const u = await createUser({
      email: 'disable-mid-session@auth.test',
      password: 'Password123!',
      role: 'MEMBER',
    });
    const res = await loginAs({ email: 'disable-mid-session@auth.test', password: 'Password123!' });
    const cookie = res.headers['set-cookie'][0].split(';')[0];

    await u.update({ isActive: false });

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe('AUTH_ACCOUNT_DISABLED');
  });

  it('validation messages are Arabic, including Zod built-ins', async () => {
    const res = await loginAs(ADMIN);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    const out = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: ADMIN.password, newPassword: 'short', confirmPassword: 'short' });
    expect(out.status).toBe(400);
    // Both the top-level message and the field detail the UI actually renders.
    expect(out.body.error.message).toMatch(/[؀-ۿ]/);
    expect(out.body.error.details[0].message).toMatch(/[؀-ۿ]/);
    expect(out.body.error.details[0].message).not.toMatch(/[a-z]{4,}/i);
  });
});

// The self-service forgotten-password flow was deliberately removed: this is an internal tool,
// and admin-mediated reset already covers lockout without needing a mail sender. These three
// routes were unauthenticated, so re-adding one by accident (a stray revert, a copied route
// block) would reopen a public surface on an app that no longer has any. Assert they are gone.
describe('auth: the forgotten-password OTP flow is removed', () => {
  for (const route of [
    '/api/auth/forgot-password',
    '/api/auth/verify-otp',
    '/api/auth/reset-password-otp',
  ]) {
    it(`POST ${route} is not mounted`, async () => {
      const res = await request(app).post(route).send({ email: ADMIN.email, otp: '000000' });
      expect(res.status).toBe(404);
    });
  }
});

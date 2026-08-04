import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { sequelize } from '../src/db/index.js';
import { User } from '../src/models/index.js';
import { resetDb, createUser } from './helpers.js';

const app = createApp();

const ME = { email: 'me@profile.test', password: 'Password123!' };
const OTHER = { email: 'other@profile.test', password: 'Password123!' };

let cookie;

async function signIn(creds = ME) {
  const res = await request(app).post('/api/auth/login').send(creds);
  return res.headers['set-cookie'][0].split(';')[0];
}

beforeAll(async () => {
  if (!sequelize) throw new Error('DATABASE_URL_TEST must be set');
  await resetDb();
  await createUser({ email: ME.email, password: ME.password, role: 'MEMBER' });
  await createUser({ email: OTHER.email, password: OTHER.password, role: 'MEMBER' });
  cookie = await signIn();
});

afterAll(async () => {
  await sequelize?.close();
});

describe('self-service profile', () => {
  it('requires authentication', async () => {
    const res = await request(app).patch('/api/auth/me').send({ fullName: 'Nope' });
    expect(res.status).toBe(401);
  });

  it('updates own full name', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Cookie', cookie)
      .send({ fullName: 'اسم جديد' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.fullName).toBe('اسم جديد');
  });

  it('cannot escalate role or flip isActive through the profile endpoint', async () => {
    await request(app)
      .patch('/api/auth/me')
      .set('Cookie', cookie)
      .send({ fullName: 'اسم', role: 'ADMIN', isActive: false });
    const me = await User.findOne({ where: { email: ME.email } });
    expect(me.role).toBe('MEMBER');
    expect(me.isActive).toBe(true);
  });
});

// The self-service email-change OTP flow was removed with the forgotten-password flow: it could
// not deliver a code without a mail sender, and an admin can already set an address through
// PATCH /api/users/:id. Email is the login identity, so the guard that matters is that it stays
// out of reach of the self-service endpoint — a teammate adding `email` to updateOwnProfileSchema
// would hand every user the ability to change what they log in as.
describe('email is not self-service', () => {
  for (const route of ['/api/auth/change-email/request', '/api/auth/change-email/confirm']) {
    it(`POST ${route} is not mounted`, async () => {
      const res = await request(app).post(route).set('Cookie', cookie).send({ otp: '000000' });
      expect(res.status).toBe(404);
    });
  }

  it('PATCH /auth/me cannot change the email', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Cookie', cookie)
      .send({ fullName: 'اسم', email: 'hijack@profile.test' });
    expect(res.status).toBe(200);

    expect(await User.findOne({ where: { email: 'hijack@profile.test' } })).toBeNull();
    expect(await User.findOne({ where: { email: ME.email } })).not.toBeNull();
  });

  it('an admin can still change it through the users route, and that kills the session', async () => {
    // The replacement path. If this breaks, there is no way to change an email at all.
    const admin = { email: 'admin@profile.test', password: 'Password123!' };
    await createUser({ email: admin.email, password: admin.password, role: 'ADMIN' });
    const adminCookie = await signIn(admin);

    const victimCookie = await signIn(OTHER);
    expect((await request(app).get('/api/auth/me').set('Cookie', victimCookie)).status).toBe(200);

    const target = await User.findOne({ where: { email: OTHER.email } });
    const res = await request(app)
      .patch(`/api/users/${target.id}`)
      .set('Cookie', adminCookie)
      .send({ email: 'moved@profile.test' });
    expect(res.status).toBe(200);
    expect(await User.findOne({ where: { email: 'moved@profile.test' } })).not.toBeNull();

    // confirmEmailChange used to bump token_version; removing it left this route as the only
    // way an address changes, so the bump moved here. Email is the login identity — a session
    // opened against the old address must not survive.
    const after = await request(app).get('/api/auth/me').set('Cookie', victimCookie);
    expect(after.status).toBe(401);
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { sequelize } from '../src/db/index.js';
import { User } from '../src/models/index.js';
import { resetDb, createUser } from './helpers.js';

const app = createApp();

const ADMIN = { email: 'admin@users.test', password: 'Password123!' };
const MEMBER = { email: 'member@users.test', password: 'Password123!' };

let adminCookie;

beforeAll(async () => {
  if (!sequelize) throw new Error('DATABASE_URL_TEST must be set');
  await resetDb();
  await createUser({ email: ADMIN.email, password: ADMIN.password, role: 'ADMIN' });
  await createUser({ email: MEMBER.email, password: MEMBER.password, role: 'MEMBER' });
  const res = await request(app).post('/api/auth/login').send(ADMIN);
  adminCookie = res.headers['set-cookie'][0].split(';')[0];
});

afterAll(async () => {
  await sequelize?.close();
});

describe('user management', () => {
  it('admin lists users (paginated)', async () => {
    const res = await request(app).get('/api/users').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    // password hashes never appear
    expect(JSON.stringify(res.body.data)).not.toContain('passwordHash');
  });

  it('lists users with the blank filters the client actually sends', async () => {
    const res = await request(app)
      .get('/api/users')
      .query({ page: 1, pageSize: 20, search: '', role: '', status: '' })
      .set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('filters by disabled status', async () => {
    await User.update({ isActive: false }, { where: { email: MEMBER.email } });
    const res = await request(app)
      .get('/api/users')
      .query({ status: 'disabled' })
      .set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.every((u) => u.isActive === false)).toBe(true);
    expect(res.body.data.some((u) => u.email === MEMBER.email)).toBe(true);
    await User.update({ isActive: true }, { where: { email: MEMBER.email } });
  });

  it('non-admin cannot list users (403)', async () => {
    const res = await request(app).post('/api/auth/login').send(MEMBER);
    const memberCookie = res.headers['set-cookie'][0].split(';')[0];
    const out = await request(app).get('/api/users').set('Cookie', memberCookie);
    expect(out.status).toBe(403);
  });

  it('duplicate email conflict (409)', async () => {
    const res = await request(app).post('/api/users').set('Cookie', adminCookie).send({
      fullName: 'Dup',
      email: ADMIN.email,
      role: 'MEMBER',
      temporaryPassword: 'Password123!',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USER_EMAIL_TAKEN');
  });

  it('role validation rejects unknown role', async () => {
    const res = await request(app).post('/api/users').set('Cookie', adminCookie).send({
      fullName: 'Bad',
      email: 'bad@users.test',
      role: 'WIZARD',
      temporaryPassword: 'Password123!',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('prevents deactivation of the only active admin (self-deactivate guard)', async () => {
    // Reuse the working beforeAll admin session and resolve the actor's own id
    // from the users list (the list endpoint is proven to work above).
    const list = await request(app).get('/api/users?role=ADMIN').set('Cookie', adminCookie);
    const adminId = list.body.data.find((u) => u.email === ADMIN.email).id;
    const out = await request(app)
      .patch(`/api/users/${adminId}/status`)
      .set('Cookie', adminCookie)
      .send({ isActive: false });
    expect(out.status).toBe(409);
    // Exactly this code. Accepting either one meant the test passed whichever guard fired,
    // so deleting the last-admin check would not have failed it.
    expect(out.body.error.code).toBe('USER_SELF_DEACTIVATE');
    const stillActive = await User.findByPk(adminId);
    expect(stillActive.isActive).toBe(true);
  });

  it('password hash never appears in responses', async () => {
    const list = await request(app).get('/api/users').set('Cookie', adminCookie);
    expect(JSON.stringify(list.body)).not.toContain('password_hash');
    expect(JSON.stringify(list.body)).not.toContain('passwordHash');
  });

  it('reset password marks must_change_password', async () => {
    // create a user, reset, then verify the flag
    const created = await request(app).post('/api/users').set('Cookie', adminCookie).send({
      fullName: 'Reset Target',
      email: 'reset@users.test',
      role: 'MEMBER',
      temporaryPassword: 'Password123!',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.mustChangePassword).toBe(true);

    // update them to must_change_password=false, then reset and confirm it flips back
    await User.update({ mustChangePassword: false }, { where: { email: 'reset@users.test' } });
    const reset = await request(app)
      .post(`/api/users/${created.body.data.id}/reset-password`)
      .set('Cookie', adminCookie)
      .send({ temporaryPassword: 'NewPassword123!' });
    expect(reset.status).toBe(200);

    const u = await User.findOne({ where: { email: 'reset@users.test' } });
    expect(u.mustChangePassword).toBe(true);
  });

  it('admin can create a user of each role', async () => {
    for (const role of ['LEADER', 'MEMBER', 'SUPERVISOR']) {
      const res = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send({
          fullName: `${role} User`,
          email: `${role.toLowerCase()}@create.test`,
          role,
          temporaryPassword: 'Password123!',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe(role);
    }
  });
});

// Only GET / was ever tested against a real route. The four write routes were covered
// solely by a synthetic /_test/admin-only app in auth.test.js, which proves the middleware
// function works but not that any real route uses it. Dropping `...admin` from a write
// route would have left the whole suite green while any MEMBER could mint themselves an
// ADMIN account, since createUserSchema accepts role: 'ADMIN' from whoever reaches it.
describe('user management: authorization on every write route', () => {
  let memberCookie;
  let targetId;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send(MEMBER);
    memberCookie = res.headers['set-cookie'][0].split(';')[0];
    const list = await request(app).get('/api/users').set('Cookie', adminCookie);
    targetId = list.body.data.find((u) => u.email === MEMBER.email).id;
  });

  const writeRoutes = () => [
    {
      name: 'POST /api/users',
      send: () =>
        request(app).post('/api/users').set('Cookie', memberCookie).send({
          fullName: 'Escalation Attempt',
          email: 'escalate@users.test',
          role: 'ADMIN',
          temporaryPassword: 'Password123!',
        }),
    },
    {
      name: 'PATCH /api/users/:id',
      send: () =>
        request(app)
          .patch(`/api/users/${targetId}`)
          .set('Cookie', memberCookie)
          .send({ role: 'ADMIN' }),
    },
    {
      name: 'PATCH /api/users/:id/status',
      send: () =>
        request(app)
          .patch(`/api/users/${targetId}/status`)
          .set('Cookie', memberCookie)
          .send({ isActive: false }),
    },
    {
      name: 'POST /api/users/:id/reset-password',
      send: () =>
        request(app)
          .post(`/api/users/${targetId}/reset-password`)
          .set('Cookie', memberCookie)
          .send({ temporaryPassword: 'Password123!' }),
    },
  ];

  it('rejects a non-admin on all four write routes', async () => {
    for (const route of writeRoutes()) {
      const out = await route.send();
      expect(out.status, `${route.name} should reject a MEMBER`).toBe(403);
      expect(out.body.error.code, route.name).toBe('AUTH_FORBIDDEN');
    }
    // And nothing leaked through: no escalated account exists.
    const escalated = await User.findOne({ where: { email: 'escalate@users.test' } });
    expect(escalated).toBeNull();
  });
});

describe('user management: admin edit', () => {
  it('unknown id is 404, not 500', async () => {
    const out = await request(app)
      .patch('/api/users/00000000-0000-4000-8000-000000000000')
      .set('Cookie', adminCookie)
      .send({ fullName: 'Ghost' });
    expect(out.status).toBe(404);
    expect(out.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('email collision on update is 409', async () => {
    const list = await request(app).get('/api/users').set('Cookie', adminCookie);
    const memberId = list.body.data.find((u) => u.email === MEMBER.email).id;
    const out = await request(app)
      .patch(`/api/users/${memberId}`)
      .set('Cookie', adminCookie)
      .send({ email: ADMIN.email });
    expect(out.status).toBe(409);
    expect(out.body.error.code).toBe('USER_EMAIL_TAKEN');
  });

  // An admin demoting themselves used to succeed, costing them access with no in-product
  // way back. The USER_LAST_ADMIN guard below this one in updateUser is now unreachable
  // through HTTP for the same structural reason as its twin in updateUserStatus: any other
  // active-admin actor makes the count >= 2, and a self-target stops here first. Both are
  // kept as defence in depth for non-HTTP callers (scripts, future service reuse).
  it('an admin cannot change their own role', async () => {
    const list = await request(app).get('/api/users?role=ADMIN').set('Cookie', adminCookie);
    const adminId = list.body.data.find((u) => u.email === ADMIN.email).id;
    const out = await request(app)
      .patch(`/api/users/${adminId}`)
      .set('Cookie', adminCookie)
      .send({ role: 'MEMBER' });
    expect(out.status).toBe(409);
    expect(out.body.error.code).toBe('USER_SELF_ROLE_CHANGE');
    const stillAdmin = await User.findByPk(adminId);
    expect(stillAdmin.role).toBe('ADMIN');
  });

  it('an admin cannot reset their own password through the admin route', async () => {
    const list = await request(app).get('/api/users?role=ADMIN').set('Cookie', adminCookie);
    const adminId = list.body.data.find((u) => u.email === ADMIN.email).id;
    const out = await request(app)
      .post(`/api/users/${adminId}/reset-password`)
      .set('Cookie', adminCookie)
      .send({ temporaryPassword: 'BypassAttempt123!' });
    expect(out.status).toBe(409);
    expect(out.body.error.code).toBe('USER_SELF_RESET');
    // The original password still works: no credential was silently replaced.
    expect((await request(app).post('/api/auth/login').send(ADMIN)).status).toBe(200);
  });

  it('a malformed id is 404 or 400, never 500', async () => {
    const out = await request(app)
      .patch('/api/users/not-a-uuid')
      .set('Cookie', adminCookie)
      .send({ fullName: 'X' });
    expect(out.status).toBe(400);
    expect(out.body.error.code).toBe('VALIDATION_ERROR');
    expect(out.body.error.message).toMatch(/[؀-ۿ]/);
  });

  it('strips fields the schema does not declare', async () => {
    const created = await request(app).post('/api/users').set('Cookie', adminCookie).send({
      fullName: 'Mass Assignment Target',
      email: 'massassign@users.test',
      role: 'MEMBER',
      temporaryPassword: 'Password123!',
      isActive: false,
      tokenVersion: 99,
      passwordHash: 'pwned',
      createdBy: '00000000-0000-4000-8000-000000000000',
    });
    expect(created.status).toBe(201);

    const row = await User.findOne({ where: { email: 'massassign@users.test' } });
    expect(row.isActive).toBe(true);
    expect(row.tokenVersion).toBe(0);
    expect(row.passwordHash).not.toBe('pwned');
    // The declared temporary password is what actually works.
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'massassign@users.test', password: 'Password123!' });
    expect(login.status).toBe(200);
  });
});

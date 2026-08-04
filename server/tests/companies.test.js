import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { sequelize } from '../src/db/index.js';
import { AuditLog, Company, CompanyContact } from '../src/models/index.js';
import { createUser, resetDb } from './helpers.js';

const app = createApp();
const PASSWORD = 'Password123!';

let admin;
let leader;
let member;
let supervisor;
let adminCookie;
let leaderCookie;
let memberCookie;
let supervisorCookie;

async function loginCookie(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res.headers['set-cookie'][0].split(';')[0];
}

async function createCompanyFixture({
  name = 'Fixture Company',
  normalizedName = 'fixture company',
  sector = 'Technology',
  city = 'Amman',
  website = null,
  websiteDomain = null,
  generalEmail = null,
  phone = null,
  archivedAt = null,
  createdBy = leader.id,
} = {}) {
  return Company.create({
    name,
    normalizedName,
    sector,
    city,
    website,
    websiteDomain,
    generalEmail,
    phone,
    archivedAt,
    createdBy,
  });
}

async function createContactFixture({
  company,
  fullName = 'Primary Contact',
  email = 'primary@example.com',
  phone = null,
  preferredContactMethod = 'EMAIL',
  isPrimary = false,
  archivedAt = null,
  createdBy = leader.id,
} = {}) {
  return CompanyContact.create({
    companyId: company.id,
    fullName,
    email,
    phone,
    preferredContactMethod,
    isPrimary,
    archivedAt,
    createdBy,
  });
}

describe('company and contact API', () => {
  beforeAll(async () => {
    if (!sequelize) throw new Error('DATABASE_URL_TEST must be set for company API tests');
    await resetDb();
    admin = await createUser({ email: 'companies-admin@test.local', role: 'ADMIN' });
    leader = await createUser({ email: 'companies-leader@test.local', role: 'LEADER' });
    member = await createUser({ email: 'companies-member@test.local', role: 'MEMBER' });
    supervisor = await createUser({
      email: 'companies-supervisor@test.local',
      role: 'SUPERVISOR',
    });

    adminCookie = await loginCookie(admin.email);
    leaderCookie = await loginCookie(leader.email);
    memberCookie = await loginCookie(member.email);
    supervisorCookie = await loginCookie(supervisor.email);
  });

  afterAll(async () => {
    await sequelize?.close();
  });

  it('lets a leader create a company with one primary contact and writes audit rows', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Cookie', leaderCookie)
      .send({
        name: '  Jordan   Telecom Co.  ',
        sector: 'Technology',
        city: 'Amman',
        website: 'https://www.Jordan-Telecom.com/about',
        generalEmail: 'INFO@Jordan-Telecom.COM',
        phone: '+962 (79) 123-4567',
        contact: {
          fullName: 'Lina Sponsor',
          position: 'PR Manager',
          email: 'LINA@Jordan-Telecom.COM',
          preferredContactMethod: 'EMAIL',
          isPrimary: true,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Jordan Telecom Co.',
      normalizedName: 'jordan telecom co',
      websiteDomain: 'jordan-telecom.com',
      generalEmail: 'info@jordan-telecom.com',
      phone: '+962791234567',
      primaryContact: expect.objectContaining({
        fullName: 'Lina Sponsor',
        email: 'lina@jordan-telecom.com',
        isPrimary: true,
      }),
      sponsorshipHistory: { status: 'UNAVAILABLE', items: [] },
    });

    const contacts = await CompanyContact.findAll({ where: { companyId: res.body.data.id } });
    expect(contacts).toHaveLength(1);
    expect(contacts[0].isPrimary).toBe(true);

    const actions = await AuditLog.findAll({
      where: { entityId: res.body.data.id },
      order: [['createdAt', 'ASC']],
    });
    expect(actions.map((row) => row.action)).toContain('COMPANY_CREATED');
  });

  it('blocks high-confidence duplicates unless an override reason is provided', async () => {
    const existing = await createCompanyFixture({
      name: 'Duplicate Domain Co',
      normalizedName: 'duplicate domain co',
      sector: 'Technology',
      websiteDomain: 'duplicate.example',
    });

    const blocked = await request(app).post('/api/companies').set('Cookie', leaderCookie).send({
      name: 'Different Display Name',
      sector: 'Technology',
      website: 'https://www.duplicate.example/path',
    });

    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('COMPANY_DUPLICATE_HIGH_CONFIDENCE');
    expect(blocked.body.error.details.matches).toEqual([
      expect.objectContaining({
        companyId: existing.id,
        confidence: 'HIGH',
        reasons: ['same website domain'],
      }),
    ]);
    await expect(
      Company.findOne({ where: { name: 'Different Display Name' } }),
    ).resolves.toBeNull();

    const allowed = await request(app).post('/api/companies').set('Cookie', leaderCookie).send({
      name: 'Different Display Name',
      sector: 'Technology',
      website: 'https://www.duplicate.example/path',
      overrideReason: 'سجل مستقل لنفس المجموعة القانونية.',
    });

    expect(allowed.status).toBe(201);
    const audit = await AuditLog.findOne({
      where: { action: 'COMPANY_DUPLICATE_OVERRIDE', entityId: allowed.body.data.id },
    });
    expect(audit.afterValues.reason).toBe('سجل مستقل لنفس المجموعة القانونية.');
  });

  it('returns duplicate suggestions with city-aware confidence before submission', async () => {
    const company = await createCompanyFixture({
      name: 'City Match Co',
      normalizedName: 'city match co',
      sector: 'Technology',
      city: 'Amman',
    });

    const res = await request(app)
      .get('/api/companies/duplicates')
      .query({ name: 'City Match Co', city: 'Amman' })
      .set('Cookie', supervisorCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        companyId: company.id,
        confidence: 'MEDIUM',
        reasons: ['same normalized name', 'same city'],
      }),
    ]);

    const excludingSelf = await request(app)
      .get('/api/companies/duplicates')
      .query({ name: 'City Match Co', city: 'Amman', excludeCompanyId: company.id })
      .set('Cookie', supervisorCookie);

    expect(excludingSelf.status).toBe(200);
    expect(excludingSelf.body.data).toEqual([]);
  });

  it('lists active companies with filters and hides archived rows except for admin archived views', async () => {
    const active = await createCompanyFixture({
      name: 'List Active Co',
      normalizedName: 'list active co',
      sector: 'Education',
      city: 'Irbid',
      websiteDomain: 'list-active.example',
      generalEmail: 'hello@list-active.example',
    });
    await createContactFixture({
      company: active,
      fullName: 'Primary Listed',
      email: 'primary@list-active.example',
      isPrimary: true,
    });
    const archived = await createCompanyFixture({
      name: 'Archived List Co',
      normalizedName: 'archived list co',
      sector: 'Education',
      city: 'Irbid',
      websiteDomain: 'archived-list.example',
      archivedAt: new Date(),
    });

    const normal = await request(app)
      .get('/api/companies')
      .query({ search: 'list-active', sector: 'Education', city: 'Irbid' })
      .set('Cookie', memberCookie);
    expect(normal.status).toBe(200);
    expect(normal.body.data.map((company) => company.id)).toContain(active.id);
    expect(normal.body.data.map((company) => company.id)).not.toContain(archived.id);
    expect(
      normal.body.data.find((company) => company.id === active.id).primaryContact,
    ).toMatchObject({
      fullName: 'Primary Listed',
      email: 'primary@list-active.example',
    });

    const memberArchived = await request(app)
      .get('/api/companies')
      .query({ archived: true })
      .set('Cookie', memberCookie);
    expect(memberArchived.status).toBe(403);
    expect(memberArchived.body.error.code).toBe('AUTH_FORBIDDEN');

    const adminArchived = await request(app)
      .get('/api/companies')
      .query({ archived: true })
      .set('Cookie', adminCookie);
    expect(adminArchived.status).toBe(200);
    expect(adminArchived.body.data.map((company) => company.id)).toContain(archived.id);
  });

  it('lets members and supervisors read company details but rejects their writes', async () => {
    const company = await createCompanyFixture({
      name: 'Read Only Co',
      normalizedName: 'read only co',
      sector: 'Technology',
    });
    await createContactFixture({ company, fullName: 'Readable Contact', isPrimary: true });

    for (const cookie of [memberCookie, supervisorCookie]) {
      const read = await request(app).get(`/api/companies/${company.id}`).set('Cookie', cookie);
      expect(read.status).toBe(200);
      expect(read.body.data.permissions).toMatchObject({
        canEdit: false,
        canManageContacts: false,
      });

      const update = await request(app)
        .patch(`/api/companies/${company.id}`)
        .set('Cookie', cookie)
        .send({ city: 'Aqaba' });
      expect(update.status).toBe(403);
      expect(update.body.error.code).toBe('AUTH_FORBIDDEN');

      const contactWrite = await request(app)
        .post(`/api/companies/${company.id}/contacts`)
        .set('Cookie', cookie)
        .send({ fullName: 'Blocked Contact', email: 'blocked@example.com' });
      expect(contactWrite.status).toBe(403);
      expect(contactWrite.body.error.code).toBe('AUTH_FORBIDDEN');
    }
  });

  it('manages contacts and changes the primary contact in one transaction', async () => {
    const company = await createCompanyFixture({
      name: 'Contact Workflow Co',
      normalizedName: 'contact workflow co',
      sector: 'Technology',
    });
    const first = await createContactFixture({
      company,
      fullName: 'First Contact',
      email: 'first@workflow.example',
      isPrimary: true,
    });

    const invalid = await request(app)
      .post(`/api/companies/${company.id}/contacts`)
      .set('Cookie', leaderCookie)
      .send({ fullName: 'No Channel' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const created = await request(app)
      .post(`/api/companies/${company.id}/contacts`)
      .set('Cookie', leaderCookie)
      .send({
        fullName: 'Second Contact',
        phone: '+962 (79) 765-4321',
        preferredContactMethod: 'WHATSAPP',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.phone).toBe('+962797654321');

    const primary = await request(app)
      .post(`/api/companies/${company.id}/contacts/${created.body.data.id}/make-primary`)
      .set('Cookie', leaderCookie);
    expect(primary.status).toBe(200);
    expect(primary.body.data.isPrimary).toBe(true);

    await first.reload();
    const second = await CompanyContact.findByPk(created.body.data.id);
    expect(first.isPrimary).toBe(false);
    expect(second.isPrimary).toBe(true);

    const updated = await request(app)
      .patch(`/api/companies/${company.id}/contacts/${created.body.data.id}`)
      .set('Cookie', leaderCookie)
      .send({ position: 'Sponsorship Lead', email: 'SECOND@workflow.example' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      position: 'Sponsorship Lead',
      email: 'second@workflow.example',
    });

    const archived = await request(app)
      .patch(`/api/companies/${company.id}/contacts/${created.body.data.id}/archive`)
      .set('Cookie', leaderCookie)
      .send({ archived: true });
    expect(archived.status).toBe(200);
    expect(archived.body.data.archivedAt).toBeTruthy();

    const list = await request(app)
      .get(`/api/companies/${company.id}/contacts`)
      .set('Cookie', leaderCookie);
    expect(list.status).toBe(200);
    expect(list.body.data.map((contact) => contact.id)).not.toContain(created.body.data.id);
  });

  it('updates duplicate-sensitive company fields and restores archived companies with admin-only restore', async () => {
    const existing = await createCompanyFixture({
      name: 'Existing Domain Co',
      normalizedName: 'existing domain co',
      sector: 'Technology',
      websiteDomain: 'existing-domain.example',
    });
    const target = await createCompanyFixture({
      name: 'Patch Target Co',
      normalizedName: 'patch target co',
      sector: 'Technology',
      websiteDomain: 'patch-target.example',
    });

    const blocked = await request(app)
      .patch(`/api/companies/${target.id}`)
      .set('Cookie', leaderCookie)
      .send({ website: 'https://existing-domain.example' });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('COMPANY_DUPLICATE_HIGH_CONFIDENCE');
    expect(blocked.body.error.details.matches[0].companyId).toBe(existing.id);

    const updated = await request(app)
      .patch(`/api/companies/${target.id}`)
      .set('Cookie', leaderCookie)
      .send({
        name: ' Patch Target Co Updated ',
        website: 'https://existing-domain.example',
        overrideReason: 'الموقع مملوك لفرع مستقل.',
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      name: 'Patch Target Co Updated',
      normalizedName: 'patch target co updated',
      websiteDomain: 'existing-domain.example',
    });

    const archived = await request(app)
      .patch(`/api/companies/${target.id}/archive`)
      .set('Cookie', leaderCookie)
      .send({ archived: true });
    expect(archived.status).toBe(200);
    expect(archived.body.data.archivedAt).toBeTruthy();

    const leaderRestore = await request(app)
      .patch(`/api/companies/${target.id}/archive`)
      .set('Cookie', leaderCookie)
      .send({ archived: false });
    expect(leaderRestore.status).toBe(403);
    expect(leaderRestore.body.error.code).toBe('AUTH_FORBIDDEN');

    const adminRestore = await request(app)
      .patch(`/api/companies/${target.id}/archive`)
      .set('Cookie', adminCookie)
      .send({ archived: false });
    expect(adminRestore.status).toBe(200);
    expect(adminRestore.body.data.archivedAt).toBeNull();
  });
});

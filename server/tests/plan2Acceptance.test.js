import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { sequelize } from '../src/db/index.js';
import { CompanyContact } from '../src/models/index.js';
import { createUser, resetDb } from './helpers.js';

const app = createApp();
const PASSWORD = 'Password123!';

async function loginCookie(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return res.headers['set-cookie'][0].split(';')[0];
}

describe('Plan 2 acceptance workflow', () => {
  let admin;
  let leader;
  let memberOne;
  let memberTwo;
  let supervisor;
  let unrelatedMember;
  let adminCookie;
  let leaderCookie;
  let memberCookie;
  let supervisorCookie;
  let unrelatedCookie;

  beforeAll(async () => {
    if (!sequelize) throw new Error('DATABASE_URL_TEST must be set for Plan 2 acceptance tests');
    await resetDb();

    admin = await createUser({ email: 'plan2-admin@test.local', role: 'ADMIN' });
    leader = await createUser({ email: 'plan2-leader@test.local', role: 'LEADER' });
    memberOne = await createUser({ email: 'plan2-member-one@test.local', role: 'MEMBER' });
    memberTwo = await createUser({ email: 'plan2-member-two@test.local', role: 'MEMBER' });
    supervisor = await createUser({ email: 'plan2-supervisor@test.local', role: 'SUPERVISOR' });
    unrelatedMember = await createUser({
      email: 'plan2-unrelated-member@test.local',
      role: 'MEMBER',
    });

    adminCookie = await loginCookie(admin.email);
    leaderCookie = await loginCookie(leader.email);
    memberCookie = await loginCookie(memberOne.email);
    supervisorCookie = await loginCookie(supervisor.email);
    unrelatedCookie = await loginCookie(unrelatedMember.email);
  });

  afterAll(async () => {
    await sequelize?.close();
  });

  it('passes the end-to-end Plan 2 event, company, permission, and audit handoff scenario', async () => {
    const stamp = Date.now();

    const users = await request(app).get('/api/users').set('Cookie', adminCookie);
    expect(users.status).toBe(200);
    expect(users.body.data.map((user) => user.role)).toEqual(
      expect.arrayContaining(['ADMIN', 'LEADER', 'MEMBER', 'SUPERVISOR']),
    );
    expect(users.body.data.filter((user) => user.role === 'MEMBER')).toHaveLength(3);

    const eventCreate = await request(app)
      .post('/api/events')
      .set('Cookie', leaderCookie)
      .send({
        name: `University Technology Conference 2026 - Phase7 ${stamp}`,
        description: 'Plan 2 acceptance event',
        category: 'Conference',
        eventDate: '2026-11-15',
        sponsorshipDeadline: '2026-10-30',
        location: 'Amman',
        financialTarget: '25000.00',
        targetSectors: ['Technology', 'Education'],
        targetCities: ['Amman', 'Irbid'],
        status: 'ACTIVE',
      });
    expect(eventCreate.status).toBe(201);
    expect(eventCreate.body.data.leader.id).toBe(leader.id);
    const eventId = eventCreate.body.data.id;

    const eventUpdate = await request(app)
      .patch(`/api/events/${eventId}`)
      .set('Cookie', leaderCookie)
      .send({ location: 'Amman - Main Campus', financialTarget: '27500.00' });
    expect(eventUpdate.status).toBe(200);
    expect(eventUpdate.body.data).toMatchObject({
      location: 'Amman - Main Campus',
      financialTarget: '27500.00',
    });

    const packageCreate = await request(app)
      .post(`/api/events/${eventId}/packages`)
      .set('Cookie', leaderCookie)
      .send({
        name: 'Gold Sponsor',
        amount: '10000.00',
        benefits: 'Stage mention, booth, logo placement',
        displayOrder: 1,
      });
    expect(packageCreate.status).toBe(201);
    expect(packageCreate.body.data).toMatchObject({
      name: 'Gold Sponsor',
      amount: '10000.00',
      isActive: true,
    });

    const candidates = await request(app)
      .get(`/api/events/${eventId}/member-candidates`)
      .set('Cookie', leaderCookie);
    expect(candidates.status).toBe(200);
    expect(candidates.body.data.map((candidate) => candidate.id)).toEqual(
      expect.arrayContaining([memberOne.id, memberTwo.id, supervisor.id, unrelatedMember.id]),
    );

    for (const target of [memberOne, memberTwo, supervisor]) {
      const added = await request(app)
        .post(`/api/events/${eventId}/members`)
        .set('Cookie', leaderCookie)
        .send({ userId: target.id });
      expect(added.status).toBe(201);
      expect(added.body.data.user.id).toBe(target.id);
    }

    const unrelatedEventRead = await request(app)
      .get(`/api/events/${eventId}`)
      .set('Cookie', unrelatedCookie);
    expect(unrelatedEventRead.status).toBe(404);
    expect(unrelatedEventRead.body.error.code).toBe('EVENT_NOT_FOUND');

    const memberEventRead = await request(app)
      .get(`/api/events/${eventId}`)
      .set('Cookie', memberCookie);
    expect(memberEventRead.status).toBe(200);
    expect(memberEventRead.body.data.permissions.canEdit).toBe(false);

    const supervisorEventRead = await request(app)
      .get(`/api/events/${eventId}`)
      .set('Cookie', supervisorCookie);
    expect(supervisorEventRead.status).toBe(200);
    expect(supervisorEventRead.body.data.permissions).toMatchObject({
      canRead: true,
      canEdit: false,
      canManageMembers: false,
      canManagePackages: false,
    });

    for (const write of [
      () =>
        request(app)
          .patch(`/api/events/${eventId}`)
          .set('Cookie', memberCookie)
          .send({ location: 'Aqaba' }),
      () =>
        request(app)
          .post(`/api/events/${eventId}/packages`)
          .set('Cookie', supervisorCookie)
          .send({ name: 'Blocked Sponsor', amount: '500.00', benefits: 'Blocked' }),
    ]) {
      const denied = await write();
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe('AUTH_FORBIDDEN');
    }

    const companyCreate = await request(app)
      .post('/api/companies')
      .set('Cookie', leaderCookie)
      .send({
        name: `Jordan Telecom Phase7 ${stamp}`,
        sector: 'Technology',
        city: 'Amman',
        website: `https://phase7-${stamp}.example.com/sponsors`,
        generalEmail: `hello@phase7-${stamp}.example.com`,
        phone: '+962 (79) 111-2222',
        contact: {
          fullName: 'Lina Sponsor',
          position: 'Partnerships Manager',
          email: `lina@phase7-${stamp}.example.com`,
          preferredContactMethod: 'EMAIL',
          isPrimary: true,
        },
      });
    expect(companyCreate.status).toBe(201);
    expect(companyCreate.body.data.primaryContact).toMatchObject({
      fullName: 'Lina Sponsor',
      isPrimary: true,
    });
    const companyId = companyCreate.body.data.id;
    const firstContactId = companyCreate.body.data.primaryContact.id;

    const secondContact = await request(app)
      .post(`/api/companies/${companyId}/contacts`)
      .set('Cookie', leaderCookie)
      .send({
        fullName: 'Omar Partnerships',
        position: 'Community Lead',
        phone: '+962 (79) 333-4444',
        preferredContactMethod: 'WHATSAPP',
      });
    expect(secondContact.status).toBe(201);

    const primaryChange = await request(app)
      .post(`/api/companies/${companyId}/contacts/${secondContact.body.data.id}/make-primary`)
      .set('Cookie', leaderCookie);
    expect(primaryChange.status).toBe(200);
    expect(primaryChange.body.data.isPrimary).toBe(true);

    const contacts = await CompanyContact.findAll({
      where: { companyId },
      order: [['fullName', 'ASC']],
    });
    expect(contacts.find((contact) => contact.id === firstContactId).isPrimary).toBe(false);
    expect(contacts.find((contact) => contact.id === secondContact.body.data.id).isPrimary).toBe(
      true,
    );

    const duplicates = await request(app)
      .get('/api/companies/duplicates')
      .query({
        name: `Jordan Telecom Phase7 ${stamp} Branch`,
        website: `https://www.phase7-${stamp}.example.com/other`,
        city: 'Amman',
      })
      .set('Cookie', leaderCookie);
    expect(duplicates.status).toBe(200);
    expect(duplicates.body.data[0]).toMatchObject({
      companyId,
      confidence: 'HIGH',
      reasons: expect.arrayContaining(['same website domain']),
    });

    const leaderEventRefresh = await request(app)
      .get(`/api/events/${eventId}`)
      .set('Cookie', leaderCookie);
    expect(leaderEventRefresh.status).toBe(200);
    expect(leaderEventRefresh.body.data.id).toBe(eventId);

    const leaderCompanyRefresh = await request(app)
      .get(`/api/companies/${companyId}`)
      .set('Cookie', leaderCookie);
    expect(leaderCompanyRefresh.status).toBe(200);
    expect(leaderCompanyRefresh.body.data).toMatchObject({
      id: companyId,
      sponsorshipHistory: { status: 'UNAVAILABLE', items: [] },
    });

    const supervisorCompanyRead = await request(app)
      .get(`/api/companies/${companyId}`)
      .set('Cookie', supervisorCookie);
    expect(supervisorCompanyRead.status).toBe(200);
    expect(supervisorCompanyRead.body.data.permissions).toMatchObject({
      canEdit: false,
      canManageContacts: false,
    });

    for (const write of [
      () =>
        request(app)
          .patch(`/api/companies/${companyId}`)
          .set('Cookie', supervisorCookie)
          .send({ city: 'Irbid' }),
      () =>
        request(app)
          .post(`/api/companies/${companyId}/contacts`)
          .set('Cookie', memberCookie)
          .send({ fullName: 'Blocked Contact', email: 'blocked@example.com' }),
    ]) {
      const denied = await write();
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe('AUTH_FORBIDDEN');
    }

    const [auditRows] = await sequelize.query(
      `
        select action, count(*)::int as count
        from audit_logs
        where action in (
          'EVENT_CREATED',
          'EVENT_UPDATED',
          'EVENT_MEMBER_ADDED',
          'EVENT_PACKAGE_CREATED',
          'COMPANY_CREATED',
          'COMPANY_CONTACT_CREATED',
          'COMPANY_CONTACT_PRIMARY_CHANGED'
        )
        group by action
        order by action
      `,
    );
    const auditCounts = Object.fromEntries(auditRows.map((row) => [row.action, row.count]));
    expect(auditCounts).toMatchObject({
      COMPANY_CONTACT_PRIMARY_CHANGED: 1,
      COMPANY_CREATED: 1,
      EVENT_CREATED: 1,
      EVENT_UPDATED: 1,
      EVENT_PACKAGE_CREATED: 1,
    });
    expect(auditCounts.COMPANY_CONTACT_CREATED).toBe(2);
    expect(auditCounts.EVENT_MEMBER_ADDED).toBe(3);
  }, 30000);
});

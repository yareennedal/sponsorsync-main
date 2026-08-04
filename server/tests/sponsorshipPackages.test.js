import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { sequelize } from '../src/db/index.js';
import { AuditLog, Event, EventMember, SponsorshipPackage } from '../src/models/index.js';
import { createUser, resetDb } from './helpers.js';

const app = createApp();
const PASSWORD = 'Password123!';

let leader;
let member;
let otherLeader;
let leaderCookie;
let memberCookie;
let event;
let otherEvent;

async function loginCookie(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res.headers['set-cookie'][0].split(';')[0];
}

async function createEventFixture({ name, owner = leader } = {}) {
  return Event.create({
    name,
    category: 'Technology',
    eventDate: '2026-09-10',
    financialTarget: '1000.00',
    sponsorshipDeadline: '2026-09-01',
    targetSectors: ['Technology'],
    targetCities: ['Amman'],
    status: 'ACTIVE',
    leaderId: owner.id,
    createdBy: owner.id,
  });
}

describe('sponsorship package API', () => {
  beforeAll(async () => {
    if (!sequelize) throw new Error('DATABASE_URL_TEST must be set for package API tests');
    await resetDb();
    leader = await createUser({ email: 'packages-leader@test.local', role: 'LEADER' });
    member = await createUser({ email: 'packages-member@test.local', role: 'MEMBER' });
    otherLeader = await createUser({ email: 'packages-other-leader@test.local', role: 'LEADER' });
    event = await createEventFixture({ name: 'Package event' });
    otherEvent = await createEventFixture({ name: 'Other package event', owner: otherLeader });
    await EventMember.create({ eventId: event.id, userId: member.id, addedBy: leader.id });
    leaderCookie = await loginCookie(leader.email);
    memberCookie = await loginCookie(member.email);
  });

  afterAll(async () => {
    await sequelize?.close();
  });

  it('lists active packages ordered by display order, amount descending, then name', async () => {
    await SponsorshipPackage.bulkCreate([
      {
        eventId: event.id,
        name: 'Silver',
        amount: '300.00',
        benefits: 'Printed logo',
        displayOrder: 2,
        createdBy: leader.id,
      },
      {
        eventId: event.id,
        name: 'Gold',
        amount: '500.00',
        benefits: 'Stage logo',
        displayOrder: 1,
        createdBy: leader.id,
      },
      {
        eventId: event.id,
        name: 'Platinum',
        amount: '700.00',
        benefits: 'Main sponsor',
        displayOrder: 1,
        createdBy: leader.id,
      },
      {
        eventId: event.id,
        name: 'Inactive',
        amount: '900.00',
        benefits: 'Old tier',
        displayOrder: 0,
        isActive: false,
        createdBy: leader.id,
      },
    ]);

    const res = await request(app)
      .get(`/api/events/${event.id}/packages`)
      .set('Cookie', memberCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.map((pkg) => pkg.name)).toEqual(['Platinum', 'Gold', 'Silver']);
  });

  it('rejects duplicate active package names in one event but allows the same name in another event', async () => {
    const duplicate = await request(app)
      .post(`/api/events/${event.id}/packages`)
      .set('Cookie', leaderCookie)
      .send({
        name: 'Gold',
        amount: '650.00',
        benefits: 'Duplicate tier',
        displayOrder: 1,
      });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('EVENT_PACKAGE_NAME_TAKEN');

    const otherLeaderCookie = await loginCookie(otherLeader.email);
    const allowed = await request(app)
      .post(`/api/events/${otherEvent.id}/packages`)
      .set('Cookie', otherLeaderCookie)
      .send({
        name: 'Gold',
        amount: '650.00',
        benefits: 'Same name, different event',
        displayOrder: 1,
      });
    expect(allowed.status).toBe(201);
    expect(allowed.body.data.name).toBe('Gold');
  });

  it('updates and deactivates packages without hard deleting them and writes audit rows', async () => {
    const created = await request(app)
      .post(`/api/events/${event.id}/packages`)
      .set('Cookie', leaderCookie)
      .send({
        name: 'Partner',
        amount: '250.00',
        benefits: 'Logo on website',
        displayOrder: 3,
      });
    expect(created.status).toBe(201);

    const updated = await request(app)
      .patch(`/api/events/${event.id}/packages/${created.body.data.id}`)
      .set('Cookie', leaderCookie)
      .send({ amount: '275.00', benefits: 'Logo on website and brochure' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.amount).toBe('275.00');

    const deleted = await request(app)
      .delete(`/api/events/${event.id}/packages/${created.body.data.id}`)
      .set('Cookie', leaderCookie);
    expect(deleted.status).toBe(200);
    expect(deleted.body.data.isActive).toBe(false);

    const stillThere = await SponsorshipPackage.findByPk(created.body.data.id);
    expect(stillThere).toBeTruthy();
    expect(stillThere.isActive).toBe(false);

    const auditRows = await AuditLog.findAll({
      where: { entityId: created.body.data.id },
      order: [['createdAt', 'ASC']],
    });
    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        'EVENT_PACKAGE_CREATED',
        'EVENT_PACKAGE_UPDATED',
        'EVENT_PACKAGE_DEACTIVATED',
      ]),
    );
  });

  it('lets members read packages but rejects package writes', async () => {
    const read = await request(app)
      .get(`/api/events/${event.id}/packages`)
      .set('Cookie', memberCookie);
    expect(read.status).toBe(200);

    const write = await request(app)
      .post(`/api/events/${event.id}/packages`)
      .set('Cookie', memberCookie)
      .send({ name: 'Nope', amount: '10.00', benefits: 'Nope' });
    expect(write.status).toBe(403);
    expect(write.body.error.code).toBe('AUTH_FORBIDDEN');
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { sequelize } from '../src/db/index.js';
import { AuditLog, Event, EventMember, User } from '../src/models/index.js';
import { createUser, resetDb } from './helpers.js';

const app = createApp();

const PASSWORD = 'Password123!';

let admin;
let leader;
let otherLeader;
let inactiveLeader;
let member;
let supervisor;
let unrelatedMember;
let extraMember;
let extraSupervisor;
let reactivationCandidate;
let inactiveMember;
let adminCookie;
let leaderCookie;
let memberCookie;
let leaderEvent;
let otherLeaderEvent;
let archivedEvent;

async function loginCookie(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res.headers['set-cookie'][0].split(';')[0];
}

async function createEventFixture({
  name,
  owner = leader,
  status = 'ACTIVE',
  archivedAt = null,
  eventDate = '2026-09-10',
} = {}) {
  return Event.create({
    name,
    category: 'Technology',
    eventDate,
    financialTarget: '1000.00',
    sponsorshipDeadline: '2026-09-01',
    targetSectors: ['Technology'],
    targetCities: ['Amman'],
    status,
    leaderId: owner.id,
    createdBy: owner.id,
    archivedAt,
  });
}

async function eventIdsFor(cookie, query = {}) {
  const res = await request(app).get('/api/events').query(query).set('Cookie', cookie);
  expect(res.status).toBe(200);
  return res.body.data.map((event) => event.id);
}

describe('event API', () => {
  beforeAll(async () => {
    if (!sequelize) throw new Error('DATABASE_URL_TEST must be set for event API tests');
    await resetDb();
    admin = await createUser({ email: 'events-admin@test.local', role: 'ADMIN' });
    leader = await createUser({ email: 'events-leader@test.local', role: 'LEADER' });
    otherLeader = await createUser({ email: 'events-other-leader@test.local', role: 'LEADER' });
    inactiveLeader = await createUser({
      email: 'events-inactive-leader@test.local',
      role: 'LEADER',
      isActive: false,
    });
    member = await createUser({ email: 'events-member@test.local', role: 'MEMBER' });
    supervisor = await createUser({ email: 'events-supervisor@test.local', role: 'SUPERVISOR' });
    unrelatedMember = await createUser({ email: 'events-unrelated@test.local', role: 'MEMBER' });
    extraMember = await createUser({ email: 'events-extra-member@test.local', role: 'MEMBER' });
    extraSupervisor = await createUser({
      email: 'events-extra-supervisor@test.local',
      role: 'SUPERVISOR',
    });
    reactivationCandidate = await createUser({
      fullName: 'Reactivation Candidate',
      email: 'events-reactivation@test.local',
      role: 'MEMBER',
    });
    inactiveMember = await createUser({
      email: 'events-inactive-member@test.local',
      role: 'MEMBER',
      isActive: false,
    });

    leaderEvent = await createEventFixture({ name: 'Leader visible event' });
    otherLeaderEvent = await createEventFixture({
      name: 'Other leader visible event',
      owner: otherLeader,
    });
    archivedEvent = await createEventFixture({
      name: 'Archived event',
      status: 'ARCHIVED',
      archivedAt: new Date(),
    });

    await EventMember.bulkCreate([
      { eventId: leaderEvent.id, userId: member.id, addedBy: leader.id },
      { eventId: leaderEvent.id, userId: supervisor.id, addedBy: leader.id },
      { eventId: archivedEvent.id, userId: member.id, addedBy: leader.id },
      {
        eventId: leaderEvent.id,
        userId: reactivationCandidate.id,
        addedBy: leader.id,
        isActive: false,
        removedAt: new Date(),
      },
    ]);

    adminCookie = await loginCookie(admin.email);
    leaderCookie = await loginCookie(leader.email);
    memberCookie = await loginCookie(member.email);
  });

  afterAll(async () => {
    await sequelize?.close();
  });

  it('lists accessible non-archived events by role', async () => {
    await expect(eventIdsFor(adminCookie)).resolves.toEqual(
      expect.arrayContaining([leaderEvent.id, otherLeaderEvent.id]),
    );
    expect(await eventIdsFor(adminCookie)).not.toContain(archivedEvent.id);

    expect(await eventIdsFor(leaderCookie)).toEqual([leaderEvent.id]);
    expect(await eventIdsFor(memberCookie)).toEqual([leaderEvent.id]);

    const unrelatedCookie = await loginCookie(unrelatedMember.email);
    expect(await eventIdsFor(unrelatedCookie)).not.toContain(leaderEvent.id);
  });

  it('hides inaccessible direct reads but lets event members read detail without edit permission', async () => {
    const unrelatedCookie = await loginCookie(unrelatedMember.email);
    const hidden = await request(app)
      .get(`/api/events/${leaderEvent.id}`)
      .set('Cookie', unrelatedCookie);
    expect(hidden.status).toBe(404);
    expect(hidden.body.error.code).toBe('EVENT_NOT_FOUND');

    const detail = await request(app)
      .get(`/api/events/${leaderEvent.id}`)
      .set('Cookie', memberCookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data.leader.id).toBe(leader.id);
    expect(detail.body.data.members.map((u) => u.id)).toEqual(
      expect.arrayContaining([member.id, supervisor.id]),
    );
    expect(detail.body.data.permissions).toMatchObject({
      canRead: true,
      canEdit: false,
      canManageMembers: false,
      canManagePackages: false,
    });

    const edit = await request(app)
      .patch(`/api/events/${leaderEvent.id}`)
      .set('Cookie', memberCookie)
      .send({ location: 'Amman' });
    expect(edit.status).toBe(403);
    expect(edit.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('creates events with role-scoped leader rules and writes audit rows', async () => {
    const leaderCreate = await request(app)
      .post('/api/events')
      .set('Cookie', leaderCookie)
      .send({
        name: 'Leader-created event',
        category: 'Technology',
        eventDate: '2026-10-01',
        sponsorshipDeadline: '2026-09-20',
        financialTarget: '1500.00',
        targetSectors: ['Technology'],
        targetCities: ['Amman'],
        status: 'ACTIVE',
      });
    expect(leaderCreate.status).toBe(201);
    expect(leaderCreate.body.data.leader.id).toBe(leader.id);

    const forbiddenLeader = await request(app)
      .post('/api/events')
      .set('Cookie', leaderCookie)
      .send({
        name: 'Bad leader event',
        category: 'Technology',
        eventDate: '2026-10-02',
        financialTarget: '1500.00',
        leaderId: otherLeader.id,
      });
    expect(forbiddenLeader.status).toBe(403);
    expect(forbiddenLeader.body.error.code).toBe('AUTH_FORBIDDEN');

    const adminCreate = await request(app).post('/api/events').set('Cookie', adminCookie).send({
      name: 'Admin-created event',
      category: 'Technology',
      eventDate: '2026-10-03',
      financialTarget: '2000.00',
      leaderId: otherLeader.id,
    });
    expect(adminCreate.status).toBe(201);
    expect(adminCreate.body.data.leader.id).toBe(otherLeader.id);

    for (const invalidLeaderId of [member.id, inactiveLeader.id]) {
      const invalid = await request(app)
        .post('/api/events')
        .set('Cookie', adminCookie)
        .send({
          name: `Invalid leader ${invalidLeaderId}`,
          category: 'Technology',
          eventDate: '2026-10-04',
          financialTarget: '2000.00',
          leaderId: invalidLeaderId,
        });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.code).toBe('EVENT_LEADER_INVALID');
    }

    const audit = await AuditLog.findOne({
      where: { action: 'EVENT_CREATED', entityId: leaderCreate.body.data.id },
    });
    expect(audit).toBeTruthy();
  });

  it('validates event dates, targets, and forbidden general update fields', async () => {
    const badCreate = await request(app).post('/api/events').set('Cookie', leaderCookie).send({
      name: 'Bad dates',
      category: 'Technology',
      eventDate: '2026-10-01',
      sponsorshipDeadline: '2026-10-02',
      financialTarget: '-1.00',
    });
    expect(badCreate.status).toBe(400);
    expect(badCreate.body.error.code).toBe('VALIDATION_ERROR');

    const forbiddenPatch = await request(app)
      .patch(`/api/events/${leaderEvent.id}`)
      .set('Cookie', leaderCookie)
      .send({ status: 'COMPLETED', leaderId: otherLeader.id });
    expect(forbiddenPatch.status).toBe(400);
    expect(forbiddenPatch.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates events, enforces status transitions, and handles admin-only restore', async () => {
    const updated = await request(app)
      .patch(`/api/events/${leaderEvent.id}`)
      .set('Cookie', leaderCookie)
      .send({ location: 'Irbid', financialTarget: '1750.00' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.location).toBe('Irbid');

    const draft = await createEventFixture({ name: 'Draft transition event', status: 'DRAFT' });
    const active = await request(app)
      .patch(`/api/events/${draft.id}/status`)
      .set('Cookie', leaderCookie)
      .send({ status: 'ACTIVE' });
    expect(active.status).toBe(200);
    expect(active.body.data.status).toBe('ACTIVE');

    const invalid = await request(app)
      .patch(`/api/events/${draft.id}/status`)
      .set('Cookie', leaderCookie)
      .send({ status: 'DRAFT' });
    expect(invalid.status).toBe(422);
    expect(invalid.body.error.code).toBe('EVENT_STATUS_TRANSITION_INVALID');

    const restoreByLeader = await request(app)
      .patch(`/api/events/${archivedEvent.id}/status`)
      .set('Cookie', leaderCookie)
      .send({ status: 'ACTIVE' });
    expect(restoreByLeader.status).toBe(403);
    expect(restoreByLeader.body.error.code).toBe('AUTH_FORBIDDEN');

    const restoreByAdmin = await request(app)
      .patch(`/api/events/${archivedEvent.id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'ACTIVE' });
    expect(restoreByAdmin.status).toBe(200);
    expect(restoreByAdmin.body.data.status).toBe('ACTIVE');
    expect(restoreByAdmin.body.data.archivedAt).toBeNull();
  });

  it('transfers leadership as admin, deactivates duplicate membership, and audits the change', async () => {
    const transferEvent = await createEventFixture({ name: 'Transfer event' });
    await EventMember.create({
      eventId: transferEvent.id,
      userId: otherLeader.id,
      addedBy: leader.id,
    });

    const missingReason = await request(app)
      .patch(`/api/events/${transferEvent.id}/leader`)
      .set('Cookie', adminCookie)
      .send({ leaderId: otherLeader.id });
    expect(missingReason.status).toBe(400);
    expect(missingReason.body.error.code).toBe('VALIDATION_ERROR');

    const transferred = await request(app)
      .patch(`/api/events/${transferEvent.id}/leader`)
      .set('Cookie', adminCookie)
      .send({ leaderId: otherLeader.id, reason: 'تسليم المسؤولية' });
    expect(transferred.status).toBe(200);
    expect(transferred.body.data.leader.id).toBe(otherLeader.id);

    const membership = await EventMember.findOne({
      where: { eventId: transferEvent.id, userId: otherLeader.id },
    });
    expect(membership.isActive).toBe(false);
    expect(membership.removedAt).toBeTruthy();

    const audit = await AuditLog.findOne({
      where: { action: 'EVENT_LEADER_TRANSFERRED', entityId: transferEvent.id },
    });
    expect(audit.afterValues.leaderId).toBe(otherLeader.id);
  });

  it('lists eligible member candidates for managed events without exposing user management', async () => {
    const res = await request(app)
      .get(`/api/events/${leaderEvent.id}/member-candidates`)
      .set('Cookie', leaderCookie);

    expect(res.status).toBe(200);
    const candidateIds = res.body.data.map((candidate) => candidate.id);
    expect(candidateIds).toEqual(
      expect.arrayContaining([
        extraMember.id,
        extraSupervisor.id,
        unrelatedMember.id,
        reactivationCandidate.id,
      ]),
    );
    expect(candidateIds).not.toEqual(
      expect.arrayContaining([
        leader.id,
        otherLeader.id,
        inactiveLeader.id,
        member.id,
        supervisor.id,
        inactiveMember.id,
      ]),
    );
    expect(
      res.body.data.find((candidate) => candidate.id === reactivationCandidate.id).membershipStatus,
    ).toBe('INACTIVE');
    expect(
      res.body.data.find((candidate) => candidate.id === extraMember.id).membershipStatus,
    ).toBe('NONE');
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 20 });

    const searched = await request(app)
      .get(`/api/events/${leaderEvent.id}/member-candidates`)
      .query({ search: 'reactivation' })
      .set('Cookie', leaderCookie);
    expect(searched.status).toBe(200);
    expect(searched.body.data.map((candidate) => candidate.id)).toEqual([reactivationCandidate.id]);

    const supervisors = await request(app)
      .get(`/api/events/${leaderEvent.id}/member-candidates`)
      .query({ role: 'SUPERVISOR' })
      .set('Cookie', leaderCookie);
    expect(supervisors.status).toBe(200);
    expect(supervisors.body.data.map((candidate) => candidate.id)).toEqual([extraSupervisor.id]);

    const memberBlocked = await request(app)
      .get(`/api/events/${leaderEvent.id}/member-candidates`)
      .set('Cookie', memberCookie);
    expect(memberBlocked.status).toBe(403);
    expect(memberBlocked.body.error.code).toBe('AUTH_FORBIDDEN');

    const otherLeaderCookie = await loginCookie(otherLeader.email);
    const hidden = await request(app)
      .get(`/api/events/${leaderEvent.id}/member-candidates`)
      .set('Cookie', otherLeaderCookie);
    expect(hidden.status).toBe(404);
    expect(hidden.body.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('manages event members with role checks, reactivation, soft removal, and audit rows', async () => {
    const added = await request(app)
      .post(`/api/events/${leaderEvent.id}/members`)
      .set('Cookie', leaderCookie)
      .send({ userId: extraMember.id });
    expect(added.status).toBe(201);
    expect(added.body.data.user.id).toBe(extraMember.id);

    const leaderConflict = await request(app)
      .post(`/api/events/${leaderEvent.id}/members`)
      .set('Cookie', leaderCookie)
      .send({ userId: leader.id });
    expect(leaderConflict.status).toBe(409);
    expect(leaderConflict.body.error.code).toBe('EVENT_MEMBER_LEADER_CONFLICT');

    const wrongRole = await request(app)
      .post(`/api/events/${leaderEvent.id}/members`)
      .set('Cookie', leaderCookie)
      .send({ userId: otherLeader.id });
    expect(wrongRole.status).toBe(400);
    expect(wrongRole.body.error.code).toBe('EVENT_MEMBER_USER_INVALID');

    const removed = await request(app)
      .delete(`/api/events/${leaderEvent.id}/members/${extraMember.id}`)
      .set('Cookie', leaderCookie);
    expect(removed.status).toBe(200);
    let membership = await EventMember.findOne({
      where: { eventId: leaderEvent.id, userId: extraMember.id },
    });
    expect(membership.isActive).toBe(false);
    expect(membership.removedAt).toBeTruthy();

    const reactivated = await request(app)
      .post(`/api/events/${leaderEvent.id}/members`)
      .set('Cookie', leaderCookie)
      .send({ userId: extraMember.id });
    expect(reactivated.status).toBe(200);
    membership = await EventMember.findOne({
      where: { eventId: leaderEvent.id, userId: extraMember.id },
    });
    expect(membership.isActive).toBe(true);
    expect(membership.removedAt).toBeNull();

    const auditActions = await AuditLog.findAll({
      where: { entityId: leaderEvent.id },
      order: [['createdAt', 'ASC']],
    });
    expect(auditActions.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        'EVENT_MEMBER_ADDED',
        'EVENT_MEMBER_REMOVED',
        'EVENT_MEMBER_REACTIVATED',
      ]),
    );
  });

  it('prevents deactivating users who lead active events', async () => {
    const res = await request(app)
      .patch(`/api/users/${leader.id}/status`)
      .set('Cookie', adminCookie)
      .send({ isActive: false });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USER_LEADS_ACTIVE_EVENTS');
    expect(res.body.error.details.blockingEventCount).toBeGreaterThan(0);
    const stillActive = await User.findByPk(leader.id);
    expect(stillActive.isActive).toBe(true);
  });

  it('rejects non-admin or non-leader users on every event write route', async () => {
    const writeRequests = [
      () =>
        request(app).post('/api/events').set('Cookie', memberCookie).send({
          name: 'Escalation event',
          category: 'Technology',
          eventDate: '2026-11-01',
          financialTarget: '100.00',
        }),
      () =>
        request(app)
          .patch(`/api/events/${leaderEvent.id}`)
          .set('Cookie', memberCookie)
          .send({ location: 'Aqaba' }),
      () =>
        request(app)
          .patch(`/api/events/${leaderEvent.id}/status`)
          .set('Cookie', memberCookie)
          .send({ status: 'COMPLETED' }),
      () =>
        request(app)
          .patch(`/api/events/${leaderEvent.id}/leader`)
          .set('Cookie', leaderCookie)
          .send({ leaderId: otherLeader.id, reason: 'No admin' }),
      () =>
        request(app)
          .post(`/api/events/${leaderEvent.id}/members`)
          .set('Cookie', memberCookie)
          .send({ userId: unrelatedMember.id }),
      () =>
        request(app)
          .delete(`/api/events/${leaderEvent.id}/members/${member.id}`)
          .set('Cookie', memberCookie),
    ];

    for (const send of writeRequests) {
      const res = await send();
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
    }
  });
});

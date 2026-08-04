import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sequelize } from '../src/db/index.js';
import { Event, EventMember } from '../src/models/index.js';
import { getAccessibleEvent, getEventPermissions } from '../src/services/eventAccessService.js';
import { createUser, resetDb } from './helpers.js';

let admin;
let leader;
let member;
let supervisor;
let unrelatedMember;
let activeEvent;
let archivedEvent;

async function createEventFixture({ name, owner = leader, status = 'ACTIVE', archivedAt = null }) {
  return Event.create({
    name,
    category: 'Technology',
    eventDate: '2026-09-10',
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

describe('eventAccessService', () => {
  beforeAll(async () => {
    if (!sequelize) throw new Error('DATABASE_URL_TEST must be set for event access tests');
    await resetDb();
    admin = await createUser({ email: 'access-admin@test.local', role: 'ADMIN' });
    leader = await createUser({ email: 'access-leader@test.local', role: 'LEADER' });
    member = await createUser({ email: 'access-member@test.local', role: 'MEMBER' });
    supervisor = await createUser({ email: 'access-supervisor@test.local', role: 'SUPERVISOR' });
    unrelatedMember = await createUser({ email: 'access-unrelated@test.local', role: 'MEMBER' });

    activeEvent = await createEventFixture({ name: 'Access active event' });
    archivedEvent = await createEventFixture({
      name: 'Access archived event',
      status: 'ARCHIVED',
      archivedAt: new Date(),
    });

    await EventMember.create({
      eventId: activeEvent.id,
      userId: member.id,
      addedBy: leader.id,
    });
    await EventMember.create({
      eventId: activeEvent.id,
      userId: supervisor.id,
      addedBy: leader.id,
    });
    await EventMember.create({
      eventId: archivedEvent.id,
      userId: member.id,
      addedBy: leader.id,
    });
  });

  afterAll(async () => {
    await sequelize?.close();
  });

  it('grants manage permissions to admins and event leaders', () => {
    expect(getEventPermissions({ user: admin, event: activeEvent })).toMatchObject({
      canRead: true,
      canEdit: true,
      canManageMembers: true,
      canManagePackages: true,
      canTransferLeadership: true,
      canChangeStatus: true,
    });
    expect(getEventPermissions({ user: leader, event: activeEvent })).toMatchObject({
      canRead: true,
      canEdit: true,
      canManageMembers: true,
      canManagePackages: true,
      canTransferLeadership: false,
      canChangeStatus: true,
    });
  });

  it('grants read-only permissions to active event members and supervisors', async () => {
    const membership = await EventMember.findOne({
      where: { eventId: activeEvent.id, userId: member.id },
    });

    expect(getEventPermissions({ user: member, event: activeEvent, membership })).toMatchObject({
      canRead: true,
      canEdit: false,
      canManageMembers: false,
      canManagePackages: false,
      canTransferLeadership: false,
      canChangeStatus: false,
    });

    const supervisorEvent = await getAccessibleEvent({
      eventId: activeEvent.id,
      user: supervisor,
    });
    expect(supervisorEvent.event.id).toBe(activeEvent.id);
    expect(supervisorEvent.permissions.canRead).toBe(true);
    expect(supervisorEvent.permissions.canEdit).toBe(false);
  });

  it('hides inaccessible events with EVENT_NOT_FOUND', async () => {
    await expect(
      getAccessibleEvent({ eventId: activeEvent.id, user: unrelatedMember }),
    ).rejects.toMatchObject({
      code: 'EVENT_NOT_FOUND',
      status: 404,
    });
  });

  it('allows admin and leader direct reads of archived events but hides them from members', async () => {
    await expect(
      getAccessibleEvent({ eventId: archivedEvent.id, user: admin }),
    ).resolves.toBeTruthy();
    await expect(
      getAccessibleEvent({ eventId: archivedEvent.id, user: leader }),
    ).resolves.toBeTruthy();

    await expect(
      getAccessibleEvent({ eventId: archivedEvent.id, user: member }),
    ).rejects.toMatchObject({
      code: 'EVENT_NOT_FOUND',
      status: 404,
    });
  });

  it('returns AUTH_FORBIDDEN when a reader attempts manage access', async () => {
    await expect(
      getAccessibleEvent({ eventId: activeEvent.id, user: member, access: 'manage' }),
    ).rejects.toMatchObject({
      code: 'AUTH_FORBIDDEN',
      status: 403,
    });
  });
});

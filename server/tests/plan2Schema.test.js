import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sequelize } from '../src/db/index.js';
import { createUser, resetDb } from './helpers.js';

let User;
let Event;
let EventMember;
let SponsorshipPackage;
let Company;
let CompanyContact;

async function loadModels() {
  ({ User, Event, EventMember, SponsorshipPackage, Company, CompanyContact } =
    await import('../src/models/index.js'));
}

async function createTestUser(email, role = 'MEMBER') {
  return createUser({
    fullName: `${role} ${email}`,
    email,
    role,
  });
}

async function createTestEvent({
  name,
  leader,
  creator = leader,
  eventDate = '2026-09-10',
  sponsorshipDeadline = '2026-09-01',
} = {}) {
  return Event.create({
    name,
    category: 'Technology',
    eventDate,
    financialTarget: '1000.00',
    sponsorshipDeadline,
    targetSectors: ['Technology'],
    targetCities: ['Amman'],
    leaderId: leader.id,
    createdBy: creator.id,
  });
}

describe('Plan 2 phase 1 schema and models', () => {
  beforeAll(async () => {
    if (!sequelize) throw new Error('DATABASE_URL_TEST must be set for Plan 2 schema tests');
    await resetDb();
    await loadModels();
  });

  afterAll(async () => {
    await sequelize?.close();
  });

  it('runs migrations that create the Plan 2 tables', async () => {
    const [tables] = await sequelize.query(`
      SELECT
        to_regclass('public.events') AS events,
        to_regclass('public.event_members') AS event_members,
        to_regclass('public.sponsorship_packages') AS sponsorship_packages,
        to_regclass('public.companies') AS companies,
        to_regclass('public.company_contacts') AS company_contacts
    `);

    expect(tables[0]).toEqual({
      events: 'events',
      event_members: 'event_members',
      sponsorship_packages: 'sponsorship_packages',
      companies: 'companies',
      company_contacts: 'company_contacts',
    });
  });

  it('rejects an invalid event status', async () => {
    const leader = await createTestUser('plan2-status-leader@test.local', 'LEADER');

    await expect(
      Event.create({
        name: 'Invalid status event',
        category: 'Technology',
        eventDate: '2026-09-10',
        financialTarget: '1000.00',
        status: 'WIZARD',
        leaderId: leader.id,
        createdBy: leader.id,
      }),
    ).rejects.toThrow();
  });

  it('rejects a negative event financial target', async () => {
    const leader = await createTestUser('plan2-negative-target-leader@test.local', 'LEADER');

    await expect(
      Event.create({
        name: 'Negative target event',
        category: 'Technology',
        eventDate: '2026-09-10',
        financialTarget: '-1.00',
        leaderId: leader.id,
        createdBy: leader.id,
      }),
    ).rejects.toThrow();
  });

  it('rejects a sponsorship deadline after the event date', async () => {
    const leader = await createTestUser('plan2-deadline-leader@test.local', 'LEADER');

    await expect(
      Event.create({
        name: 'Bad deadline event',
        category: 'Technology',
        eventDate: '2026-09-10',
        financialTarget: '1000.00',
        sponsorshipDeadline: '2026-09-11',
        leaderId: leader.id,
        createdBy: leader.id,
      }),
    ).rejects.toThrow();
  });

  it('rejects duplicate event member rows for the same event and user', async () => {
    const leader = await createTestUser('plan2-members-leader@test.local', 'LEADER');
    const member = await createTestUser('plan2-members-member@test.local');
    const event = await createTestEvent({ name: 'Membership event', leader });

    await EventMember.create({
      eventId: event.id,
      userId: member.id,
      addedBy: leader.id,
    });

    await expect(
      EventMember.create({
        eventId: event.id,
        userId: member.id,
        addedBy: leader.id,
      }),
    ).rejects.toThrow();
  });

  it('rejects duplicate active package names for the same event', async () => {
    const leader = await createTestUser('plan2-package-dup-leader@test.local', 'LEADER');
    const event = await createTestEvent({ name: 'Package duplicate event', leader });

    await SponsorshipPackage.create({
      eventId: event.id,
      name: 'Gold',
      amount: '500.00',
      benefits: 'Logo placement',
      createdBy: leader.id,
    });

    await expect(
      SponsorshipPackage.create({
        eventId: event.id,
        name: 'Gold',
        amount: '750.00',
        benefits: 'Booth placement',
        createdBy: leader.id,
      }),
    ).rejects.toThrow();
  });

  it('allows the same active package name for different events', async () => {
    const leader = await createTestUser('plan2-package-cross-leader@test.local', 'LEADER');
    const firstEvent = await createTestEvent({ name: 'First package event', leader });
    const secondEvent = await createTestEvent({ name: 'Second package event', leader });

    await SponsorshipPackage.create({
      eventId: firstEvent.id,
      name: 'Silver',
      amount: '300.00',
      benefits: 'Social media mention',
      createdBy: leader.id,
    });

    const secondPackage = await SponsorshipPackage.create({
      eventId: secondEvent.id,
      name: 'Silver',
      amount: '300.00',
      benefits: 'Social media mention',
      createdBy: leader.id,
    });

    expect(secondPackage.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('allows an inactive package with the same name as an active package', async () => {
    const leader = await createTestUser('plan2-package-inactive-leader@test.local', 'LEADER');
    const event = await createTestEvent({ name: 'Inactive package event', leader });

    await SponsorshipPackage.create({
      eventId: event.id,
      name: 'Bronze',
      amount: '200.00',
      benefits: 'Printed logo',
      createdBy: leader.id,
    });

    const inactivePackage = await SponsorshipPackage.create({
      eventId: event.id,
      name: 'Bronze',
      amount: '100.00',
      benefits: 'Archived printed logo',
      isActive: false,
      createdBy: leader.id,
    });

    expect(inactivePackage.isActive).toBe(false);
  });

  it('rejects a sponsorship package without benefits', async () => {
    const leader = await createTestUser('plan2-package-benefits-leader@test.local', 'LEADER');
    const event = await createTestEvent({ name: 'Package benefits event', leader });

    await expect(
      SponsorshipPackage.create({
        eventId: event.id,
        name: 'Partner',
        amount: '150.00',
        createdBy: leader.id,
      }),
    ).rejects.toThrow();
  });

  it('allows two companies with the same normalized name', async () => {
    const creator = await createTestUser('plan2-company-creator@test.local', 'LEADER');

    const firstCompany = await Company.create({
      name: 'Acme Jordan',
      normalizedName: 'acme',
      sector: 'Technology',
      createdBy: creator.id,
    });
    const secondCompany = await Company.create({
      name: 'ACME Levant',
      normalizedName: 'acme',
      sector: 'Technology',
      createdBy: creator.id,
    });

    expect(firstCompany.id).not.toBe(secondCompany.id);
  });

  it('rejects a company without a sector', async () => {
    const creator = await createTestUser('plan2-company-sector-creator@test.local', 'LEADER');

    await expect(
      Company.create({
        name: 'No Sector Co',
        normalizedName: 'no-sector-co',
        createdBy: creator.id,
      }),
    ).rejects.toThrow();
  });

  it('rejects an invalid contact method', async () => {
    const creator = await createTestUser('plan2-contact-method-creator@test.local', 'LEADER');
    const company = await Company.create({
      name: 'Contact Method Co',
      normalizedName: 'contact-method-co',
      sector: 'Technology',
      createdBy: creator.id,
    });

    await expect(
      CompanyContact.create({
        companyId: company.id,
        fullName: 'Invalid Method',
        email: 'invalid-method@test.local',
        preferredContactMethod: 'FAX',
        createdBy: creator.id,
      }),
    ).rejects.toThrow();
  });

  it('rejects a contact without email or phone', async () => {
    const creator = await createTestUser('plan2-contact-channel-creator@test.local', 'LEADER');
    const company = await Company.create({
      name: 'Contact Channel Co',
      normalizedName: 'contact-channel-co',
      sector: 'Technology',
      createdBy: creator.id,
    });

    await expect(
      CompanyContact.create({
        companyId: company.id,
        fullName: 'No Channel',
        createdBy: creator.id,
      }),
    ).rejects.toThrow();
  });

  it('loads the event leader through the leader association alias', async () => {
    const leader = await createTestUser('plan2-association-leader@test.local', 'LEADER');
    const event = await createTestEvent({ name: 'Association event', leader });

    const eventWithLeader = await Event.findByPk(event.id, {
      include: [{ model: User, as: 'leader' }],
    });

    expect(eventWithLeader.leader.id).toBe(leader.id);
    expect(eventWithLeader.leader.email).toBe('plan2-association-leader@test.local');
  });

  it('uses restrict delete rules for soft-retained event and company children', async () => {
    const [rules] = await sequelize.query(`
      SELECT kcu.table_name, kcu.column_name, rc.delete_rule
      FROM information_schema.referential_constraints rc
      JOIN information_schema.table_constraints tc
        ON tc.constraint_catalog = rc.constraint_catalog
       AND tc.constraint_schema = rc.constraint_schema
       AND tc.constraint_name = rc.constraint_name
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_catalog = tc.constraint_catalog
       AND kcu.constraint_schema = tc.constraint_schema
       AND kcu.constraint_name = tc.constraint_name
      WHERE tc.constraint_schema = 'public'
        AND (kcu.table_name, kcu.column_name) IN (
          ('event_members', 'event_id'),
          ('sponsorship_packages', 'event_id'),
          ('company_contacts', 'company_id')
        )
      ORDER BY kcu.table_name, kcu.column_name
    `);

    expect(rules).toEqual([
      { table_name: 'company_contacts', column_name: 'company_id', delete_rule: 'RESTRICT' },
      { table_name: 'event_members', column_name: 'event_id', delete_rule: 'RESTRICT' },
      { table_name: 'sponsorship_packages', column_name: 'event_id', delete_rule: 'RESTRICT' },
    ]);
  });
});

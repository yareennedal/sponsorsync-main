import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { sequelize } from '../src/db/index.js';
import { COMPANY_DUPLICATE_CONFIDENCE } from '../src/constants/plan2Constants.js';
import { Company } from '../src/models/index.js';
import { findCompanyDuplicates } from '../src/services/companyDuplicateService.js';
import { createUser, resetDb } from './helpers.js';

let creator;

async function createCompany({
  name,
  normalizedName,
  city = null,
  websiteDomain = null,
  generalEmail = null,
  phone = null,
  archivedAt = null,
} = {}) {
  return Company.create({
    name,
    normalizedName,
    sector: 'Technology',
    city,
    websiteDomain,
    generalEmail,
    phone,
    createdBy: creator.id,
    archivedAt,
  });
}

describe('company duplicate detection', () => {
  beforeEach(async () => {
    if (!sequelize) throw new Error('DATABASE_URL_TEST must be set for company duplicate tests');
    await resetDb();
    creator = await createUser({
      email: `company-duplicates-${Date.now()}@test.local`,
      role: 'LEADER',
    });
  });

  afterAll(async () => {
    await sequelize?.close();
  });

  it('returns a high-confidence match for the same non-empty website domain', async () => {
    const company = await createCompany({
      name: 'Jordan Telecom',
      normalizedName: 'jordan telecom',
      websiteDomain: 'jordan-telecom.com',
    });

    const matches = await findCompanyDuplicates({
      input: { website: 'https://www.jordan-telecom.com/sponsors' },
    });

    expect(matches).toEqual([
      expect.objectContaining({
        companyId: company.id,
        name: 'Jordan Telecom',
        confidence: COMPANY_DUPLICATE_CONFIDENCE.HIGH,
        reasons: ['same website domain'],
      }),
    ]);
  });

  it('returns high confidence for the same normalized name plus phone or email', async () => {
    await createCompany({
      name: 'Amman Bank',
      normalizedName: 'amman bank',
      phone: '+96261234567',
    });
    await createCompany({
      name: 'Aqaba Logistics',
      normalizedName: 'aqaba logistics',
      generalEmail: 'hello@aqaba-logistics.com',
    });

    const phoneMatches = await findCompanyDuplicates({
      input: { name: 'Amman Bank', phone: '+962 6 123 4567' },
    });
    const emailMatches = await findCompanyDuplicates({
      input: { name: 'Aqaba Logistics', email: 'HELLO@AQABA-LOGISTICS.COM' },
    });

    expect(phoneMatches[0]).toMatchObject({
      name: 'Amman Bank',
      confidence: COMPANY_DUPLICATE_CONFIDENCE.HIGH,
      reasons: ['same normalized name', 'same phone'],
    });
    expect(emailMatches[0]).toMatchObject({
      name: 'Aqaba Logistics',
      confidence: COMPANY_DUPLICATE_CONFIDENCE.HIGH,
      reasons: ['same normalized name', 'same email'],
    });
  });

  it('returns medium confidence for the same normalized name and city', async () => {
    await createCompany({
      name: 'Levant Logistics',
      normalizedName: 'levant logistics',
      city: 'Amman',
    });

    const matches = await findCompanyDuplicates({
      input: { name: 'Levant Logistics', city: ' amman ' },
    });

    expect(matches[0]).toMatchObject({
      name: 'Levant Logistics',
      confidence: COMPANY_DUPLICATE_CONFIDENCE.MEDIUM,
      reasons: ['same normalized name', 'same city'],
    });
  });

  it('returns medium confidence for the same email domain with a similar name', async () => {
    await createCompany({
      name: 'Jordan Digital Solutions',
      normalizedName: 'jordan digital solutions',
      generalEmail: 'hello@jds.com',
    });

    const matches = await findCompanyDuplicates({
      input: { name: 'Jordan Digital Solution', email: 'sales@jds.com' },
    });

    expect(matches[0]).toMatchObject({
      name: 'Jordan Digital Solutions',
      confidence: COMPANY_DUPLICATE_CONFIDENCE.MEDIUM,
      reasons: ['same email domain', 'similar normalized name'],
    });
  });

  it('returns low confidence for a similar normalized name only', async () => {
    await createCompany({
      name: 'Petra Marketing Group',
      normalizedName: 'petra marketing group',
    });

    const matches = await findCompanyDuplicates({
      input: { name: 'Petra Marketing' },
    });

    expect(matches[0]).toMatchObject({
      name: 'Petra Marketing Group',
      confidence: COMPANY_DUPLICATE_CONFIDENCE.LOW,
      reasons: ['similar normalized name'],
    });
  });

  it('returns low confidence for typo-only normalized name similarity', async () => {
    await createCompany({
      name: 'Microsoft',
      normalizedName: 'microsoft',
    });

    const matches = await findCompanyDuplicates({
      input: { name: 'Microsft' },
    });

    expect(matches[0]).toMatchObject({
      name: 'Microsoft',
      confidence: COMPANY_DUPLICATE_CONFIDENCE.LOW,
      reasons: ['similar normalized name'],
    });
  });

  it('ignores malformed stored company emails when checking email-domain similarity', async () => {
    await createCompany({
      name: 'Legacy Stored Email Co',
      normalizedName: 'legacy stored email co',
      generalEmail: 'not-email',
    });

    const matches = await findCompanyDuplicates({
      input: { name: 'Legacy Stored Email', email: 'sales@example.com' },
    });

    expect(matches[0]).toMatchObject({
      name: 'Legacy Stored Email Co',
      confidence: COMPANY_DUPLICATE_CONFIDENCE.LOW,
      reasons: ['similar normalized name'],
    });
  });

  it('excludes archived rows by default and includes them when requested', async () => {
    await createCompany({
      name: 'Archived Domain Co',
      normalizedName: 'archived domain co',
      websiteDomain: 'archived.example',
      archivedAt: new Date(),
    });

    await expect(
      findCompanyDuplicates({ input: { website: 'https://archived.example' } }),
    ).resolves.toEqual([]);

    await expect(
      findCompanyDuplicates({
        input: { website: 'https://archived.example' },
        includeArchived: true,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        name: 'Archived Domain Co',
        confidence: COMPANY_DUPLICATE_CONFIDENCE.HIGH,
      }),
    ]);
  });

  it('ignores the excluded company id', async () => {
    const company = await createCompany({
      name: 'Self Edit Co',
      normalizedName: 'self edit co',
      websiteDomain: 'self-edit.example',
    });

    const matches = await findCompanyDuplicates({
      input: { website: 'https://self-edit.example' },
      excludeCompanyId: company.id,
    });

    expect(matches).toEqual([]);
  });

  it('returns reasons and stable ordering by confidence then company name', async () => {
    await createCompany({
      name: 'Zulu Similar',
      normalizedName: 'jordan telecom services',
    });
    await createCompany({
      name: 'Alpha Domain',
      normalizedName: 'different name',
      websiteDomain: 'ordered.example',
    });
    await createCompany({
      name: 'Beta City',
      normalizedName: 'jordan telecom',
      city: 'Amman',
    });

    const matches = await findCompanyDuplicates({
      input: {
        name: 'Jordan Telecom',
        website: 'https://ordered.example',
        city: 'Amman',
      },
    });

    expect(matches.map((match) => match.name)).toEqual([
      'Alpha Domain',
      'Beta City',
      'Zulu Similar',
    ]);
    expect(matches.map((match) => match.confidence)).toEqual([
      COMPANY_DUPLICATE_CONFIDENCE.HIGH,
      COMPANY_DUPLICATE_CONFIDENCE.MEDIUM,
      COMPANY_DUPLICATE_CONFIDENCE.LOW,
    ]);
    expect(matches.every((match) => match.reasons.length > 0)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  normalizeCompanyEmail,
  normalizeCompanyIdentity,
  normalizeCompanyName,
  normalizeCompanyPhone,
  normalizeWebsiteDomain,
} from '../src/services/companyNormalization.js';

function expectValidationError(fn) {
  expect(fn).toThrow(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
}

describe('company normalization', () => {
  it('normalizes company names conservatively without deleting legal suffix words', () => {
    expect(normalizeCompanyName('  Jordan   Telecom Co.  ')).toBe('jordan telecom co');
    expect(normalizeCompanyName('ACME - Jordan, LLC!')).toBe('acme jordan llc');
    expect(normalizeCompanyName('Bank & Group')).toBe('bank group');
  });

  it('returns an empty normalized name for empty input', () => {
    expect(normalizeCompanyName(null)).toBe('');
    expect(normalizeCompanyName('   ')).toBe('');
  });

  it('normalizes full website URLs to a matching domain', () => {
    expect(normalizeWebsiteDomain(' HTTPS://WWW.Example.COM/sponsors?q=1#team ')).toBe(
      'example.com',
    );
    expect(normalizeWebsiteDomain('www.Sub.Example.co.JO/partners/')).toBe('sub.example.co.jo');
    expect(normalizeWebsiteDomain('example.com.')).toBe('example.com');
  });

  it('returns null for empty website input and rejects malformed domains', () => {
    expect(normalizeWebsiteDomain(null)).toBeNull();
    expect(normalizeWebsiteDomain('   ')).toBeNull();
    expectValidationError(() => normalizeWebsiteDomain('not a domain'));
    expectValidationError(() => normalizeWebsiteDomain('https://exa mple.com'));
  });

  it('normalizes company email using the existing lowercase email style', () => {
    expect(normalizeCompanyEmail(' INFO@Example.COM ')).toBe('info@example.com');
    expect(normalizeCompanyEmail(null)).toBeNull();
    expectValidationError(() => normalizeCompanyEmail('not-email'));
  });

  it('normalizes phone numbers while preserving one optional leading plus sign', () => {
    expect(normalizeCompanyPhone(' +962 (79) 123-4567 ')).toBe('+962791234567');
    expect(normalizeCompanyPhone('079 123 4567')).toBe('0791234567');
    expect(normalizeCompanyPhone(null)).toBeNull();
    expectValidationError(() => normalizeCompanyPhone('++962791234567'));
    expectValidationError(() => normalizeCompanyPhone('079-ABC-1234'));
  });

  it('builds normalized company identity fields for later create and update services', () => {
    expect(
      normalizeCompanyIdentity({
        name: '  Jordan   Telecom Co.  ',
        website: 'https://www.Jordan-Telecom.com/about',
        generalEmail: ' INFO@Jordan-Telecom.COM ',
        phone: ' +962 (79) 123-4567 ',
        city: ' Amman ',
      }),
    ).toEqual({
      name: 'Jordan Telecom Co.',
      normalizedName: 'jordan telecom co',
      website: 'https://www.Jordan-Telecom.com/about',
      websiteDomain: 'jordan-telecom.com',
      generalEmail: 'info@jordan-telecom.com',
      phone: '+962791234567',
      city: 'Amman',
    });
  });
});

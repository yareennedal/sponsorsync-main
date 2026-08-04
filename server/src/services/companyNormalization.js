import { AppError } from '../utils/AppError.js';
import { normalizeEmail } from '../utils/normalizeEmail.js';

function validationError(message) {
  return new AppError(message, { code: 'VALIDATION_ERROR', status: 400 });
}

function collapseWhitespace(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function emptyToNull(value) {
  return value === '' ? null : value;
}

export function normalizeCompanyName(value) {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidDomain(hostname) {
  if (!hostname || hostname.length > 253 || !hostname.includes('.')) return false;
  return hostname.split('.').every((label) => {
    if (!label || label.length > 63) return false;
    return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label);
  });
}

export function normalizeWebsiteDomain(value) {
  const raw = collapseWhitespace(value);
  if (!raw) return null;

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw validationError('قيمة الموقع الإلكتروني غير صالحة.');
  }

  let hostname = parsed.hostname.toLowerCase();
  if (hostname.endsWith('.')) hostname = hostname.slice(0, -1);
  hostname = hostname.replace(/^www\./, '');

  if (!isValidDomain(hostname)) {
    throw validationError('قيمة الموقع الإلكتروني غير صالحة.');
  }

  return hostname;
}

export function normalizeCompanyEmail(value) {
  const normalized = normalizeEmail(value);
  if (!normalized) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw validationError('البريد الإلكتروني للشركة غير صالح.');
  }
  return normalized;
}

export function normalizeCompanyPhone(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const normalized = raw.replace(/[\s().-]/g, '');
  const plusCount = (normalized.match(/\+/g) ?? []).length;
  if (plusCount > 1 || (plusCount === 1 && !normalized.startsWith('+'))) {
    throw validationError('رقم هاتف الشركة غير صالح.');
  }
  if (!/^\+?\d+$/.test(normalized)) {
    throw validationError('رقم هاتف الشركة غير صالح.');
  }

  return normalized;
}

export function normalizeCompanyIdentity(payload = {}) {
  const name = collapseWhitespace(payload.name);
  const website = emptyToNull(String(payload.website ?? '').trim());
  const city = emptyToNull(collapseWhitespace(payload.city));

  return {
    name,
    normalizedName: normalizeCompanyName(name),
    website,
    websiteDomain: normalizeWebsiteDomain(website),
    generalEmail: normalizeCompanyEmail(payload.generalEmail ?? payload.email),
    phone: normalizeCompanyPhone(payload.phone),
    city,
  };
}

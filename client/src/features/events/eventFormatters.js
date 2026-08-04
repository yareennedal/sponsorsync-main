import { EMPTY_EVENT_FORM, EMPTY_PACKAGE_FORM } from './eventConstants';

const dateOnlyFormatter = new Intl.DateTimeFormat('ar-u-nu-latn', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

const moneyFormatter = new Intl.NumberFormat('ar-u-nu-latn', {
  style: 'currency',
  currency: 'JOD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatDateOnly(value, fallback = 'لا يوجد') {
  if (!value) return fallback;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : dateOnlyFormatter.format(date);
}

export function formatMoney(value) {
  const amount = Number(value ?? 0);
  return moneyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function parseTextList(value) {
  return String(value ?? '')
    .split(/[\n,،]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function listToText(value) {
  return Array.isArray(value) ? value.join('، ') : '';
}

export function eventToForm(event) {
  if (!event) return EMPTY_EVENT_FORM;
  return {
    ...EMPTY_EVENT_FORM,
    name: event.name ?? '',
    description: event.description ?? '',
    category: event.category ?? EMPTY_EVENT_FORM.category,
    eventDate: event.eventDate ?? '',
    location: event.location ?? '',
    financialTarget: event.financialTarget ?? '0.00',
    sponsorshipDeadline: event.sponsorshipDeadline ?? '',
    targetSectorsText: listToText(event.targetSectors),
    targetCitiesText: listToText(event.targetCities),
    status: event.status ?? EMPTY_EVENT_FORM.status,
    leaderId: event.leaderId ?? '',
  };
}

export function buildEventPayload(form, { includeStatus = false, includeLeader = false } = {}) {
  return {
    name: form.name,
    description: form.description.trim() || null,
    category: form.category,
    eventDate: form.eventDate,
    location: form.location.trim() || null,
    financialTarget: form.financialTarget,
    sponsorshipDeadline: form.sponsorshipDeadline || null,
    targetSectors: parseTextList(form.targetSectorsText),
    targetCities: parseTextList(form.targetCitiesText),
    ...(includeStatus ? { status: form.status } : {}),
    ...(includeLeader && form.leaderId ? { leaderId: form.leaderId } : {}),
  };
}

export function packageToForm(pkg) {
  if (!pkg) return EMPTY_PACKAGE_FORM;
  return {
    name: pkg.name ?? '',
    amount: pkg.amount ?? '0.00',
    benefits: pkg.benefits ?? '',
    displayOrder: pkg.displayOrder ?? 0,
  };
}

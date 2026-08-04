export const EVENT_STATUSES = Object.freeze([
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
]);

export const DEFAULT_EVENT_STATUS = 'DRAFT';

export const CONTACT_METHODS = Object.freeze(['EMAIL', 'PHONE', 'WHATSAPP', 'MEETING', 'OTHER']);

export const DEFAULT_CONTACT_METHOD = 'EMAIL';

export const COMPANY_DUPLICATE_CONFIDENCE = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
});

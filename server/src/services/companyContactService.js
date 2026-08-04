import { Op } from 'sequelize';
import { sequelize } from '../db/index.js';
import { Company, CompanyContact } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { createAuditLog } from '../utils/audit.js';
import { normalizeCompanyEmail, normalizeCompanyPhone } from './companyNormalization.js';

function forbidden() {
  return new AppError('ليست لديك صلاحية لتنفيذ هذا الإجراء.', {
    code: 'AUTH_FORBIDDEN',
    status: 403,
  });
}

function validationError(message) {
  return new AppError(message, { code: 'VALIDATION_ERROR', status: 400 });
}

function emptyToNull(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

function requireCompanyWrite(user) {
  if (!['ADMIN', 'LEADER'].includes(user.role)) throw forbidden();
}

async function findCompanyOrThrow(companyId, { transaction } = {}) {
  const company = await Company.findByPk(companyId, { transaction });
  if (!company) {
    throw new AppError('الشركة غير موجودة.', { code: 'COMPANY_NOT_FOUND', status: 404 });
  }
  return company;
}

async function findActiveContactOrThrow({ companyId, contactId, transaction }) {
  const contact = await CompanyContact.findOne({
    where: { id: contactId, companyId, archivedAt: null },
    transaction,
  });
  if (!contact) {
    throw new AppError('جهة التواصل غير موجودة.', {
      code: 'COMPANY_CONTACT_NOT_FOUND',
      status: 404,
    });
  }
  return contact;
}

export function serializeContact(contact) {
  if (!contact) return null;
  return {
    id: contact.id,
    companyId: contact.companyId,
    fullName: contact.fullName,
    position: contact.position,
    email: contact.email,
    phone: contact.phone,
    preferredContactMethod: contact.preferredContactMethod,
    notes: contact.notes,
    isPrimary: contact.isPrimary,
    archivedAt: contact.archivedAt,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

function buildContactValues(payload, existing = {}) {
  const values = {
    fullName: 'fullName' in payload ? String(payload.fullName ?? '').trim() : existing.fullName,
    position: 'position' in payload ? emptyToNull(payload.position) : existing.position,
    email: 'email' in payload ? normalizeCompanyEmail(payload.email) : existing.email,
    phone: 'phone' in payload ? normalizeCompanyPhone(payload.phone) : existing.phone,
    preferredContactMethod:
      'preferredContactMethod' in payload
        ? payload.preferredContactMethod
        : existing.preferredContactMethod,
    notes: 'notes' in payload ? emptyToNull(payload.notes) : existing.notes,
    isPrimary: 'isPrimary' in payload ? Boolean(payload.isPrimary) : Boolean(existing.isPrimary),
  };

  if (!values.email && !values.phone) {
    throw validationError('يجب إدخال بريد إلكتروني أو رقم هاتف للتواصل.');
  }
  return values;
}

async function clearOtherPrimaryContacts({ companyId, contactId = null, transaction }) {
  await CompanyContact.update(
    { isPrimary: false },
    {
      where: {
        companyId,
        archivedAt: null,
        isPrimary: true,
        ...(contactId ? { id: { [Op.ne]: contactId } } : {}),
      },
      transaction,
    },
  );
}

export async function createCompanyContactRecord({
  companyId,
  payload,
  user,
  requestId,
  transaction,
}) {
  const values = buildContactValues(payload);
  if (values.isPrimary) {
    await clearOtherPrimaryContacts({ companyId, transaction });
  }

  const contact = await CompanyContact.create(
    {
      companyId,
      ...values,
      createdBy: user.id,
    },
    { transaction },
  );
  await createAuditLog(
    {
      actorUserId: user.id,
      action: 'COMPANY_CONTACT_CREATED',
      entityType: 'company_contact',
      entityId: contact.id,
      afterValues: {
        companyId,
        fullName: contact.fullName,
        email: contact.email,
        phone: contact.phone,
        isPrimary: contact.isPrimary,
      },
      metadata: { requestId },
    },
    { transaction },
  );
  return contact;
}

export async function listCompanyContacts({ companyId }) {
  await findCompanyOrThrow(companyId);
  const contacts = await CompanyContact.findAll({
    where: { companyId, archivedAt: null },
    order: [
      ['isPrimary', 'DESC'],
      ['fullName', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });
  return contacts.map(serializeContact);
}

export async function createCompanyContact({ companyId, payload, user, requestId }) {
  requireCompanyWrite(user);
  return sequelize.transaction(async (transaction) => {
    await findCompanyOrThrow(companyId, { transaction });
    const contact = await createCompanyContactRecord({
      companyId,
      payload,
      user,
      requestId,
      transaction,
    });
    return serializeContact(contact);
  });
}

export async function updateCompanyContact({ companyId, contactId, patch, user, requestId }) {
  requireCompanyWrite(user);
  return sequelize.transaction(async (transaction) => {
    await findCompanyOrThrow(companyId, { transaction });
    const contact = await findActiveContactOrThrow({ companyId, contactId, transaction });
    const beforeValues = serializeContact(contact);
    const values = buildContactValues(patch, contact);

    if (values.isPrimary) {
      await clearOtherPrimaryContacts({ companyId, contactId, transaction });
    }

    await contact.update(values, { transaction });
    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'COMPANY_CONTACT_UPDATED',
        entityType: 'company_contact',
        entityId: contact.id,
        beforeValues,
        afterValues: patch,
        metadata: { requestId },
      },
      { transaction },
    );
    return serializeContact(contact);
  });
}

export async function archiveCompanyContact({ companyId, contactId, archived, user, requestId }) {
  requireCompanyWrite(user);
  return sequelize.transaction(async (transaction) => {
    await findCompanyOrThrow(companyId, { transaction });
    const contact = archived
      ? await findActiveContactOrThrow({ companyId, contactId, transaction })
      : await CompanyContact.findOne({ where: { id: contactId, companyId }, transaction });

    if (!contact) {
      throw new AppError('جهة التواصل غير موجودة.', {
        code: 'COMPANY_CONTACT_NOT_FOUND',
        status: 404,
      });
    }

    const beforeValues = { archivedAt: contact.archivedAt, isPrimary: contact.isPrimary };
    await contact.update(
      archived
        ? { archivedAt: contact.archivedAt ?? new Date(), isPrimary: false }
        : { archivedAt: null },
      { transaction },
    );
    await createAuditLog(
      {
        actorUserId: user.id,
        action: archived ? 'COMPANY_CONTACT_ARCHIVED' : 'COMPANY_CONTACT_RESTORED',
        entityType: 'company_contact',
        entityId: contact.id,
        beforeValues,
        afterValues: { archivedAt: contact.archivedAt, isPrimary: contact.isPrimary },
        metadata: { requestId },
      },
      { transaction },
    );
    return serializeContact(contact);
  });
}

export async function makeCompanyContactPrimary({ companyId, contactId, user, requestId }) {
  requireCompanyWrite(user);
  return sequelize.transaction(async (transaction) => {
    await findCompanyOrThrow(companyId, { transaction });
    const contact = await findActiveContactOrThrow({ companyId, contactId, transaction });
    const beforeValues = { isPrimary: contact.isPrimary };

    await clearOtherPrimaryContacts({ companyId, contactId, transaction });
    if (!contact.isPrimary) {
      await contact.update({ isPrimary: true }, { transaction });
    }

    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'COMPANY_CONTACT_PRIMARY_CHANGED',
        entityType: 'company_contact',
        entityId: contact.id,
        beforeValues,
        afterValues: { isPrimary: true },
        metadata: { requestId },
      },
      { transaction },
    );
    return serializeContact(contact);
  });
}

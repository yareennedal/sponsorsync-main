import { Op } from 'sequelize';
import { COMPANY_DUPLICATE_CONFIDENCE } from '../constants/plan2Constants.js';
import { sequelize } from '../db/index.js';
import { Company, CompanyContact } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { createAuditLog } from '../utils/audit.js';
import { findCompanyDuplicates } from './companyDuplicateService.js';
import { normalizeCompanyIdentity } from './companyNormalization.js';
import { createCompanyContactRecord, serializeContact } from './companyContactService.js';

const IDENTITY_FIELDS = new Set(['name', 'website', 'generalEmail', 'phone', 'city']);

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

function companyPermissions(user) {
  const canWrite = ['ADMIN', 'LEADER'].includes(user.role);
  return {
    canRead: true,
    canEdit: canWrite,
    canArchive: canWrite,
    canRestore: user.role === 'ADMIN',
    canManageContacts: canWrite,
  };
}

function requireCompanyWrite(user) {
  if (!companyPermissions(user).canEdit) throw forbidden();
}

function requireCompanyRestore(user) {
  if (user.role !== 'ADMIN') throw forbidden();
}

function serializeCompany(company, { contacts = undefined, permissions = undefined } = {}) {
  const activeContacts =
    contacts ??
    company.contacts?.filter((contact) => !contact.archivedAt).map(serializeContact) ??
    undefined;
  const primaryContact =
    activeContacts?.find((contact) => contact.isPrimary) ??
    serializeContact(company.primaryContacts?.[0]) ??
    null;

  return {
    id: company.id,
    name: company.name,
    normalizedName: company.normalizedName,
    sector: company.sector,
    city: company.city,
    website: company.website,
    websiteDomain: company.websiteDomain,
    generalEmail: company.generalEmail,
    phone: company.phone,
    address: company.address,
    notes: company.notes,
    primaryContact,
    contacts: activeContacts,
    permissions,
    sponsorshipHistory: { status: 'UNAVAILABLE', items: [] },
    archivedAt: company.archivedAt,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

function buildCompanyValues(payload, existing = {}) {
  const identity = normalizeCompanyIdentity({
    name: 'name' in payload ? payload.name : existing.name,
    website: 'website' in payload ? payload.website : existing.website,
    generalEmail: 'generalEmail' in payload ? payload.generalEmail : existing.generalEmail,
    phone: 'phone' in payload ? payload.phone : existing.phone,
    city: 'city' in payload ? payload.city : existing.city,
  });

  if (!identity.normalizedName) {
    throw validationError('اسم الشركة غير صالح.');
  }

  return {
    ...identity,
    sector: 'sector' in payload ? String(payload.sector ?? '').trim() : existing.sector,
    address: 'address' in payload ? emptyToNull(payload.address) : existing.address,
    notes: 'notes' in payload ? emptyToNull(payload.notes) : existing.notes,
  };
}

function identityChanged(patch) {
  return Object.keys(patch).some((key) => IDENTITY_FIELDS.has(key));
}

function highConfidenceMatches(matches) {
  return matches.filter((match) => match.confidence === COMPANY_DUPLICATE_CONFIDENCE.HIGH);
}

async function assertHighConfidenceOverride({
  input,
  excludeCompanyId = null,
  overrideReason,
  includeArchived = false,
}) {
  const matches = await findCompanyDuplicates({
    input,
    excludeCompanyId,
    includeArchived,
  });
  const highMatches = highConfidenceMatches(matches);
  if (highMatches.length > 0 && !String(overrideReason ?? '').trim()) {
    throw new AppError('توجد شركة مشابهة بدرجة عالية. يلزم توضيح سبب التجاوز.', {
      code: 'COMPANY_DUPLICATE_HIGH_CONFIDENCE',
      status: 409,
      details: { matches: highMatches },
    });
  }
  return { matches, highMatches };
}

async function findCompanyOrThrow(companyId, { transaction } = {}) {
  const company = await Company.findByPk(companyId, { transaction });
  if (!company) {
    throw new AppError('الشركة غير موجودة.', { code: 'COMPANY_NOT_FOUND', status: 404 });
  }
  return company;
}

export async function listCompanyDuplicates({ query }) {
  const matches = await findCompanyDuplicates({
    input: query,
    excludeCompanyId: query.excludeCompanyId,
  });
  return matches.slice(0, 10);
}

export async function listCompanies({ query, user }) {
  if (query.archived && user.role !== 'ADMIN') throw forbidden();

  const where = query.archived ? { archivedAt: { [Op.ne]: null } } : { archivedAt: null };
  if (query.sector) where.sector = query.sector;
  if (query.city) where.city = { [Op.iLike]: query.city };
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${query.search}%` } },
      { websiteDomain: { [Op.iLike]: `%${query.search}%` } },
      { generalEmail: { [Op.iLike]: `%${query.search}%` } },
      { phone: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await Company.findAndCountAll({
    where,
    include: [
      {
        model: CompanyContact,
        as: 'contacts',
        where: { archivedAt: null, isPrimary: true },
        required: false,
      },
    ],
    distinct: true,
    offset: (query.page - 1) * query.pageSize,
    limit: query.pageSize,
    order: [
      ['name', 'ASC'],
      ['createdAt', 'DESC'],
    ],
  });

  return {
    data: rows.map((company) => serializeCompany(company)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total: count,
      totalPages: Math.ceil(count / query.pageSize) || 1,
    },
  };
}

export async function getCompanyDetails({ companyId, user, transaction }) {
  const company = await Company.findByPk(companyId, {
    include: [
      {
        model: CompanyContact,
        as: 'contacts',
        where: { archivedAt: null },
        required: false,
      },
    ],
    transaction,
  });
  if (!company) {
    throw new AppError('الشركة غير موجودة.', { code: 'COMPANY_NOT_FOUND', status: 404 });
  }

  const contacts = company.contacts.map(serializeContact).sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
    return left.fullName.localeCompare(right.fullName, 'en');
  });

  return serializeCompany(company, { contacts, permissions: companyPermissions(user) });
}

export async function createCompany({ payload, user, requestId }) {
  requireCompanyWrite(user);
  const values = buildCompanyValues(payload);
  const overrideReason = String(payload.overrideReason ?? '').trim();
  const { highMatches } = await assertHighConfidenceOverride({
    input: values,
    overrideReason,
  });

  return sequelize.transaction(async (transaction) => {
    const company = await Company.create(
      {
        ...values,
        createdBy: user.id,
      },
      { transaction },
    );

    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'COMPANY_CREATED',
        entityType: 'company',
        entityId: company.id,
        afterValues: {
          name: company.name,
          sector: company.sector,
          websiteDomain: company.websiteDomain,
        },
        metadata: { requestId },
      },
      { transaction },
    );

    if (overrideReason) {
      await createAuditLog(
        {
          actorUserId: user.id,
          action: 'COMPANY_DUPLICATE_OVERRIDE',
          entityType: 'company',
          entityId: company.id,
          afterValues: { reason: overrideReason, matches: highMatches },
          metadata: { requestId },
        },
        { transaction },
      );
    }

    if (payload.contact) {
      await createCompanyContactRecord({
        companyId: company.id,
        payload: payload.contact,
        user,
        requestId,
        transaction,
      });
    }

    return getCompanyDetails({ companyId: company.id, user, transaction });
  });
}

export async function updateCompany({ companyId, patch, user, requestId }) {
  requireCompanyWrite(user);
  const current = await findCompanyOrThrow(companyId);
  const values = buildCompanyValues(patch, current);
  const overrideReason = String(patch.overrideReason ?? '').trim();
  let highMatches = [];

  if (identityChanged(patch)) {
    ({ highMatches } = await assertHighConfidenceOverride({
      input: values,
      excludeCompanyId: companyId,
      overrideReason,
    }));
  }

  const beforeValues = {
    name: current.name,
    normalizedName: current.normalizedName,
    sector: current.sector,
    city: current.city,
    website: current.website,
    websiteDomain: current.websiteDomain,
    generalEmail: current.generalEmail,
    phone: current.phone,
    address: current.address,
    notes: current.notes,
  };

  return sequelize.transaction(async (transaction) => {
    await current.update(values, { transaction });
    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'COMPANY_UPDATED',
        entityType: 'company',
        entityId: current.id,
        beforeValues,
        afterValues: values,
        metadata: { requestId },
      },
      { transaction },
    );

    if (overrideReason && highMatches.length > 0) {
      await createAuditLog(
        {
          actorUserId: user.id,
          action: 'COMPANY_DUPLICATE_OVERRIDE',
          entityType: 'company',
          entityId: current.id,
          afterValues: { reason: overrideReason, matches: highMatches },
          metadata: { requestId },
        },
        { transaction },
      );
    }

    return getCompanyDetails({ companyId: current.id, user, transaction });
  });
}

export async function archiveCompany({ companyId, archived, user, requestId }) {
  if (!archived) requireCompanyRestore(user);
  else requireCompanyWrite(user);

  return sequelize.transaction(async (transaction) => {
    const company = await findCompanyOrThrow(companyId, { transaction });
    const beforeValues = { archivedAt: company.archivedAt };
    await company.update(
      archived ? { archivedAt: company.archivedAt ?? new Date() } : { archivedAt: null },
      { transaction },
    );
    await createAuditLog(
      {
        actorUserId: user.id,
        action: archived ? 'COMPANY_ARCHIVED' : 'COMPANY_RESTORED',
        entityType: 'company',
        entityId: company.id,
        beforeValues,
        afterValues: { archivedAt: company.archivedAt },
        metadata: { requestId },
      },
      { transaction },
    );
    return getCompanyDetails({ companyId: company.id, user, transaction });
  });
}

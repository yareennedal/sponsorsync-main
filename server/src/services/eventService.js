import { Op } from 'sequelize';
import { sequelize } from '../db/index.js';
import { Event, EventMember, User } from '../models/index.js';
import { DEFAULT_EVENT_STATUS } from '../constants/plan2Constants.js';
import { AppError } from '../utils/AppError.js';
import { createAuditLog } from '../utils/audit.js';
import { buildEventListAccess, getAccessibleEvent } from './eventAccessService.js';

export const USER_SUMMARY_ATTRIBUTES = ['id', 'fullName', 'email', 'role'];

const CREATE_STATUSES = new Set(['DRAFT', 'ACTIVE']);
const STATUS_TRANSITIONS = {
  DRAFT: new Set(['ACTIVE', 'CANCELLED']),
  ACTIVE: new Set(['COMPLETED', 'CANCELLED', 'ARCHIVED']),
  COMPLETED: new Set(['ARCHIVED']),
  CANCELLED: new Set(['ARCHIVED']),
  ARCHIVED: new Set(['ACTIVE']),
};

export function userSummary(user) {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
}

export function serializeEvent(event, { permissions = undefined, members = undefined } = {}) {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    category: event.category,
    eventDate: event.eventDate,
    location: event.location,
    financialTarget: event.financialTarget,
    sponsorshipDeadline: event.sponsorshipDeadline,
    targetSectors: event.targetSectors,
    targetCities: event.targetCities,
    status: event.status,
    leaderId: event.leaderId,
    leader: userSummary(event.leader),
    members,
    permissions,
    archivedAt: event.archivedAt,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function validationError(message) {
  return new AppError(message, { code: 'VALIDATION_ERROR', status: 400 });
}

function validateDeadline({ eventDate, sponsorshipDeadline }) {
  if (sponsorshipDeadline && eventDate && sponsorshipDeadline > eventDate) {
    throw validationError('يجب أن يكون موعد الرعاية قبل تاريخ الفعالية أو في نفس اليوم.');
  }
}

async function findValidCreateLeader(leaderId) {
  const leader = await User.findByPk(leaderId);
  if (!leader || !leader.isActive || leader.role !== 'LEADER') {
    throw new AppError('قائد الفعالية المحدد غير صالح.', {
      code: 'EVENT_LEADER_INVALID',
      status: 400,
    });
  }
  return leader;
}

async function findValidTransferLeader(leaderId, { transaction } = {}) {
  const leader = await User.findByPk(leaderId, { transaction });
  if (!leader || !leader.isActive || !['LEADER', 'ADMIN'].includes(leader.role)) {
    throw new AppError('قائد الفعالية المحدد غير صالح.', {
      code: 'EVENT_LEADER_INVALID',
      status: 400,
    });
  }
  return leader;
}

export async function listEvents({ query, user }) {
  if (query.archived && user.role !== 'ADMIN') {
    throw new AppError('ليست لديك صلاحية لتنفيذ هذا الإجراء.', {
      code: 'AUTH_FORBIDDEN',
      status: 403,
    });
  }

  const access = buildEventListAccess({ user, includeArchived: query.archived });
  const where = { ...access.where };

  if (query.status) where.status = query.status;
  if (query.fromDate || query.toDate) {
    where.eventDate = {
      ...(query.fromDate ? { [Op.gte]: query.fromDate } : {}),
      ...(query.toDate ? { [Op.lte]: query.toDate } : {}),
    };
  }
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${query.search}%` } },
      { category: { [Op.iLike]: `%${query.search}%` } },
      { location: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await Event.findAndCountAll({
    where,
    include: [
      ...access.include,
      { model: User, as: 'leader', attributes: USER_SUMMARY_ATTRIBUTES },
    ],
    distinct: true,
    offset: (query.page - 1) * query.pageSize,
    limit: query.pageSize,
    order: [
      ['eventDate', 'ASC'],
      ['createdAt', 'DESC'],
      ['name', 'ASC'],
    ],
  });

  return {
    data: rows.map((event) => serializeEvent(event)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total: count,
      totalPages: Math.ceil(count / query.pageSize) || 1,
    },
  };
}

export async function createEvent({ payload, user, requestId }) {
  const status = payload.status ?? DEFAULT_EVENT_STATUS;
  if (!CREATE_STATUSES.has(status)) {
    throw validationError('يمكن إنشاء الفعالية بحالة مسودة أو نشطة فقط.');
  }
  validateDeadline(payload);

  let leaderId;
  if (user.role === 'LEADER') {
    if (payload.leaderId && payload.leaderId !== user.id) {
      throw new AppError('ليست لديك صلاحية لتنفيذ هذا الإجراء.', {
        code: 'AUTH_FORBIDDEN',
        status: 403,
      });
    }
    leaderId = user.id;
  } else {
    if (!payload.leaderId) {
      throw new AppError('قائد الفعالية المحدد غير صالح.', {
        code: 'EVENT_LEADER_INVALID',
        status: 400,
      });
    }
    leaderId = payload.leaderId;
  }
  await findValidCreateLeader(leaderId);

  return sequelize.transaction(async (transaction) => {
    const event = await Event.create(
      {
        name: payload.name,
        description: payload.description ?? null,
        category: payload.category,
        eventDate: payload.eventDate,
        location: payload.location ?? null,
        financialTarget: payload.financialTarget,
        sponsorshipDeadline: payload.sponsorshipDeadline ?? null,
        targetSectors: payload.targetSectors ?? [],
        targetCities: payload.targetCities ?? [],
        status,
        leaderId,
        createdBy: user.id,
      },
      { transaction },
    );
    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'EVENT_CREATED',
        entityType: 'event',
        entityId: event.id,
        afterValues: { name: event.name, status: event.status, leaderId: event.leaderId },
        metadata: { requestId },
      },
      { transaction },
    );
    return getEventDetails({ eventId: event.id, user, transaction });
  });
}

export async function getEventDetails({ eventId, user, transaction }) {
  const { permissions } = await getAccessibleEvent({ eventId, user, transaction });
  const event = await Event.findByPk(eventId, {
    include: [
      { model: User, as: 'leader', attributes: USER_SUMMARY_ATTRIBUTES },
      {
        model: EventMember,
        as: 'memberships',
        where: { isActive: true },
        required: false,
        include: [{ model: User, as: 'user', attributes: USER_SUMMARY_ATTRIBUTES }],
      },
    ],
    transaction,
  });

  return serializeEvent(event, {
    permissions,
    members: event.memberships.map((membership) => userSummary(membership.user)),
  });
}

export async function updateEvent({ eventId, patch, user, requestId }) {
  const { event } = await getAccessibleEvent({ eventId, user, access: 'manage' });
  validateDeadline({
    eventDate: patch.eventDate ?? event.eventDate,
    sponsorshipDeadline:
      patch.sponsorshipDeadline === undefined
        ? event.sponsorshipDeadline
        : patch.sponsorshipDeadline,
  });

  const beforeValues = {
    name: event.name,
    category: event.category,
    eventDate: event.eventDate,
    financialTarget: event.financialTarget,
    sponsorshipDeadline: event.sponsorshipDeadline,
    location: event.location,
    targetSectors: event.targetSectors,
    targetCities: event.targetCities,
  };

  return sequelize.transaction(async (transaction) => {
    await event.update(patch, { transaction });
    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'EVENT_UPDATED',
        entityType: 'event',
        entityId: event.id,
        beforeValues,
        afterValues: patch,
        metadata: { requestId },
      },
      { transaction },
    );
    return getEventDetails({ eventId: event.id, user, transaction });
  });
}

export async function updateEventStatus({ eventId, status, user, requestId }) {
  const { event } = await getAccessibleEvent({ eventId, user, access: 'manage' });

  if (event.status === 'ARCHIVED' && status === 'ACTIVE' && user.role !== 'ADMIN') {
    throw new AppError('ليست لديك صلاحية لتنفيذ هذا الإجراء.', {
      code: 'AUTH_FORBIDDEN',
      status: 403,
    });
  }

  if (!STATUS_TRANSITIONS[event.status]?.has(status)) {
    throw new AppError('انتقال حالة الفعالية غير مسموح.', {
      code: 'EVENT_STATUS_TRANSITION_INVALID',
      status: 422,
    });
  }

  const beforeValues = { status: event.status, archivedAt: event.archivedAt };
  const archivedAt = status === 'ARCHIVED' ? new Date() : null;

  return sequelize.transaction(async (transaction) => {
    await event.update({ status, archivedAt }, { transaction });
    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'EVENT_STATUS_CHANGED',
        entityType: 'event',
        entityId: event.id,
        beforeValues,
        afterValues: { status, archivedAt },
        metadata: { requestId },
      },
      { transaction },
    );
    return getEventDetails({ eventId: event.id, user, transaction });
  });
}

export async function transferEventLeader({ eventId, leaderId, reason, user, requestId }) {
  if (user.role !== 'ADMIN') {
    throw new AppError('ليست لديك صلاحية لتنفيذ هذا الإجراء.', {
      code: 'AUTH_FORBIDDEN',
      status: 403,
    });
  }

  return sequelize.transaction(async (transaction) => {
    const { event } = await getAccessibleEvent({ eventId, user, transaction });
    await findValidTransferLeader(leaderId, { transaction });

    const beforeValues = { leaderId: event.leaderId };
    await event.update({ leaderId }, { transaction });

    const duplicateMembership = await EventMember.findOne({
      where: { eventId, userId: leaderId },
      transaction,
    });
    if (duplicateMembership) {
      await duplicateMembership.update({ isActive: false, removedAt: new Date() }, { transaction });
    }

    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'EVENT_LEADER_TRANSFERRED',
        entityType: 'event',
        entityId: event.id,
        beforeValues,
        afterValues: { leaderId, reason },
        metadata: { requestId },
      },
      { transaction },
    );
    return getEventDetails({ eventId: event.id, user, transaction });
  });
}

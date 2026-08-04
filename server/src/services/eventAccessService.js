import { Op } from 'sequelize';
import { Event, EventMember } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

const READ_ONLY_EVENT_ROLES = new Set(['MEMBER', 'SUPERVISOR']);

function isArchived(event) {
  return event.status === 'ARCHIVED' || Boolean(event.archivedAt);
}

export function buildEventListAccess({ user, includeArchived = false }) {
  const where = {};
  const include = [];

  if (!includeArchived) {
    where.archivedAt = null;
    where.status = { [Op.ne]: 'ARCHIVED' };
  }

  if (user.role === 'ADMIN') {
    return { where, include };
  }

  if (user.role === 'LEADER') {
    return { where: { ...where, leaderId: user.id }, include };
  }

  if (READ_ONLY_EVENT_ROLES.has(user.role)) {
    include.push({
      model: EventMember,
      as: 'memberships',
      attributes: [],
      where: { userId: user.id, isActive: true },
      required: true,
    });
  }

  return { where, include };
}

export function getEventPermissions({ user, event, membership = null }) {
  const admin = user.role === 'ADMIN';
  const leader = event.leaderId === user.id;
  const activeMembership = Boolean(membership?.isActive);
  const readableByMembership =
    READ_ONLY_EVENT_ROLES.has(user.role) && activeMembership && !isArchived(event);
  const canManage = admin || leader;
  const canRead = canManage || readableByMembership;

  return {
    canRead,
    canEdit: canManage,
    canManageMembers: canManage,
    canManagePackages: canManage,
    canTransferLeadership: admin,
    canChangeStatus: canManage,
  };
}

export async function getAccessibleEvent({ eventId, user, access = 'read', transaction } = {}) {
  const event = await Event.findByPk(eventId, { transaction });
  if (!event) {
    throw new AppError('الفعالية غير موجودة.', { code: 'EVENT_NOT_FOUND', status: 404 });
  }

  const membership = await EventMember.findOne({
    where: { eventId, userId: user.id, isActive: true },
    transaction,
  });
  const permissions = getEventPermissions({ user, event, membership });

  if (!permissions.canRead) {
    throw new AppError('الفعالية غير موجودة.', { code: 'EVENT_NOT_FOUND', status: 404 });
  }

  if (access === 'manage' && !permissions.canEdit) {
    throw new AppError('ليست لديك صلاحية لتنفيذ هذا الإجراء.', {
      code: 'AUTH_FORBIDDEN',
      status: 403,
    });
  }

  return { event, membership, permissions };
}

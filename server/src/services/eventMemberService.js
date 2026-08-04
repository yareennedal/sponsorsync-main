import { Op } from 'sequelize';
import { sequelize } from '../db/index.js';
import { EventMember, User } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { createAuditLog } from '../utils/audit.js';
import { getAccessibleEvent } from './eventAccessService.js';
import { USER_SUMMARY_ATTRIBUTES, userSummary } from './eventService.js';

const CANDIDATE_ROLES = ['MEMBER', 'SUPERVISOR'];

function serializeMembership(membership, user) {
  return {
    id: membership.id,
    eventId: membership.eventId,
    userId: membership.userId,
    isActive: membership.isActive,
    removedAt: membership.removedAt,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
    user: userSummary(user ?? membership.user),
  };
}

function serializeMemberCandidate(user, inactiveMembershipUserIds) {
  return {
    ...userSummary(user),
    membershipStatus: inactiveMembershipUserIds.has(user.id) ? 'INACTIVE' : 'NONE',
  };
}

export async function listEventMembers({ eventId, user }) {
  await getAccessibleEvent({ eventId, user });
  const memberships = await EventMember.findAll({
    where: { eventId, isActive: true },
    include: [{ model: User, as: 'user', attributes: USER_SUMMARY_ATTRIBUTES }],
    order: [[{ model: User, as: 'user' }, 'fullName', 'ASC']],
  });
  return memberships.map((membership) => serializeMembership(membership));
}

export async function listEventMemberCandidates({ eventId, query, user }) {
  const { event } = await getAccessibleEvent({ eventId, user, access: 'manage' });
  const activeMemberships = await EventMember.findAll({
    attributes: ['userId'],
    where: { eventId, isActive: true },
  });
  const excludedUserIds = [
    event.leaderId,
    ...activeMemberships.map((membership) => membership.userId),
  ];

  const where = {
    isActive: true,
    role: query.role ?? { [Op.in]: CANDIDATE_ROLES },
    id: { [Op.notIn]: excludedUserIds },
  };
  if (query.search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${query.search}%` } },
      { email: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    attributes: USER_SUMMARY_ATTRIBUTES,
    where,
    offset: (query.page - 1) * query.pageSize,
    limit: query.pageSize,
    order: [
      ['role', 'ASC'],
      ['fullName', 'ASC'],
      ['email', 'ASC'],
    ],
  });

  const inactiveMemberships = rows.length
    ? await EventMember.findAll({
        attributes: ['userId'],
        where: {
          eventId,
          userId: { [Op.in]: rows.map((candidate) => candidate.id) },
          isActive: false,
        },
      })
    : [];
  const inactiveMembershipUserIds = new Set(
    inactiveMemberships.map((membership) => membership.userId),
  );

  return {
    data: rows.map((candidate) => serializeMemberCandidate(candidate, inactiveMembershipUserIds)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total: count,
      totalPages: Math.ceil(count / query.pageSize) || 1,
    },
  };
}

export async function addEventMember({ eventId, memberUserId, user, requestId }) {
  return sequelize.transaction(async (transaction) => {
    const { event } = await getAccessibleEvent({ eventId, user, access: 'manage', transaction });
    const target = await User.findByPk(memberUserId, { transaction });
    if (!target) {
      throw new AppError('المستخدم غير موجود.', { code: 'USER_NOT_FOUND', status: 404 });
    }
    if (target.id === event.leaderId) {
      throw new AppError('قائد الفعالية لا يضاف كعضو في الفريق.', {
        code: 'EVENT_MEMBER_LEADER_CONFLICT',
        status: 409,
      });
    }
    if (!target.isActive || !['MEMBER', 'SUPERVISOR'].includes(target.role)) {
      throw new AppError('لا يمكن إضافة هذا المستخدم إلى فريق الفعالية.', {
        code: 'EVENT_MEMBER_USER_INVALID',
        status: 400,
      });
    }

    const existing = await EventMember.findOne({
      where: { eventId, userId: memberUserId },
      transaction,
    });
    if (existing?.isActive) {
      return { membership: serializeMembership(existing, target), created: false };
    }

    if (existing) {
      await existing.update({ isActive: true, removedAt: null }, { transaction });
      await createAuditLog(
        {
          actorUserId: user.id,
          action: 'EVENT_MEMBER_REACTIVATED',
          entityType: 'event',
          entityId: eventId,
          afterValues: { userId: memberUserId },
          metadata: { requestId },
        },
        { transaction },
      );
      return { membership: serializeMembership(existing, target), created: false };
    }

    const membership = await EventMember.create(
      { eventId, userId: memberUserId, addedBy: user.id },
      { transaction },
    );
    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'EVENT_MEMBER_ADDED',
        entityType: 'event',
        entityId: eventId,
        afterValues: { userId: memberUserId },
        metadata: { requestId },
      },
      { transaction },
    );
    return { membership: serializeMembership(membership, target), created: true };
  });
}

export async function removeEventMember({ eventId, memberUserId, user, requestId }) {
  return sequelize.transaction(async (transaction) => {
    await getAccessibleEvent({ eventId, user, access: 'manage', transaction });
    const membership = await EventMember.findOne({
      where: { eventId, userId: memberUserId, isActive: true },
      transaction,
    });
    if (!membership) {
      throw new AppError('عضوية الفعالية غير موجودة.', {
        code: 'EVENT_MEMBER_NOT_FOUND',
        status: 404,
      });
    }

    await membership.update({ isActive: false, removedAt: new Date() }, { transaction });
    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'EVENT_MEMBER_REMOVED',
        entityType: 'event',
        entityId: eventId,
        beforeValues: { userId: memberUserId, isActive: true },
        afterValues: { userId: memberUserId, isActive: false },
        metadata: { requestId },
      },
      { transaction },
    );
    return serializeMembership(membership);
  });
}

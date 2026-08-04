import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { sequelize } from '../db/index.js';
import { Event, User } from '../models/index.js';
import { normalizeEmail } from '../utils/normalizeEmail.js';
import { createAuditLog } from '../utils/audit.js';
import { AppError } from '../utils/AppError.js';

// The audit log's actor_user_id is a real FK. An actor whose row no longer exists
// (deleted account, stale token) must be recorded as null rather than 500 the request.
async function resolveActorId(actor) {
  if (!actor?.id) return null;
  const actorUser = await User.findByPk(actor.id, { attributes: ['id'] });
  return actorUser ? actor.id : null;
}

export async function listUsers({ page, pageSize, search, role, status }) {
  const where = {};
  if (role) where.role = role;
  if (status === 'active') where.isActive = true;
  if (status === 'disabled') where.isActive = false;
  if (search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [
      ['createdAt', 'DESC'],
      ['email', 'ASC'],
    ],
  });

  return {
    data: rows,
    meta: {
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize) || 1,
    },
  };
}

export async function createUser({ fullName, email, role, temporaryPassword, actor }) {
  const normalized = normalizeEmail(email);
  const existing = await User.findOne({ where: { email: normalized } });
  if (existing) {
    throw new AppError('هذا البريد الإلكتروني مستخدم بالفعل.', {
      code: 'USER_EMAIL_TAKEN',
      status: 409,
    });
  }

  const creatorId = await resolveActorId(actor);

  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  // The mutation and the audit row that describes it commit together or not at all.
  return sequelize.transaction(async (transaction) => {
    const user = await User.create(
      {
        fullName,
        email: normalized,
        passwordHash,
        role,
        isActive: true,
        mustChangePassword: true,
        createdBy: creatorId,
      },
      { transaction },
    );
    await createAuditLog(
      {
        actorUserId: creatorId,
        action: 'USER_CREATED',
        entityType: 'user',
        entityId: user.id,
        afterValues: { fullName, email: normalized, role },
        metadata: { requestId: actor?.requestId },
      },
      { transaction },
    );
    return user;
  });
}

export async function updateUser({ id, patch, actor }) {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('المستخدم غير موجود.', { code: 'USER_NOT_FOUND', status: 404 });

  const before = { fullName: user.fullName, email: user.email, role: user.role };

  // Mirror of the self-deactivation guard in updateUserStatus. Without it an admin could
  // demote themselves out of the admin panel with no in-product way back.
  if (patch.role !== undefined && patch.role !== user.role && id === actor?.id) {
    throw new AppError('لا يمكنك تغيير دور حسابك الخاص.', {
      code: 'USER_SELF_ROLE_CHANGE',
      status: 409,
    });
  }

  // Prevent removing the only active admin's admin role.
  if (
    patch.role !== undefined &&
    user.role === 'ADMIN' &&
    patch.role !== 'ADMIN' &&
    user.isActive
  ) {
    const activeAdmins = await User.count({ where: { role: 'ADMIN', isActive: true } });
    if (activeAdmins <= 1) {
      throw new AppError('لا يمكن إزالة صلاحية المسؤول من المسؤول النشط الوحيد.', {
        code: 'USER_LAST_ADMIN',
        status: 409,
      });
    }
  }

  if (patch.email !== undefined) {
    const normalized = normalizeEmail(patch.email);
    if (normalized !== user.email) {
      const dup = await User.findOne({ where: { email: normalized } });
      if (dup) {
        throw new AppError('هذا البريد الإلكتروني مستخدم بالفعل.', {
          code: 'USER_EMAIL_TAKEN',
          status: 409,
        });
      }
      user.email = normalized;
      // Email is the login identity, so changing it must invalidate live sessions — the same
      // reason changePassword bumps. The self-service confirmEmailChange used to do this; that
      // flow is gone, and this route is now the only way an address ever changes. Without the
      // bump, the guarantee in docs/api-conventions.md (AUTH_TOKEN_VERSION_MISMATCH covers
      // "password/email/role change") would quietly stop being true.
      user.tokenVersion += 1;
    }
  }
  if (patch.fullName !== undefined) user.fullName = patch.fullName;
  // A role change must invalidate live sessions: docs/implementation-status.md states this
  // as a guarantee, and Plan 3's assignment logic may rely on it. authenticate reloads the
  // user anyway, so the practical effect is forcing a fresh login rather than a silent
  // downgrade mid-session.
  if (patch.role !== undefined && patch.role !== user.role) {
    user.role = patch.role;
    user.tokenVersion += 1;
  }

  const actorId = await resolveActorId(actor);
  return sequelize.transaction(async (transaction) => {
    await user.save({ transaction });
    await createAuditLog(
      {
        actorUserId: actorId,
        action: 'USER_UPDATED',
        entityType: 'user',
        entityId: user.id,
        beforeValues: before,
        afterValues: { fullName: user.fullName, email: user.email, role: user.role },
        metadata: { requestId: actor?.requestId },
      },
      { transaction },
    );
    return user;
  });
}

export async function updateUserStatus({ id, isActive, actor }) {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('المستخدم غير موجود.', { code: 'USER_NOT_FOUND', status: 404 });

  // Prevent self-deactivation.
  if (id === actor?.id) {
    throw new AppError('لا يمكنك تعطيل حسابك الخاص.', {
      code: 'USER_SELF_DEACTIVATE',
      status: 409,
    });
  }
  // Prevent deactivating the only active admin.
  if (!isActive && user.role === 'ADMIN' && user.isActive) {
    const activeAdmins = await User.count({ where: { role: 'ADMIN', isActive: true } });
    if (activeAdmins <= 1) {
      throw new AppError('لا يمكن تعطيل المسؤول النشط الوحيد.', {
        code: 'USER_LAST_ADMIN',
        status: 409,
      });
    }
  }
  if (!isActive) {
    const blockingEventCount = await Event.count({
      where: {
        leaderId: id,
        status: { [Op.notIn]: ['ARCHIVED', 'CANCELLED'] },
      },
    });
    if (blockingEventCount > 0) {
      throw new AppError('لا يمكن تعطيل مستخدم يقود فعاليات نشطة.', {
        code: 'USER_LEADS_ACTIVE_EVENTS',
        status: 409,
        details: { blockingEventCount },
      });
    }
  }

  const before = { isActive: user.isActive };
  user.isActive = isActive;
  if (!isActive) {
    // Bump token version so any existing session is rejected on next request.
    user.tokenVersion += 1;
  }
  const actorId = await resolveActorId(actor);
  return sequelize.transaction(async (transaction) => {
    await user.save({ transaction });
    await createAuditLog(
      {
        actorUserId: actorId,
        action: 'USER_STATUS_CHANGED',
        entityType: 'user',
        entityId: user.id,
        beforeValues: before,
        afterValues: { isActive },
        metadata: { requestId: actor?.requestId },
      },
      { transaction },
    );
    return user;
  });
}

export async function resetPassword({ id, temporaryPassword, actor }) {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('المستخدم غير موجود.', { code: 'USER_NOT_FOUND', status: 404 });

  // An admin resetting their own password here would bypass the currentPassword proof that
  // /auth/change-password requires, turning a stolen session into a permanent credential.
  if (id === actor?.id) {
    throw new AppError('لتغيير كلمة مرورك الخاصة استخدم صفحة تغيير كلمة المرور.', {
      code: 'USER_SELF_RESET',
      status: 409,
    });
  }

  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  const actorId = await resolveActorId(actor);
  return sequelize.transaction(async (transaction) => {
    await user.update(
      { passwordHash, mustChangePassword: true, tokenVersion: user.tokenVersion + 1 },
      { transaction },
    );
    await createAuditLog(
      {
        actorUserId: actorId,
        action: 'USER_PASSWORD_RESET',
        entityType: 'user',
        entityId: user.id,
        metadata: { requestId: actor?.requestId },
      },
      { transaction },
    );
    return user;
  });
}

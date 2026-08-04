import { Op } from 'sequelize';
import { sequelize } from '../db/index.js';
import { SponsorshipPackage } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { createAuditLog } from '../utils/audit.js';
import { getAccessibleEvent } from './eventAccessService.js';

function serializePackage(pkg) {
  return {
    id: pkg.id,
    eventId: pkg.eventId,
    name: pkg.name,
    amount: pkg.amount,
    benefits: pkg.benefits,
    displayOrder: pkg.displayOrder,
    isActive: pkg.isActive,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  };
}

async function ensureActiveNameAvailable({ eventId, name, excludeId, transaction }) {
  const duplicate = await SponsorshipPackage.findOne({
    where: {
      eventId,
      name,
      isActive: true,
      ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
    },
    transaction,
  });
  if (duplicate) {
    throw new AppError('اسم حزمة الرعاية مستخدم بالفعل في هذه الفعالية.', {
      code: 'EVENT_PACKAGE_NAME_TAKEN',
      status: 409,
    });
  }
}

export async function listSponsorshipPackages({ eventId, user }) {
  await getAccessibleEvent({ eventId, user });
  const packages = await SponsorshipPackage.findAll({
    where: { eventId, isActive: true },
    order: [
      ['displayOrder', 'ASC'],
      ['amount', 'DESC'],
      ['name', 'ASC'],
    ],
  });
  return packages.map(serializePackage);
}

export async function createSponsorshipPackage({ eventId, payload, user, requestId }) {
  return sequelize.transaction(async (transaction) => {
    await getAccessibleEvent({ eventId, user, access: 'manage', transaction });
    await ensureActiveNameAvailable({ eventId, name: payload.name, transaction });
    const pkg = await SponsorshipPackage.create(
      {
        eventId,
        name: payload.name,
        amount: payload.amount,
        benefits: payload.benefits,
        displayOrder: payload.displayOrder,
        createdBy: user.id,
      },
      { transaction },
    );
    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'EVENT_PACKAGE_CREATED',
        entityType: 'sponsorship_package',
        entityId: pkg.id,
        afterValues: { eventId, name: pkg.name, amount: pkg.amount },
        metadata: { requestId },
      },
      { transaction },
    );
    return serializePackage(pkg);
  });
}

export async function updateSponsorshipPackage({ eventId, packageId, patch, user, requestId }) {
  return sequelize.transaction(async (transaction) => {
    await getAccessibleEvent({ eventId, user, access: 'manage', transaction });
    const pkg = await SponsorshipPackage.findOne({
      where: { id: packageId, eventId },
      transaction,
    });
    if (!pkg) {
      throw new AppError('حزمة الرعاية غير موجودة.', {
        code: 'EVENT_PACKAGE_NOT_FOUND',
        status: 404,
      });
    }
    if (patch.name && pkg.isActive) {
      await ensureActiveNameAvailable({
        eventId,
        name: patch.name,
        excludeId: packageId,
        transaction,
      });
    }

    const beforeValues = {
      name: pkg.name,
      amount: pkg.amount,
      benefits: pkg.benefits,
      displayOrder: pkg.displayOrder,
    };
    await pkg.update(patch, { transaction });
    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'EVENT_PACKAGE_UPDATED',
        entityType: 'sponsorship_package',
        entityId: pkg.id,
        beforeValues,
        afterValues: patch,
        metadata: { requestId },
      },
      { transaction },
    );
    return serializePackage(pkg);
  });
}

export async function deactivateSponsorshipPackage({ eventId, packageId, user, requestId }) {
  return sequelize.transaction(async (transaction) => {
    await getAccessibleEvent({ eventId, user, access: 'manage', transaction });
    const pkg = await SponsorshipPackage.findOne({
      where: { id: packageId, eventId },
      transaction,
    });
    if (!pkg) {
      throw new AppError('حزمة الرعاية غير موجودة.', {
        code: 'EVENT_PACKAGE_NOT_FOUND',
        status: 404,
      });
    }

    await pkg.update({ isActive: false }, { transaction });
    await createAuditLog(
      {
        actorUserId: user.id,
        action: 'EVENT_PACKAGE_DEACTIVATED',
        entityType: 'sponsorship_package',
        entityId: pkg.id,
        beforeValues: { isActive: true },
        afterValues: { isActive: false },
        metadata: { requestId },
      },
      { transaction },
    );
    return serializePackage(pkg);
  });
}

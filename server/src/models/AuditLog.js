import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

export class AuditLog extends Model {}

AuditLog.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    actorUserId: { type: DataTypes.UUID, allowNull: true, field: 'actor_user_id' },
    action: { type: DataTypes.STRING, allowNull: false },
    entityType: { type: DataTypes.STRING, allowNull: false, field: 'entity_type' },
    entityId: { type: DataTypes.UUID, allowNull: true, field: 'entity_id' },
    beforeValues: { type: DataTypes.JSONB, allowNull: true, field: 'before_values' },
    afterValues: { type: DataTypes.JSONB, allowNull: true, field: 'after_values' },
    metadata: { type: DataTypes.JSONB, allowNull: true },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

export class EventMember extends Model {}

EventMember.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'event_id',
      references: { model: 'events', key: 'id' },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
    },
    addedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'added_by',
      references: { model: 'users', key: 'id' },
    },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    removedAt: { type: DataTypes.DATE, allowNull: true, field: 'removed_at' },
  },
  {
    sequelize,
    modelName: 'EventMember',
    tableName: 'event_members',
    underscored: true,
    timestamps: true,
  },
);

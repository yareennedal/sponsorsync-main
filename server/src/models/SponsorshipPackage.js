import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

export class SponsorshipPackage extends Model {}

SponsorshipPackage.init(
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
    name: { type: DataTypes.STRING, allowNull: false },
    amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    benefits: { type: DataTypes.TEXT, allowNull: false },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
    },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
      references: { model: 'users', key: 'id' },
    },
  },
  {
    sequelize,
    modelName: 'SponsorshipPackage',
    tableName: 'sponsorship_packages',
    underscored: true,
    timestamps: true,
  },
);

import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';
import { DEFAULT_EVENT_STATUS, EVENT_STATUSES } from '../constants/plan2Constants.js';

export class Event extends Model {}

Event.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING, allowNull: false },
    eventDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'event_date' },
    location: { type: DataTypes.STRING, allowNull: true },
    financialTarget: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'financial_target',
      validate: { min: 0 },
    },
    sponsorshipDeadline: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'sponsorship_deadline',
    },
    targetSectors: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: () => [],
      field: 'target_sectors',
    },
    targetCities: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: () => [],
      field: 'target_cities',
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: DEFAULT_EVENT_STATUS,
      validate: { isIn: [EVENT_STATUSES] },
    },
    leaderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'leader_id',
      references: { model: 'users', key: 'id' },
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
      references: { model: 'users', key: 'id' },
    },
    archivedAt: { type: DataTypes.DATE, allowNull: true, field: 'archived_at' },
  },
  {
    sequelize,
    modelName: 'Event',
    tableName: 'events',
    underscored: true,
    timestamps: true,
  },
);

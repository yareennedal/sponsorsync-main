import { DataTypes } from 'sequelize';
import sequelize from '../db/index.js';

const SponsorshipCase = sequelize.define('SponsorshipCase', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'event_id',
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'company_id',
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'DRAFT',
  },
  statusRank: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'status_rank',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  createdBy: {
    type: DataTypes.UUID,
    field: 'created_by',
  }
}, {
  tableName: 'sponsorship_cases',
  timestamps: true,
  underscored: true,
});

export default SponsorshipCase;
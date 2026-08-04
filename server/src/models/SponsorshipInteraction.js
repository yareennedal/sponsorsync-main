import { DataTypes } from 'sequelize';
import sequelize from '../db/index.js';

const SponsorshipInteraction = sequelize.define('SponsorshipInteraction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  caseId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'case_id',
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  loggedBy: {
    type: DataTypes.UUID,
    field: 'logged_by',
  }
}, {
  tableName: 'sponsorship_interactions',
  timestamps: true,
  underscored: true,
});

export default SponsorshipInteraction;
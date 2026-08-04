import { DataTypes } from 'sequelize';
import sequelize from '../db/index.js';

const SponsorshipAssignment = sequelize.define('SponsorshipAssignment', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'MEMBER',
  },
  assignedBy: {
    type: DataTypes.UUID,
    field: 'assigned_by',
  }
}, {
  tableName: 'sponsorship_assignments',
  timestamps: true,
  underscored: true,
});

export default SponsorshipAssignment;
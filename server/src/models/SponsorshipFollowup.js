import { DataTypes } from 'sequelize';
import sequelize from '../db/index.js';

const SponsorshipFollowup = sequelize.define('SponsorshipFollowup', {
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
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'due_date',
  },
  task: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  assignedTo: {
    type: DataTypes.UUID,
    field: 'assigned_to',
  }
}, {
  tableName: 'sponsorship_followups',
  timestamps: true,
  underscored: true,
});

export default SponsorshipFollowup;

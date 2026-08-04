import { DataTypes } from 'sequelize';
import sequelize from '../db/index.js';

const SponsorshipFile = sequelize.define('SponsorshipFile', {
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
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_name',
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_url',
  },
  uploadedBy: {
    type: DataTypes.UUID,
    field: 'uploaded_by',
  }
}, {
  tableName: 'sponsorship_files',
  timestamps: true,
  underscored: true,
});

export default SponsorshipFile;

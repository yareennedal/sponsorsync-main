import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

export class Company extends Model {}

Company.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    normalizedName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'normalized_name',
    },
    sector: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: true },
    website: { type: DataTypes.STRING, allowNull: true },
    websiteDomain: { type: DataTypes.STRING, allowNull: true, field: 'website_domain' },
    generalEmail: { type: DataTypes.STRING, allowNull: true, field: 'general_email' },
    phone: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
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
    modelName: 'Company',
    tableName: 'companies',
    underscored: true,
    timestamps: true,
  },
);

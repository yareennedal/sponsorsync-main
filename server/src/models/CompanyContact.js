import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';
import { CONTACT_METHODS, DEFAULT_CONTACT_METHOD } from '../constants/plan2Constants.js';

export class CompanyContact extends Model {}

CompanyContact.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
      references: { model: 'companies', key: 'id' },
    },
    fullName: { type: DataTypes.STRING, allowNull: false, field: 'full_name' },
    position: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true, validate: { isEmail: true } },
    phone: { type: DataTypes.STRING, allowNull: true },
    preferredContactMethod: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: DEFAULT_CONTACT_METHOD,
      field: 'preferred_contact_method',
      validate: { isIn: [CONTACT_METHODS] },
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_primary',
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
    modelName: 'CompanyContact',
    tableName: 'company_contacts',
    underscored: true,
    timestamps: true,
  },
);

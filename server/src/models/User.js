import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';

export class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    fullName: { type: DataTypes.STRING, allowNull: false, field: 'full_name' },
    email: { type: DataTypes.STRING, allowNull: false, validate: { isEmail: true } },
    passwordHash: { type: DataTypes.STRING, allowNull: false, field: 'password_hash' },
    role: {
      type: DataTypes.ENUM('ADMIN', 'LEADER', 'MEMBER', 'SUPERVISOR'),
      allowNull: false,
    },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    mustChangePassword: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'must_change_password',
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'token_version',
    },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: { model: 'users', key: 'id' },
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    timestamps: true,
  },
);

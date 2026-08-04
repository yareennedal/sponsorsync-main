import Sequelize, { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    full_name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM('ADMIN', 'LEADER', 'MEMBER', 'SUPERVISOR'),
      allowNull: false,
    },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    must_change_password: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    token_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  // Email is stored normalized to lowercase by the service; unique index enforces it.
  await queryInterface.addIndex('users', ['email'], { unique: true, name: 'users_email_unique' });
  await queryInterface.addIndex('users', ['role'], { name: 'users_role_idx' });
  await queryInterface.addIndex('users', ['is_active'], { name: 'users_is_active_idx' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('users');
}

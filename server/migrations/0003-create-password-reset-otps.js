import Sequelize, { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  await queryInterface.createTable('password_reset_otps', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    otp_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    reset_token_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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

  await queryInterface.addIndex('password_reset_otps', ['user_id'], {
    name: 'password_reset_otps_user_id_idx',
  });
  await queryInterface.addIndex('password_reset_otps', ['used', 'expires_at'], {
    name: 'password_reset_otps_active_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('password_reset_otps');
}

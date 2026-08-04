// Drop the forgotten-password OTP table.
//
// The self-service "forgot password" flow was removed: SponsorSync is an internal tool, not a
// public sign-up product, so a user who is locked out reaches an admin through the company
// directly. Admin-mediated reset (POST /api/users/:id/reset-password) already issues a
// temporary password, sets must_change_password, and bumps token_version to kill every live
// session — a complete recovery path that needs no mail sender. Keeping a second, unreachable
// recovery path meant maintaining an unauthenticated endpoint that could hand out account
// access if it were ever misconfigured.
//
// The table only ever held short-lived OTP hashes, so there is no data worth preserving.
//
// `down` restores the table exactly as it stood after migration 0005, indexes included, so a
// revert of this migration followed by a revert of 0005 finds what it expects. Note that 0005
// never dropped `password_reset_otps_active_idx` (it targeted a name that was never created,
// under DROP INDEX IF EXISTS), so that index was still present and is recreated here.

import Sequelize, { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  await queryInterface.dropTable('password_reset_otps');
}

export async function down(queryInterface) {
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
    otp_hash: { type: DataTypes.STRING(64), allowNull: false },
    reset_token_hash: { type: DataTypes.STRING(64), allowNull: true },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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

  // From 0003.
  await queryInterface.addIndex('password_reset_otps', ['user_id'], {
    name: 'password_reset_otps_user_id_idx',
  });
  await queryInterface.addIndex('password_reset_otps', ['used', 'expires_at'], {
    name: 'password_reset_otps_active_idx',
  });
  // From 0005.
  await queryInterface.addIndex('password_reset_otps', ['user_id', 'used', 'expires_at'], {
    name: 'password_reset_otps_lookup_idx',
  });
}

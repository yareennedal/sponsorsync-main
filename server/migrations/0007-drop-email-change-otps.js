// Drop the email-change OTP table.
//
// The companion to 0006. The self-service email-change flow had the same two problems as the
// forgotten-password flow it followed: it could not work without a mail sender (the code goes
// to the address being claimed, which by definition is not one the app can already reach), and
// an admin can already set a user's email through PATCH /api/users/:id. So the flow was a
// second path to something the admin route does, gated behind delivery the project does not
// have.
//
// Email remains the login identity, and remains admin-controlled. `PATCH /auth/me` now accepts
// `fullName` only — that is the entire self-service surface.
//
// The table only ever held short-lived OTP hashes plus a pending address, so nothing is lost.
//
// `down` restores the table as it stood after 0005, indexes included. As with 0006, note that
// 0005 never dropped `email_change_otps_active_idx` (it targeted a name that was never created,
// under DROP INDEX IF EXISTS), so that index was still present and is recreated here.

import Sequelize, { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  await queryInterface.dropTable('email_change_otps');
}

export async function down(queryInterface) {
  await queryInterface.createTable('email_change_otps', {
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
    new_email: { type: DataTypes.STRING, allowNull: false },
    otp_hash: { type: DataTypes.STRING(64), allowNull: false },
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

  // From 0004.
  await queryInterface.addIndex('email_change_otps', ['user_id'], {
    name: 'email_change_otps_user_id_idx',
  });
  await queryInterface.addIndex('email_change_otps', ['used', 'expires_at'], {
    name: 'email_change_otps_active_idx',
  });
  // From 0005.
  await queryInterface.addIndex('email_change_otps', ['user_id', 'used', 'expires_at'], {
    name: 'email_change_otps_lookup_idx',
  });
}

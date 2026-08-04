import Sequelize, { DataTypes } from 'sequelize';

// Separate table rather than a `purpose` column on password_reset_otps: the
// password-reset flow is working and shipped, and adding a discriminator would
// mean touching every existing query for no functional gain. This also carries a
// column password reset does not need — the pending new address.
export async function up(queryInterface) {
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
    // The address being claimed. Not written to users.email until the OTP sent to
    // it is confirmed, which is what proves the requester controls the mailbox.
    new_email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otp_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
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

  await queryInterface.addIndex('email_change_otps', ['user_id'], {
    name: 'email_change_otps_user_id_idx',
  });
  await queryInterface.addIndex('email_change_otps', ['used', 'expires_at'], {
    name: 'email_change_otps_active_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('email_change_otps');
}

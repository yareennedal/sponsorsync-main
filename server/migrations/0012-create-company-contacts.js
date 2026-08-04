import Sequelize, { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  const q = queryInterface.sequelize;

  await queryInterface.createTable('company_contacts', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    company_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'companies', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    full_name: { type: DataTypes.STRING, allowNull: false },
    position: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    preferred_contact_method: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'EMAIL',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    archived_at: { type: DataTypes.DATE, allowNull: true },
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

  await q.query(
    "ALTER TABLE company_contacts ADD CONSTRAINT company_contacts_preferred_contact_method_known CHECK (preferred_contact_method IN ('EMAIL', 'PHONE', 'WHATSAPP', 'MEETING', 'OTHER'));",
  );
  await q.query(
    "ALTER TABLE company_contacts ADD CONSTRAINT company_contacts_email_or_phone_required CHECK (NULLIF(BTRIM(email), '') IS NOT NULL OR NULLIF(BTRIM(phone), '') IS NOT NULL);",
  );

  await queryInterface.addIndex('company_contacts', ['company_id'], {
    name: 'company_contacts_company_id_idx',
  });
  await queryInterface.addIndex('company_contacts', ['created_by'], {
    name: 'company_contacts_created_by_idx',
  });
  await queryInterface.addIndex('company_contacts', ['archived_at'], {
    name: 'company_contacts_archived_at_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('company_contacts');
}

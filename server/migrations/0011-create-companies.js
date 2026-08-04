import Sequelize, { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  await queryInterface.createTable('companies', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    name: { type: DataTypes.STRING, allowNull: false },
    normalized_name: { type: DataTypes.STRING, allowNull: false },
    sector: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    website: { type: DataTypes.STRING, allowNull: true },
    website_domain: { type: DataTypes.STRING, allowNull: true },
    general_email: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
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

  await queryInterface.addIndex('companies', ['normalized_name'], {
    name: 'companies_normalized_name_idx',
  });
  await queryInterface.addIndex('companies', ['website_domain'], {
    name: 'companies_website_domain_idx',
  });
  await queryInterface.addIndex('companies', ['sector'], { name: 'companies_sector_idx' });
  await queryInterface.addIndex('companies', ['city'], { name: 'companies_city_idx' });
  await queryInterface.addIndex('companies', ['created_by'], { name: 'companies_created_by_idx' });
  await queryInterface.addIndex('companies', ['archived_at'], {
    name: 'companies_archived_at_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('companies');
}

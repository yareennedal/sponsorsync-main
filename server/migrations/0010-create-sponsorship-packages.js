import Sequelize, { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  const q = queryInterface.sequelize;

  await queryInterface.createTable('sponsorship_packages', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'events', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    name: { type: DataTypes.STRING, allowNull: false },
    amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    benefits: { type: DataTypes.TEXT, allowNull: true },
    display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
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

  await q.query(
    'ALTER TABLE sponsorship_packages ADD CONSTRAINT sponsorship_packages_amount_nonnegative CHECK (amount >= 0);',
  );
  await q.query(
    'CREATE UNIQUE INDEX sponsorship_packages_event_name_active_unique ON sponsorship_packages (event_id, name) WHERE is_active = true;',
  );

  await queryInterface.addIndex('sponsorship_packages', ['event_id'], {
    name: 'sponsorship_packages_event_id_idx',
  });
  await queryInterface.addIndex('sponsorship_packages', ['created_by'], {
    name: 'sponsorship_packages_created_by_idx',
  });
}

export async function down(queryInterface) {
  const q = queryInterface.sequelize;

  await q.query('DROP INDEX IF EXISTS sponsorship_packages_event_name_active_unique;');
  await queryInterface.dropTable('sponsorship_packages');
}

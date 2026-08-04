import Sequelize, { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  const q = queryInterface.sequelize;

  await queryInterface.createTable('events', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING, allowNull: false },
    event_date: { type: DataTypes.DATEONLY, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: true },
    financial_target: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    sponsorship_deadline: { type: DataTypes.DATEONLY, allowNull: true },
    target_sectors: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal("'[]'::jsonb"),
    },
    target_cities: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal("'[]'::jsonb"),
    },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'DRAFT' },
    leader_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
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
    'ALTER TABLE events ADD CONSTRAINT events_financial_target_nonnegative CHECK (financial_target >= 0);',
  );
  await q.query(
    'ALTER TABLE events ADD CONSTRAINT events_sponsorship_deadline_before_event CHECK (sponsorship_deadline IS NULL OR sponsorship_deadline <= event_date);',
  );
  await q.query(
    "ALTER TABLE events ADD CONSTRAINT events_status_known CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED'));",
  );
  await q.query(
    "ALTER TABLE events ADD CONSTRAINT events_target_sectors_is_array CHECK (jsonb_typeof(target_sectors) = 'array');",
  );
  await q.query(
    "ALTER TABLE events ADD CONSTRAINT events_target_cities_is_array CHECK (jsonb_typeof(target_cities) = 'array');",
  );

  await queryInterface.addIndex('events', ['leader_id'], { name: 'events_leader_id_idx' });
  await queryInterface.addIndex('events', ['created_by'], { name: 'events_created_by_idx' });
  await queryInterface.addIndex('events', ['status'], { name: 'events_status_idx' });
  await queryInterface.addIndex('events', ['event_date'], { name: 'events_event_date_idx' });
  await queryInterface.addIndex('events', ['archived_at'], { name: 'events_archived_at_idx' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('events');
}

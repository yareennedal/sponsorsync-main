import Sequelize, { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  await queryInterface.createTable('audit_logs', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    actor_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    action: { type: DataTypes.STRING, allowNull: false },
    entity_type: { type: DataTypes.STRING, allowNull: false },
    entity_id: { type: DataTypes.UUID, allowNull: true },
    before_values: { type: DataTypes.JSONB, allowNull: true },
    after_values: { type: DataTypes.JSONB, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  await queryInterface.addIndex('audit_logs', ['actor_user_id'], { name: 'audit_logs_actor_idx' });
  await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id'], {
    name: 'audit_logs_entity_idx',
  });
  await queryInterface.addIndex('audit_logs', ['created_at'], {
    name: 'audit_logs_created_at_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('audit_logs');
}

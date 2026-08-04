import Sequelize, { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  await queryInterface.createTable('event_members', {
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    added_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    removed_at: { type: DataTypes.DATE, allowNull: true },
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

  await queryInterface.addConstraint('event_members', {
    fields: ['event_id', 'user_id'],
    type: 'unique',
    name: 'event_members_event_user_unique',
  });
  await queryInterface.addIndex('event_members', ['event_id'], {
    name: 'event_members_event_id_idx',
  });
  await queryInterface.addIndex('event_members', ['user_id'], {
    name: 'event_members_user_id_idx',
  });
  await queryInterface.addIndex('event_members', ['added_by'], {
    name: 'event_members_added_by_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('event_members');
}

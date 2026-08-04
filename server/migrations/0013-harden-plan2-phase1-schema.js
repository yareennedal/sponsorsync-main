export async function up(queryInterface) {
  const q = queryInterface.sequelize;

  await q.query("UPDATE sponsorship_packages SET benefits = '' WHERE benefits IS NULL;");
  await q.query('ALTER TABLE sponsorship_packages ALTER COLUMN benefits SET NOT NULL;');

  await q.query("UPDATE companies SET sector = 'unspecified' WHERE sector IS NULL;");
  await q.query('ALTER TABLE companies ALTER COLUMN sector SET NOT NULL;');

  await q.query('ALTER TABLE event_members DROP CONSTRAINT IF EXISTS event_members_event_id_fkey;');
  await q.query(
    `ALTER TABLE event_members
     ADD CONSTRAINT event_members_event_id_fkey
     FOREIGN KEY (event_id) REFERENCES events(id)
     ON UPDATE CASCADE ON DELETE RESTRICT;`,
  );

  await q.query(
    'ALTER TABLE sponsorship_packages DROP CONSTRAINT IF EXISTS sponsorship_packages_event_id_fkey;',
  );
  await q.query(
    `ALTER TABLE sponsorship_packages
     ADD CONSTRAINT sponsorship_packages_event_id_fkey
     FOREIGN KEY (event_id) REFERENCES events(id)
     ON UPDATE CASCADE ON DELETE RESTRICT;`,
  );

  await q.query(
    'ALTER TABLE company_contacts DROP CONSTRAINT IF EXISTS company_contacts_company_id_fkey;',
  );
  await q.query(
    `ALTER TABLE company_contacts
     ADD CONSTRAINT company_contacts_company_id_fkey
     FOREIGN KEY (company_id) REFERENCES companies(id)
     ON UPDATE CASCADE ON DELETE RESTRICT;`,
  );
}

export async function down(queryInterface) {
  const q = queryInterface.sequelize;

  await q.query(
    'ALTER TABLE company_contacts DROP CONSTRAINT IF EXISTS company_contacts_company_id_fkey;',
  );
  await q.query(
    `ALTER TABLE company_contacts
     ADD CONSTRAINT company_contacts_company_id_fkey
     FOREIGN KEY (company_id) REFERENCES companies(id)
     ON UPDATE CASCADE ON DELETE CASCADE;`,
  );

  await q.query(
    'ALTER TABLE sponsorship_packages DROP CONSTRAINT IF EXISTS sponsorship_packages_event_id_fkey;',
  );
  await q.query(
    `ALTER TABLE sponsorship_packages
     ADD CONSTRAINT sponsorship_packages_event_id_fkey
     FOREIGN KEY (event_id) REFERENCES events(id)
     ON UPDATE CASCADE ON DELETE CASCADE;`,
  );

  await q.query('ALTER TABLE event_members DROP CONSTRAINT IF EXISTS event_members_event_id_fkey;');
  await q.query(
    `ALTER TABLE event_members
     ADD CONSTRAINT event_members_event_id_fkey
     FOREIGN KEY (event_id) REFERENCES events(id)
     ON UPDATE CASCADE ON DELETE CASCADE;`,
  );

  await q.query('ALTER TABLE companies ALTER COLUMN sector DROP NOT NULL;');
  await q.query('ALTER TABLE sponsorship_packages ALTER COLUMN benefits DROP NOT NULL;');
}

const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Itsapcpka25',
    database: 'fleet_management',
    port: 3306
  });

  console.log('Connected to MySQL database on localhost:3306');

  const queries = [
    `ALTER TABLE trip_orders ADD COLUMN is_extended TINYINT(1) DEFAULT 0`,
    `ALTER TABLE trip_orders ADD COLUMN extend_company_id INT NULL`,
    `ALTER TABLE trip_orders ADD COLUMN extend_unit_id INT NULL`,
    `ALTER TABLE trip_orders ADD COLUMN extend_destination VARCHAR(255) NULL`,
    `ALTER TABLE trip_orders ADD COLUMN extend_purpose TEXT NULL`,
    `ALTER TABLE trip_orders ADD COLUMN extend_notes TEXT NULL`,
    `ALTER TABLE trip_orders ADD CONSTRAINT fk_extend_company FOREIGN KEY (extend_company_id) REFERENCES companies(id) ON DELETE SET NULL`,
    `ALTER TABLE trip_orders ADD CONSTRAINT fk_extend_unit FOREIGN KEY (extend_unit_id) REFERENCES units(id) ON DELETE SET NULL`
  ];

  for (const query of queries) {
    try {
      console.log(`Executing: ${query}`);
      await connection.query(query);
      console.log('✅ Success');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_CANNOT_ADD_FOREIGN_KEY' || err.code === 'ER_FK_DUP_NAME' || err.message.includes('already exists') || err.message.includes('Duplicate column')) {
        console.log(`⚠️ Column/constraint already exists, skipping...`);
      } else {
        console.error(`❌ Error executing query:`, err.message);
      }
    }
  }

  await connection.end();
  console.log('Migration finished.');
}

run().catch(console.error);

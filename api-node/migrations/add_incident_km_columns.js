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
    // 1. Add current_km to trip_events table
    `ALTER TABLE trip_events ADD COLUMN current_km INT DEFAULT NULL`,
    
    // 2. Add photo_km to trip_events table
    `ALTER TABLE trip_events ADD COLUMN photo_km VARCHAR(500) DEFAULT NULL`,

    // 3. Alter trip_checkpoints.type enum values to support extend_unloading and incident
    `ALTER TABLE trip_checkpoints MODIFY COLUMN type ENUM('departure','fuel_stop','rest_stop','arrival','unloading','extend_unloading','return_departure','return_arrival','incident') NOT NULL`
  ];

  for (const query of queries) {
    try {
      console.log(`Executing: ${query}`);
      await connection.query(query);
      console.log('✅ Success');
    } catch (err) {
      console.error(`❌ Error executing query:`, err.message);
    }
  }

  await connection.end();
  console.log('Migration finished.');
}

run().catch(console.error);

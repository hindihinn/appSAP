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
    // 1. Alter vehicles.fuel_type from ENUM to VARCHAR(100)
    `ALTER TABLE vehicles MODIFY COLUMN fuel_type VARCHAR(100) DEFAULT NULL`,
    
    // 2. Create fuels table
    `CREATE TABLE IF NOT EXISTS fuels (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      active_from DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
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

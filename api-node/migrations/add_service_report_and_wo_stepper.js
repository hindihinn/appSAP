const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'db',
    user: 'root',
    password: 'Itsapcpka25',
    database: 'fleet_management',
    port: 3306
  });

  console.log('Starting migration...');

  // 1. Create service_tickets table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS service_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_number VARCHAR(50) UNIQUE NOT NULL,
      driver_id INT NOT NULL,
      vehicle_id INT NOT NULL,
      damage_type VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      notes TEXT,
      status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (driver_id),
      INDEX (vehicle_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✅ Created table service_tickets');

  // 2. Create service_ticket_photos table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS service_ticket_photos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      photo_path VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (ticket_id),
      FOREIGN KEY (ticket_id) REFERENCES service_tickets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✅ Created table service_ticket_photos');

  // 3. Create service_order_checkpoints table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS service_order_checkpoints (
      id INT AUTO_INCREMENT PRIMARY KEY,
      work_order_id INT NOT NULL,
      type ENUM('start_to_workshop', 'arrive_at_workshop', 'return_to_office') NOT NULL,
      km_reading INT NOT NULL,
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      address VARCHAR(255),
      photo_km VARCHAR(255) NOT NULL,
      photo_activity VARCHAR(255),
      photo_invoice VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (work_order_id),
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✅ Created table service_order_checkpoints');

  // 4. Modify work_orders to add ticket_id column
  const [cols] = await connection.query("SHOW COLUMNS FROM work_orders LIKE 'ticket_id'");
  if (cols.length === 0) {
    await connection.query("ALTER TABLE work_orders ADD COLUMN ticket_id INT NULL AFTER id");
    await connection.query("ALTER TABLE work_orders ADD INDEX (ticket_id)");
    await connection.query("ALTER TABLE work_orders ADD CONSTRAINT fk_wo_ticket FOREIGN KEY (ticket_id) REFERENCES service_tickets(id) ON DELETE SET NULL");
    console.log('✅ Added ticket_id to work_orders');
  } else {
    console.log('ℹ️ ticket_id already exists in work_orders');
  }

  // Also make sure status enum in work_orders supports in_progress / completed
  // (We saw in describe that it already supports 'draft','pending','approved','in_progress','completed','cancelled')

  await connection.end();
  console.log('Migration completed successfully!');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

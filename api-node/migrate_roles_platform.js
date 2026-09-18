const db = require('./config/db');
(async () => {
  try {
    await db.query("ALTER TABLE roles ADD COLUMN IF NOT EXISTS platform VARCHAR(10) DEFAULT 'web'");
    await db.query("UPDATE roles SET platform = 'mobile' WHERE id IN (4, 5)");
    const [rows] = await db.query('SELECT id, name, platform FROM roles ORDER BY id');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch(e) {
    console.error(e.message);
    process.exit(1);
  }
})();

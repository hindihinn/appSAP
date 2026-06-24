const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');
const { upload, setUploadDir } = require('../middleware/upload');

const generateWONumber = async () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [rows] = await db.query(`SELECT COUNT(*) as cnt FROM work_orders WHERE DATE(created_at) = CURDATE()`);
  return `WO-${date}-${String(rows[0].cnt + 1).padStart(4, '0')}`;
};

// Work Orders
router.get('/work-orders', auth, checkPermission('services.view'), async (req, res) => {
  try {
    const { status, vehicle_id, priority } = req.query;
    let query = `SELECT wo.*, v.nopol, v.merk, v.model, cb.name as created_by_name, ab.name as approved_by_name
                 FROM work_orders wo JOIN vehicles v ON wo.vehicle_id = v.id
                 LEFT JOIN users cb ON wo.created_by = cb.id LEFT JOIN users ab ON wo.approved_by = ab.id WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND wo.status = ?'; params.push(status); }
    if (vehicle_id) { query += ' AND wo.vehicle_id = ?'; params.push(vehicle_id); }
    if (priority) { query += ' AND wo.priority = ?'; params.push(priority); }
    query += ' ORDER BY wo.created_at DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/work-orders/:id', auth, async (req, res) => {
  try {
    const [wo] = await db.query(`SELECT wo.*, v.nopol, v.merk FROM work_orders wo JOIN vehicles v ON wo.vehicle_id = v.id WHERE wo.id=?`, [req.params.id]);
    if (wo.length === 0) return res.status(404).json({ success: false, message: 'WO not found' });
    const [items] = await db.query('SELECT * FROM service_items WHERE work_order_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...wo[0], items } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/work-orders', auth, checkPermission('services.create'), setUploadDir('services'), upload.fields([
  { name: 'before_photo', maxCount: 1 }, { name: 'document_file', maxCount: 1 }
]), async (req, res) => {
  try {
    const wo_number = await generateWONumber();
    const { vehicle_id, service_type, category, description, workshop_name, workshop_address, mechanic_name, reported_date, km_at_service, estimated_cost, priority, notes, items } = req.body;
    const files = req.files || {};
    const before_photo = files.before_photo ? `/uploads/services/${files.before_photo[0].filename}` : null;
    const document_file = files.document_file ? `/uploads/services/${files.document_file[0].filename}` : null;

    const [result] = await db.query(
      `INSERT INTO work_orders (wo_number, vehicle_id, service_type, category, description, workshop_name, workshop_address, mechanic_name, reported_date, km_at_service, estimated_cost, priority, before_photo, document_file, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [wo_number, vehicle_id, service_type, category, description, workshop_name, workshop_address, mechanic_name, reported_date, km_at_service, estimated_cost, priority || 'medium', before_photo, document_file, notes, req.user.id]
    );

    if (items) {
      const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
      for (const item of parsedItems) {
        await db.query(
          `INSERT INTO service_items (work_order_id, item_name, category, quantity, unit, unit_price, total_price) VALUES (?,?,?,?,?,?,?)`,
          [result.insertId, item.item_name, item.category, item.quantity, item.unit, item.unit_price, item.total_price]
        );
      }
    }
    res.status(201).json({ success: true, data: { id: result.insertId, wo_number } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/work-orders/:id/status', auth, checkPermission('services.approve'), async (req, res) => {
  try {
    const { status, actual_cost, completed_date, notes } = req.body;
    let query = 'UPDATE work_orders SET status=?';
    const params = [status];
    if (status === 'approved') { query += ', approved_by=?, approved_at=NOW()'; params.push(req.user.id); }
    if (actual_cost) { query += ', actual_cost=?'; params.push(actual_cost); }
    if (completed_date) { query += ', completed_date=?'; params.push(completed_date); }
    if (notes) { query += ', notes=?'; params.push(notes); }
    if (status === 'completed') {
      query += ', completed_date=COALESCE(completed_date, CURDATE())';
      // Update vehicle status back
      const [wo] = await db.query('SELECT vehicle_id FROM work_orders WHERE id=?', [req.params.id]);
      if (wo.length > 0) await db.query(`UPDATE vehicles SET status='available' WHERE id=? AND status='maintenance'`, [wo[0].vehicle_id]);
    }
    query += ' WHERE id=?'; params.push(req.params.id);
    await db.query(query, params);
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Routine Services
router.get('/routine', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT rs.*, v.nopol, v.merk, v.current_km FROM routine_services rs JOIN vehicles v ON rs.vehicle_id = v.id ORDER BY rs.status DESC, rs.next_service_date`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/routine', auth, checkPermission('services.create'), async (req, res) => {
  try {
    const { vehicle_id, service_type, interval_km, interval_days, last_service_date, last_service_km, next_service_date, next_service_km, notes } = req.body;
    const [result] = await db.query(
      `INSERT INTO routine_services (vehicle_id, service_type, interval_km, interval_days, last_service_date, last_service_km, next_service_date, next_service_km, notes) VALUES (?,?,?,?,?,?,?,?,?)`,
      [vehicle_id, service_type, interval_km, interval_days, last_service_date, last_service_km, next_service_date, next_service_km, notes]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// History
router.get('/history', auth, async (req, res) => {
  try {
    const { vehicle_id } = req.query;
    let query = `SELECT wo.*, v.nopol, v.merk FROM work_orders wo JOIN vehicles v ON wo.vehicle_id = v.id WHERE wo.status = 'completed'`;
    const params = [];
    if (vehicle_id) { query += ' AND wo.vehicle_id = ?'; params.push(vehicle_id); }
    query += ' ORDER BY wo.completed_date DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

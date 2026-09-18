const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { driver_id, vehicle_id, status } = req.query;
    let query = `SELECT da.*, d.name as driver_name, d.employee_id, d.phone as driver_phone,
                        v.nopol, v.merk, v.model, u.name as assigned_by_name
                 FROM driver_assignments da 
                 JOIN drivers d ON da.driver_id = d.id JOIN vehicles v ON da.vehicle_id = v.id
                 LEFT JOIN users u ON da.assigned_by = u.id WHERE 1=1`;
    const params = [];
    if (driver_id) { query += ' AND da.driver_id = ?'; params.push(driver_id); }
    if (vehicle_id) { query += ' AND da.vehicle_id = ?'; params.push(vehicle_id); }
    if (status) { query += ' AND da.status = ?'; params.push(status); }
    query += ' ORDER BY da.assigned_date DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', auth, checkPermission('drivers.edit'), async (req, res) => {
  try {
    const { driver_id, vehicle_id, assigned_date, notes } = req.body;
    // End previous active assignments for this driver
    await db.query(`UPDATE driver_assignments SET status='ended', end_date=CURDATE() WHERE driver_id=? AND status='active'`, [driver_id]);
    const [result] = await db.query(
      `INSERT INTO driver_assignments (driver_id, vehicle_id, assigned_date, assigned_by, notes) VALUES (?,?,?,?,?)`,
      [driver_id, vehicle_id, assigned_date || new Date(), req.user.id, notes]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', auth, checkPermission('drivers.edit'), async (req, res) => {
  try {
    const { status, end_date, notes } = req.body;
    await db.query('UPDATE driver_assignments SET status=?, end_date=?, notes=? WHERE id=?',
      [status, end_date, notes, req.params.id]);
    res.json({ success: true, message: 'Updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

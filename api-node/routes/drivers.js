const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');
const { upload, setUploadDir } = require('../middleware/upload');

router.get('/', auth, checkPermission('drivers.view'), async (req, res) => {
  try {
    const { status, unit_id, search } = req.query;
    let query = `SELECT d.*, u.name as unit_name, us.email FROM drivers d 
                 LEFT JOIN units u ON d.unit_id = u.id LEFT JOIN users us ON d.user_id = us.id WHERE d.is_active = 1`;
    const params = [];
    if (status) { query += ' AND d.status = ?'; params.push(status); }
    if (unit_id) { query += ' AND d.unit_id = ?'; params.push(unit_id); }
    if (search) { query += ' AND (d.name LIKE ? OR d.employee_id LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY d.name';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/available', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, da.vehicle_id, v.nopol as assigned_vehicle FROM drivers d 
       LEFT JOIN driver_assignments da ON d.id = da.driver_id AND da.status = 'active'
       LEFT JOIN vehicles v ON da.vehicle_id = v.id
       WHERE d.is_active = 1 AND d.status = 'available' ORDER BY d.name`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, u.name as unit_name, us.email FROM drivers d 
       LEFT JOIN units u ON d.unit_id = u.id LEFT JOIN users us ON d.user_id = us.id WHERE d.id = ?`, [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Driver tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', auth, checkPermission('drivers.create'), setUploadDir('drivers'), upload.single('photo'), async (req, res) => {
  try {
    const { user_id, employee_id, name, nik, address, phone, emergency_contact, emergency_phone, birth_date, blood_type, unit_id, join_date, notes } = req.body;
    const photo = req.file ? `/uploads/drivers/${req.file.filename}` : null;
    const [result] = await db.query(
      `INSERT INTO drivers (user_id, employee_id, name, nik, address, phone, emergency_contact, emergency_phone, birth_date, photo, blood_type, unit_id, join_date, notes) 
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [user_id, employee_id, name, nik, address, phone, emergency_contact, emergency_phone, birth_date, photo, blood_type, unit_id, join_date, notes]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', auth, checkPermission('drivers.edit'), setUploadDir('drivers'), upload.single('photo'), async (req, res) => {
  try {
    const { employee_id, name, nik, address, phone, emergency_contact, emergency_phone, birth_date, blood_type, unit_id, status, join_date, notes } = req.body;
    const photo = req.file ? `/uploads/drivers/${req.file.filename}` : undefined;
    let query = `UPDATE drivers SET employee_id=?, name=?, nik=?, address=?, phone=?, emergency_contact=?, emergency_phone=?, birth_date=?, blood_type=?, unit_id=?, status=?, join_date=?, notes=?`;
    const params = [employee_id, name, nik, address, phone, emergency_contact, emergency_phone, birth_date, blood_type, unit_id, status, join_date, notes];
    if (photo) { query += ', photo=?'; params.push(photo); }
    query += ' WHERE id=?'; params.push(req.params.id);
    await db.query(query, params);
    res.json({ success: true, message: 'Driver updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', auth, checkPermission('drivers.delete'), async (req, res) => {
  try {
    await db.query('UPDATE drivers SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Driver deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');
const { upload, setUploadDir } = require('../middleware/upload');

router.get('/', auth, async (req, res) => {
  try {
    const { vehicle_id, status, type } = req.query;
    let query = `SELECT vl.*, v.nopol, v.merk, v.model FROM vehicle_legality vl JOIN vehicles v ON vl.vehicle_id = v.id WHERE 1=1`;
    const params = [];
    if (vehicle_id) { query += ' AND vl.vehicle_id = ?'; params.push(vehicle_id); }
    if (status) { query += ' AND vl.status = ?'; params.push(status); }
    if (type) { query += ' AND vl.type = ?'; params.push(type); }
    query += ' ORDER BY vl.expiry_date ASC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/expiring', auth, async (req, res) => {
  try {
    const days = req.query.days || 30;
    const [rows] = await db.query(
      `SELECT vl.*, v.nopol, v.merk FROM vehicle_legality vl JOIN vehicles v ON vl.vehicle_id = v.id 
       WHERE vl.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) ORDER BY vl.expiry_date ASC`, [days]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', auth, checkPermission('vehicles.create'), setUploadDir('legality/vehicles'), upload.single('document_file'), async (req, res) => {
  try {
    const { vehicle_id, type, document_number, issued_date, expiry_date, reminder_days, notes } = req.body;
    const document_file = req.file ? `/uploads/legality/vehicles/${req.file.filename}` : null;
    const [result] = await db.query(
      `INSERT INTO vehicle_legality (vehicle_id, type, document_number, issued_date, expiry_date, document_file, reminder_days, notes) VALUES (?,?,?,?,?,?,?,?)`,
      [vehicle_id, type, document_number, issued_date, expiry_date, document_file, reminder_days || 30, notes]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', auth, checkPermission('vehicles.edit'), setUploadDir('legality/vehicles'), upload.single('document_file'), async (req, res) => {
  try {
    const { vehicle_id, type, document_number, issued_date, expiry_date, reminder_days, status, notes } = req.body;
    const document_file = req.file ? `/uploads/legality/vehicles/${req.file.filename}` : undefined;
    let query = `UPDATE vehicle_legality SET vehicle_id=?, type=?, document_number=?, issued_date=?, expiry_date=?, reminder_days=?, status=?, notes=?`;
    const params = [vehicle_id, type, document_number, issued_date, expiry_date, reminder_days, status, notes];
    if (document_file) { query += ', document_file=?'; params.push(document_file); }
    query += ' WHERE id=?'; params.push(req.params.id);
    await db.query(query, params);
    res.json({ success: true, message: 'Updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', auth, checkPermission('vehicles.delete'), async (req, res) => {
  try {
    await db.query('DELETE FROM vehicle_legality WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

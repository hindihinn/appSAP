const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');
const { upload, setUploadDir } = require('../middleware/upload');

router.get('/', auth, async (req, res) => {
  try {
    const { driver_id, status, type } = req.query;
    let query = `SELECT dl.*, d.name as driver_name, d.employee_id FROM driver_legality dl JOIN drivers d ON dl.driver_id = d.id WHERE 1=1`;
    const params = [];
    if (driver_id) { query += ' AND dl.driver_id = ?'; params.push(driver_id); }
    if (status) { query += ' AND dl.status = ?'; params.push(status); }
    if (type) { query += ' AND dl.type = ?'; params.push(type); }
    query += ' ORDER BY dl.expiry_date ASC';
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
      `SELECT dl.*, d.name as driver_name FROM driver_legality dl JOIN drivers d ON dl.driver_id = d.id 
       WHERE dl.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) ORDER BY dl.expiry_date`, [days]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', auth, checkPermission('drivers.create'), setUploadDir('legality/drivers'), upload.single('document_file'), async (req, res) => {
  try {
    const { driver_id, type, document_number, issued_date, expiry_date, reminder_days, notes } = req.body;
    const document_file = req.file ? `/uploads/legality/drivers/${req.file.filename}` : null;
    const [result] = await db.query(
      `INSERT INTO driver_legality (driver_id, type, document_number, issued_date, expiry_date, document_file, reminder_days, notes) VALUES (?,?,?,?,?,?,?,?)`,
      [driver_id, type, document_number, issued_date, expiry_date, document_file, reminder_days || 30, notes]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', auth, checkPermission('drivers.edit'), setUploadDir('legality/drivers'), upload.single('document_file'), async (req, res) => {
  try {
    const { driver_id, type, document_number, issued_date, expiry_date, reminder_days, status, notes } = req.body;
    const document_file = req.file ? `/uploads/legality/drivers/${req.file.filename}` : undefined;
    let query = `UPDATE driver_legality SET driver_id=?, type=?, document_number=?, issued_date=?, expiry_date=?, reminder_days=?, status=?, notes=?`;
    const params = [driver_id, type, document_number, issued_date, expiry_date, reminder_days, status, notes];
    if (document_file) { query += ', document_file=?'; params.push(document_file); }
    query += ' WHERE id=?'; params.push(req.params.id);
    await db.query(query, params);
    res.json({ success: true, message: 'Updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', auth, checkPermission('drivers.delete'), async (req, res) => {
  try {
    await db.query('DELETE FROM driver_legality WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

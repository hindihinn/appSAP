const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');

// ============ COMPANIES ============

router.get('/companies', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM companies WHERE is_active = 1 ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/companies', auth, checkPermission('org.manage'), async (req, res) => {
  try {
    const { name, code, address, phone, email } = req.body;
    const [result] = await db.query(
      'INSERT INTO companies (name, code, address, phone, email) VALUES (?, ?, ?, ?, ?)',
      [name, code, address, phone, email]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Kode perusahaan sudah ada' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/companies/:id', auth, checkPermission('org.manage'), async (req, res) => {
  try {
    const { name, code, address, phone, email, is_active } = req.body;
    await db.query(
      'UPDATE companies SET name=?, code=?, address=?, phone=?, email=?, is_active=? WHERE id=?',
      [name, code, address, phone, email, is_active ?? 1, req.params.id]
    );
    res.json({ success: true, message: 'Company updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/companies/:id', auth, checkPermission('org.manage'), async (req, res) => {
  try {
    await db.query('UPDATE companies SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Company deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ UNITS ============

router.get('/units', auth, async (req, res) => {
  try {
    const companyId = req.query.company_id;
    let query = 'SELECT u.*, c.name as company_name FROM units u JOIN companies c ON u.company_id = c.id WHERE u.is_active = 1';
    const params = [];
    if (companyId) { query += ' AND u.company_id = ?'; params.push(companyId); }
    query += ' ORDER BY c.name, u.name';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/units', auth, checkPermission('org.manage'), async (req, res) => {
  try {
    const { company_id, name, code, description } = req.body;
    const [result] = await db.query(
      'INSERT INTO units (company_id, name, code, description) VALUES (?, ?, ?, ?)',
      [company_id, name, code, description]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/units/:id', auth, checkPermission('org.manage'), async (req, res) => {
  try {
    const { company_id, name, code, description, is_active } = req.body;
    await db.query(
      'UPDATE units SET company_id=?, name=?, code=?, description=?, is_active=? WHERE id=?',
      [company_id, name, code, description, is_active ?? 1, req.params.id]
    );
    res.json({ success: true, message: 'Unit updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/units/:id', auth, checkPermission('org.manage'), async (req, res) => {
  try {
    await db.query('UPDATE units SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Unit deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ DIVISIONS ============

router.get('/divisions', auth, async (req, res) => {
  try {
    const unitId = req.query.unit_id;
    let query = `SELECT d.*, u.name as unit_name, c.name as company_name 
                 FROM divisions d JOIN units u ON d.unit_id = u.id JOIN companies c ON u.company_id = c.id 
                 WHERE d.is_active = 1`;
    const params = [];
    if (unitId) { query += ' AND d.unit_id = ?'; params.push(unitId); }
    query += ' ORDER BY c.name, u.name, d.name';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/divisions', auth, checkPermission('org.manage'), async (req, res) => {
  try {
    const { unit_id, name, code, description } = req.body;
    const [result] = await db.query(
      'INSERT INTO divisions (unit_id, name, code, description) VALUES (?, ?, ?, ?)',
      [unit_id, name, code, description]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/divisions/:id', auth, checkPermission('org.manage'), async (req, res) => {
  try {
    const { unit_id, name, code, description, is_active } = req.body;
    await db.query(
      'UPDATE divisions SET unit_id=?, name=?, code=?, description=?, is_active=? WHERE id=?',
      [unit_id, name, code, description, is_active ?? 1, req.params.id]
    );
    res.json({ success: true, message: 'Division updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

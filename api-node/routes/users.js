const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET all users
router.get('/', auth, async (req, res) => {
  try {
    const { role_id, search, status, type } = req.query;
    let query = `SELECT u.id, u.name, u.email, u.phone, u.role_id, u.is_active, u.last_login, u.created_at,
                        r.name as role_name, c.name as company_name, un.name as unit_name
                 FROM users u
                 LEFT JOIN roles r ON u.role_id = r.id
                 LEFT JOIN companies c ON u.company_id = c.id
                 LEFT JOIN units un ON u.unit_id = un.id
                 WHERE 1=1`;
    const params = [];
    if (role_id) { query += ' AND u.role_id = ?'; params.push(role_id); }
    if (type === 'web') { query += " AND u.role_id IN (SELECT id FROM roles WHERE platform = 'web' OR platform IS NULL)"; }
    if (type === 'mobile') { query += " AND u.role_id IN (SELECT id FROM roles WHERE platform = 'mobile')"; }
    if (status === 'active') { query += ' AND u.is_active = 1'; }
    if (status === 'inactive') { query += ' AND u.is_active = 0'; }
    if (search) { query += ' AND (u.name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY u.name';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role_id, u.company_id, u.unit_id, u.division_id, u.is_active, u.created_at,
              r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?`, [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create user
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, password, phone, role_id, company_id, unit_id, division_id } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, phone, role_id, company_id, unit_id, division_id) VALUES (?,?,?,?,?,?,?,?)`,
      [name, email, hashedPassword, phone, role_id, company_id || null, unit_id || null, division_id || null]
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'User berhasil ditambahkan' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update user
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, phone, role_id, company_id, unit_id, division_id, is_active, password } = req.body;
    let query = `UPDATE users SET name=?, email=?, phone=?, role_id=?, company_id=?, unit_id=?, division_id=?, is_active=?`;
    const params = [name, email, phone, role_id, company_id || null, unit_id || null, division_id || null, is_active !== undefined ? is_active : 1];
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password=?';
      params.push(hashedPassword);
    }
    query += ' WHERE id=?';
    params.push(req.params.id);
    await db.query(query, params);
    res.json({ success: true, message: 'User berhasil diupdate' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE user permanently
router.delete('/:id', auth, async (req, res) => {
  try {
    const [user] = await db.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (user.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

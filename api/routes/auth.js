const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    const [users] = await db.query(
      `SELECT u.*, r.name as role_name, r.display_name as role_display_name,
              c.name as company_name, un.name as unit_name, d.name as division_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN companies c ON u.company_id = c.id
       LEFT JOIN units un ON u.unit_id = un.id
       LEFT JOIN divisions d ON u.division_id = d.id
       WHERE u.email = ? AND u.is_active = 1`, [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    // Get permissions
    const [permissions] = await db.query(
      `SELECT p.name FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?`,
      [user.role_id]
    );

    const token = jwt.sign({ id: user.id, role: user.role_name }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const { password: _, ...userData } = user;
    res.json({
      success: true,
      data: {
        user: { ...userData, permissions: permissions.map(p => p.name) },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/register
router.post('/register', auth, async (req, res) => {
  try {
    const { name, email, password, phone, role_id, company_id, unit_id, division_id } = req.body;
    
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, phone, role_id, company_id, unit_id, division_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone, role_id, company_id || null, unit_id || null, division_id || null]
    );

    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'User berhasil dibuat' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const { password, ...userData } = req.user;
  res.json({ success: true, data: userData });
});

// PUT /api/auth/fcm-token
router.put('/fcm-token', auth, async (req, res) => {
  try {
    await db.query('UPDATE users SET fcm_token = ? WHERE id = ?', [req.body.fcm_token, req.user.id]);
    res.json({ success: true, message: 'FCM token updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

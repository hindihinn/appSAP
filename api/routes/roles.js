const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');

// GET all roles
router.get('/', auth, async (req, res) => {
  try {
    const [roles] = await db.query('SELECT * FROM roles ORDER BY id');
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET all permissions
router.get('/permissions', auth, async (req, res) => {
  try {
    const [permissions] = await db.query('SELECT * FROM permissions ORDER BY module, name');
    res.json({ success: true, data: permissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET role permissions
router.get('/:id/permissions', auth, async (req, res) => {
  try {
    const [permissions] = await db.query(
      `SELECT p.* FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?`,
      [req.params.id]
    );
    res.json({ success: true, data: permissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create role
router.post('/', auth, checkPermission('roles.manage'), async (req, res) => {
  try {
    const { name, display_name, description, platform } = req.body;
    if (!name || !display_name) return res.status(400).json({ success: false, message: 'Nama dan display name wajib diisi' });
    const [result] = await db.query(
      "INSERT INTO roles (name, display_name, description, platform) VALUES (?, ?, ?, ?)",
      [name, display_name, description || null, platform || 'web']
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Role berhasil ditambahkan' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Role sudah ada' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update role details
router.put('/:id', auth, checkPermission('roles.manage'), async (req, res) => {
  try {
    const { display_name, description, platform } = req.body;
    const [role] = await db.query('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (role.length === 0) return res.status(404).json({ success: false, message: 'Role tidak ditemukan' });
    if (role[0].is_system && role[0].name === 'super_admin') {
      return res.status(400).json({ success: false, message: 'Tidak bisa edit Super Admin' });
    }
    await db.query(
      'UPDATE roles SET display_name=?, description=?, platform=? WHERE id=?',
      [display_name, description || null, platform || 'web', req.params.id]
    );
    res.json({ success: true, message: 'Role berhasil diupdate' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update role permissions
router.put('/:id/permissions', auth, checkPermission('roles.manage'), async (req, res) => {
  try {
    const { permission_ids } = req.body;
    const roleId = req.params.id;
    
    const [role] = await db.query('SELECT * FROM roles WHERE id = ?', [roleId]);
    if (role.length === 0) return res.status(404).json({ success: false, message: 'Role tidak ditemukan' });
    if (role[0].is_system && role[0].name === 'super_admin') {
      return res.status(400).json({ success: false, message: 'Tidak bisa edit permission Super Admin' });
    }

    await db.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    if (permission_ids && permission_ids.length > 0) {
      const values = permission_ids.map(pid => [roleId, pid]);
      await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
    }

    res.json({ success: true, message: 'Permissions updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE role
router.delete('/:id', auth, checkPermission('roles.manage'), async (req, res) => {
  try {
    const [role] = await db.query('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (role.length === 0) return res.status(404).json({ success: false, message: 'Role tidak ditemukan' });
    if (role[0].is_system) return res.status(400).json({ success: false, message: 'Tidak bisa hapus role sistem' });

    await db.query('DELETE FROM roles WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Role deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

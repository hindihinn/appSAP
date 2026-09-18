const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');

// GET all fuels (both active & historical)
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM fuels ORDER BY name, active_from DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching fuels:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET active fuels (current active price for each unique fuel name)
router.get('/active', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f1.* FROM fuels f1
      JOIN (
        SELECT name, MAX(active_from) as max_date 
        FROM fuels 
        WHERE active_from <= CURDATE() 
        GROUP BY name
      ) f2 ON f1.name = f2.name AND f1.active_from = f2.max_date
      ORDER BY f1.name
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching active fuels:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST add new fuel price
router.post('/', auth, checkPermission('vehicles.create'), async (req, res) => {
  try {
    const { name, type, price, active_from } = req.body;
    if (!name || !type || !price || !active_from) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }

    const [result] = await db.query(
      'INSERT INTO fuels (name, type, price, active_from) VALUES (?, ?, ?, ?)',
      [name, type, Number(price), active_from]
    );

    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Bahan Bakar berhasil ditambahkan' });
  } catch (error) {
    console.error('Error creating fuel:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update fuel price
router.put('/:id', auth, checkPermission('vehicles.edit'), async (req, res) => {
  try {
    const { name, type, price, active_from } = req.body;
    if (!name || !type || !price || !active_from) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }

    await db.query(
      'UPDATE fuels SET name = ?, type = ?, price = ?, active_from = ? WHERE id = ?',
      [name, type, Number(price), active_from, req.params.id]
    );

    res.json({ success: true, message: 'Bahan Bakar berhasil diupdate' });
  } catch (error) {
    console.error('Error updating fuel:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE fuel price entry
router.delete('/:id', auth, checkPermission('vehicles.edit'), async (req, res) => {
  try {
    await db.query('DELETE FROM fuels WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Bahan Bakar berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting fuel:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

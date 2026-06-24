const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');
const { upload, setUploadDir } = require('../middleware/upload');

router.get('/', auth, async (req, res) => {
  try {
    const { vehicle_id } = req.query;
    let query = `SELECT vk.*, v.nopol, v.merk, u.name as recorded_by_name FROM vehicle_km_logs vk 
                 JOIN vehicles v ON vk.vehicle_id = v.id LEFT JOIN users u ON vk.recorded_by = u.id WHERE 1=1`;
    const params = [];
    if (vehicle_id) { query += ' AND vk.vehicle_id = ?'; params.push(vehicle_id); }
    query += ' ORDER BY vk.recorded_date DESC, vk.id DESC LIMIT 100';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/monitoring', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT v.id, v.nopol, v.merk, v.model, v.current_km,
              (SELECT km_reading FROM vehicle_km_logs WHERE vehicle_id = v.id ORDER BY recorded_date DESC LIMIT 1) as last_km,
              (SELECT recorded_date FROM vehicle_km_logs WHERE vehicle_id = v.id ORDER BY recorded_date DESC LIMIT 1) as last_recorded
       FROM vehicles v WHERE v.is_active = 1 ORDER BY v.nopol`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', auth, setUploadDir('km'), upload.single('photo'), async (req, res) => {
  try {
    const { vehicle_id, km_reading, recorded_date, source, trip_id, notes } = req.body;
    const photo = req.file ? `/uploads/km/${req.file.filename}` : null;
    const [vehicle] = await db.query('SELECT current_km FROM vehicles WHERE id = ?', [vehicle_id]);
    const previous_km = vehicle.length > 0 ? vehicle[0].current_km : 0;

    const [result] = await db.query(
      `INSERT INTO vehicle_km_logs (vehicle_id, km_reading, previous_km, recorded_date, recorded_by, photo, source, trip_id, notes) VALUES (?,?,?,?,?,?,?,?,?)`,
      [vehicle_id, km_reading, previous_km, recorded_date || new Date(), req.user.id, photo, source || 'manual', trip_id, notes]
    );
    await db.query('UPDATE vehicles SET current_km = ? WHERE id = ? AND ? > current_km', [km_reading, vehicle_id, km_reading]);
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

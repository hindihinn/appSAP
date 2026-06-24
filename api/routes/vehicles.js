const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');
const { upload, setUploadDir } = require('../middleware/upload');

// Multi-photo upload fields
const vehiclePhotos = upload.fields([
  { name: 'photo_front', maxCount: 1 },
  { name: 'photo_back', maxCount: 1 },
  { name: 'photo_left', maxCount: 1 },
  { name: 'photo_right', maxCount: 1 },
]);

router.get('/', auth, async (req, res) => {
  try {
    const { status, unit_id, type, search } = req.query;
    let query = `SELECT v.*, u.name as unit_name, c.name as company_name, c.id as company_id 
                 FROM vehicles v LEFT JOIN units u ON v.unit_id = u.id 
                 LEFT JOIN companies c ON u.company_id = c.id WHERE v.is_active = 1`;
    const params = [];
    if (status) { query += ' AND v.status = ?'; params.push(status); }
    if (unit_id) { query += ' AND v.unit_id = ?'; params.push(unit_id); }
    if (type) { query += ' AND v.type = ?'; params.push(type); }
    if (search) { query += ' AND (v.nopol LIKE ? OR v.merk LIKE ? OR v.model LIKE ? OR v.vehicle_code LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`); }
    query += ' ORDER BY v.nopol';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/stats/summary', auth, async (req, res) => {
  try {
    const [total] = await db.query('SELECT COUNT(*) as count FROM vehicles WHERE is_active=1');
    const [byStatus] = await db.query('SELECT status, COUNT(*) as count FROM vehicles WHERE is_active=1 GROUP BY status');
    const [byType] = await db.query('SELECT type, COUNT(*) as count FROM vehicles WHERE is_active=1 GROUP BY type');
    res.json({ success: true, data: { total: total[0].count, byStatus, byType } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT v.*, u.name as unit_name, c.name as company_name, c.id as company_id FROM vehicles v 
       LEFT JOIN units u ON v.unit_id = u.id LEFT JOIN companies c ON u.company_id = c.id WHERE v.id = ?`, [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Kendaraan tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/', auth, checkPermission('vehicles.create'), setUploadDir('vehicles'), vehiclePhotos, async (req, res) => {
  try {
    const { unit_id, vehicle_code, nopol, merk, model, type, year, color, chassis_number, engine_number, capacity_ton, fuel_type, current_km, ownership, notes } = req.body;
    const photo_front = req.files?.photo_front?.[0] ? `/uploads/vehicles/${req.files.photo_front[0].filename}` : null;
    const photo_back = req.files?.photo_back?.[0] ? `/uploads/vehicles/${req.files.photo_back[0].filename}` : null;
    const photo_left = req.files?.photo_left?.[0] ? `/uploads/vehicles/${req.files.photo_left[0].filename}` : null;
    const photo_right = req.files?.photo_right?.[0] ? `/uploads/vehicles/${req.files.photo_right[0].filename}` : null;
    const vCode = vehicle_code && vehicle_code.trim() !== '' ? vehicle_code.trim() : null;
    const [result] = await db.query(
      `INSERT INTO vehicles (unit_id, vehicle_code, nopol, merk, model, type, year, color, chassis_number, engine_number, capacity_ton, fuel_type, photo_front, photo_back, photo_left, photo_right, current_km, ownership, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [unit_id||null, vCode, nopol, merk, model, type||'truck', year||null, color, chassis_number, engine_number, capacity_ton||null, fuel_type||'solar', photo_front, photo_back, photo_left, photo_right, current_km||0, ownership||'owned', notes]
    );
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Berhasil ditambahkan' });
  } catch (error) {
    console.error('Vehicle create error:', error.message);
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Nopol atau Kode Kendaraan sudah terdaftar' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', auth, checkPermission('vehicles.edit'), setUploadDir('vehicles'), vehiclePhotos, async (req, res) => {
  try {
    const { unit_id, vehicle_code, nopol, merk, model, type, year, color, chassis_number, engine_number, capacity_ton, fuel_type, current_km, status, ownership, notes } = req.body;
    const photo_front = req.files?.photo_front?.[0] ? `/uploads/vehicles/${req.files.photo_front[0].filename}` : undefined;
    const photo_back = req.files?.photo_back?.[0] ? `/uploads/vehicles/${req.files.photo_back[0].filename}` : undefined;
    const photo_left = req.files?.photo_left?.[0] ? `/uploads/vehicles/${req.files.photo_left[0].filename}` : undefined;
    const photo_right = req.files?.photo_right?.[0] ? `/uploads/vehicles/${req.files.photo_right[0].filename}` : undefined;
    const vCode = vehicle_code && vehicle_code.trim() !== '' ? vehicle_code.trim() : null;
    
    let query = `UPDATE vehicles SET unit_id=?, vehicle_code=?, nopol=?, merk=?, model=?, type=?, year=?, color=?, chassis_number=?, engine_number=?, capacity_ton=?, fuel_type=?, current_km=?, status=?, ownership=?, notes=?`;
    const params = [unit_id||null, vCode, nopol, merk, model, type, year||null, color, chassis_number, engine_number, capacity_ton||null, fuel_type, current_km, status, ownership, notes];
    
    if (photo_front) { query += ', photo_front=?'; params.push(photo_front); }
    if (photo_back) { query += ', photo_back=?'; params.push(photo_back); }
    if (photo_left) { query += ', photo_left=?'; params.push(photo_left); }
    if (photo_right) { query += ', photo_right=?'; params.push(photo_right); }
    
    query += ' WHERE id=?'; params.push(req.params.id);
    await db.query(query, params);
    res.json({ success: true, message: 'Berhasil diupdate' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.delete('/:id', auth, checkPermission('vehicles.delete'), async (req, res) => {
  try {
    await db.query('UPDATE vehicles SET is_active=0 WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Berhasil dihapus' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;

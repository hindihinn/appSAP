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

// POST /backfill-trips — import historical KM readings from trip_checkpoints into vehicle_km_logs
// Skips entries that are already logged (deduplication by trip_id + km_reading + vehicle_id)
router.post('/backfill-trips', auth, async (req, res) => {
  try {
    // Get all trip checkpoints that have a km_reading and a linked vehicle
    const [checkpoints] = await db.query(`
      SELECT tc.id, tc.trip_id, tc.type, tc.km_reading, tc.photo_km, tc.created_at,
             t.vehicle_id, t.driver_id,
             COALESCE(d.user_id, t.driver_id) as recorder_id
      FROM trip_checkpoints tc
      JOIN trip_orders t ON tc.trip_id = t.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      WHERE tc.km_reading IS NOT NULL AND tc.km_reading > 0 AND t.vehicle_id IS NOT NULL
      ORDER BY t.vehicle_id, tc.recorded_at ASC
    `);

    const labels = {
      departure: 'Mulai Keberangkatan (Dinas)',
      arrival: 'Sampai di Tujuan (Dinas)',
      unloading: 'Mulai Bongkar (Dinas)',
      extend_unloading: 'Bongkar Tambahan (Dinas)',
      return_departure: 'Mulai Kepulangan (Dinas)',
      return_arrival: 'Sampai di Kantor (Dinas)',
      incident: 'Insiden / Kendala (Dinas)',
    };

    let inserted = 0;
    let skipped = 0;

    for (const cp of checkpoints) {
      // Check if this checkpoint is already logged
      const [existing] = await db.query(
        `SELECT id FROM vehicle_km_logs WHERE trip_id = ? AND km_reading = ? AND vehicle_id = ? AND source = 'trip' LIMIT 1`,
        [cp.trip_id, cp.km_reading, cp.vehicle_id]
      );
      if (existing.length > 0) { skipped++; continue; }

      // Get previous KM from the last log for this vehicle before this timestamp
      const [prevLogs] = await db.query(
        `SELECT km_reading FROM vehicle_km_logs WHERE vehicle_id = ? AND recorded_date < ? ORDER BY recorded_date DESC, id DESC LIMIT 1`,
        [cp.vehicle_id, cp.created_at || new Date()]
      );
      const prevKm = prevLogs.length > 0 ? prevLogs[0].km_reading : 0;

      const stepLabel = labels[cp.type] || `Checkpoint ${cp.type} (Dinas)`;

      await db.query(
        `INSERT INTO vehicle_km_logs (vehicle_id, km_reading, previous_km, recorded_date, recorded_by, photo, source, trip_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, 'trip', ?, ?)`,
        [
          cp.vehicle_id,
          cp.km_reading,
          prevKm,
          cp.created_at || new Date(),
          cp.recorder_id || null,
          cp.photo_km || null,
          cp.trip_id,
          stepLabel
        ]
      );
      inserted++;
    }

    res.json({ success: true, message: `Backfill selesai. ${inserted} entri ditambahkan, ${skipped} sudah ada.`, inserted, skipped });
  } catch (error) {
    console.error('Backfill trips error:', error);
    res.status(500).json({ success: false, message: 'Server error', detail: error.message });
  }
});

// POST /backfill-services — import historical KM readings from service_order_checkpoints into vehicle_km_logs
router.post('/backfill-services', auth, async (req, res) => {
  try {
    const [checkpoints] = await db.query(`
      SELECT soc.id, soc.work_order_id, soc.type, soc.km_reading, soc.photo_km, soc.created_at,
             wo.vehicle_id, wo.assigned_to as recorder_id
      FROM service_order_checkpoints soc
      JOIN work_orders wo ON soc.work_order_id = wo.id
      WHERE soc.km_reading IS NOT NULL AND soc.km_reading > 0 AND wo.vehicle_id IS NOT NULL
      ORDER BY wo.vehicle_id, soc.created_at ASC
    `);

    const labels = {
      start_to_workshop: 'Mulai Menuju Bengkel (WO)',
      arrive_at_workshop: 'Sampai di Bengkel (WO)',
      return_to_office: 'Sampai di Kantor (WO)',
    };

    let inserted = 0;
    let skipped = 0;

    for (const cp of checkpoints) {
      // Deduplicate: skip if already exists for this work_order + km + vehicle
      const [existing] = await db.query(
        `SELECT id FROM vehicle_km_logs WHERE notes LIKE ? AND km_reading = ? AND vehicle_id = ? AND source = 'service' LIMIT 1`,
        [`%(WO)%`, cp.km_reading, cp.vehicle_id]
      );
      if (existing.length > 0) { skipped++; continue; }

      const [prevLogs] = await db.query(
        `SELECT km_reading FROM vehicle_km_logs WHERE vehicle_id = ? AND recorded_date < ? ORDER BY recorded_date DESC, id DESC LIMIT 1`,
        [cp.vehicle_id, cp.created_at || new Date()]
      );
      const prevKm = prevLogs.length > 0 ? prevLogs[0].km_reading : 0;

      const stepLabel = labels[cp.type] || `Checkpoint ${cp.type} (WO)`;

      await db.query(
        `INSERT INTO vehicle_km_logs (vehicle_id, km_reading, previous_km, recorded_date, recorded_by, photo, source, notes)
         VALUES (?, ?, ?, ?, ?, ?, 'service', ?)`,
        [
          cp.vehicle_id,
          cp.km_reading,
          prevKm,
          cp.created_at || new Date(),
          cp.recorder_id || null,
          cp.photo_km || null,
          stepLabel
        ]
      );
      inserted++;
    }

    res.json({ success: true, message: `Backfill service selesai. ${inserted} entri ditambahkan, ${skipped} sudah ada.`, inserted, skipped });
  } catch (error) {
    console.error('Backfill services error:', error);
    res.status(500).json({ success: false, message: 'Server error', detail: error.message });
  }
});

module.exports = router;

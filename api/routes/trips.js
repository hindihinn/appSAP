const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');
const { upload, setUploadDir } = require('../middleware/upload');

// Generate order number
const generateOrderNumber = async () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [rows] = await db.query(
    `SELECT COUNT(*) as cnt FROM trip_orders WHERE DATE(created_at) = CURDATE()`
  );
  const seq = String(rows[0].cnt + 1).padStart(4, '0');
  return `TRP-${date}-${seq}`;
};

// Generate SPD number: PJD-{PT_CODE}-{UNIT_CODE}-{YYYYMMDD}-{SEQ}
const generateSpdNumber = async (companyCode, unitCode) => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [rows] = await db.query(
    `SELECT COUNT(*) as cnt FROM trip_orders WHERE DATE(created_at) = CURDATE() AND spd_number IS NOT NULL`
  );
  const seq = String(rows[0].cnt + 1).padStart(3, '0');
  const pt = (companyCode || 'PT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const unit = (unitCode || 'UNIT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `PJD-${pt}-${unit}-${date}-${seq}`;
};

// GET all trips
router.get('/', auth, checkPermission('trips.view'), async (req, res) => {
  try {
    const { status, driver_id, vehicle_id, date_from, date_to } = req.query;
    let query = `SELECT t.*, v.nopol, v.merk, d.name as driver_name, 
                        req.name as requester_name, adm.name as admin_name, hrga.name as hrga_name,
                        c.name as company_name, c.code as company_code,
                        un.name as unit_name, un.code as unit_code,
                        dvs.name as division_name,
                        (SELECT COUNT(*) FROM trip_assignments ta WHERE ta.trip_id = t.id) as assignment_count
                 FROM trip_orders t
                 LEFT JOIN vehicles v ON t.vehicle_id = v.id
                 LEFT JOIN drivers d ON t.driver_id = d.id
                 LEFT JOIN users req ON t.requester_id = req.id
                 LEFT JOIN users adm ON t.admin_id = adm.id
                 LEFT JOIN users hrga ON t.hrga_id = hrga.id
                 LEFT JOIN companies c ON t.company_id = c.id
                 LEFT JOIN units un ON t.unit_id = un.id
                 LEFT JOIN divisions dvs ON t.division_id = dvs.id
                 WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND t.status = ?'; params.push(status); }
    if (driver_id) {
      const [driverRows] = await db.query('SELECT id FROM drivers WHERE id = ? OR user_id = ?', [driver_id, driver_id]);
      if (driverRows.length > 0) {
        const ids = driverRows.map(r => r.id);
        query += ` AND t.driver_id IN (${ids.map(() => '?').join(',')})`;
        params.push(...ids);
      } else {
        query += ' AND t.driver_id = ?';
        params.push(driver_id);
      }
    }
    if (vehicle_id) { query += ' AND t.vehicle_id = ?'; params.push(vehicle_id); }
    if (date_from) { query += ' AND t.planned_departure >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND t.planned_departure <= ?'; params.push(date_to); }
    query += ' ORDER BY t.created_at DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET monitoring (active trips) - MUST be before /:id
router.get('/status/monitoring', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, v.nopol, d.name as driver_name, d.phone as driver_phone,
              (SELECT COUNT(*) FROM trip_checkpoints WHERE trip_id = t.id) as checkpoint_count,
              (SELECT COUNT(*) FROM trip_events WHERE trip_id = t.id) as event_count
       FROM trip_orders t LEFT JOIN vehicles v ON t.vehicle_id = v.id LEFT JOIN drivers d ON t.driver_id = d.id
       WHERE t.status IN ('approved','in_progress') ORDER BY t.planned_departure`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET trip by ID with checkpoints and events
router.get('/:id', auth, async (req, res) => {
  try {
    const [trips] = await db.query(
      `SELECT t.*, v.nopol, v.merk, d.name as driver_name, d.phone as driver_phone,
              req.name as requester_name, c.name as company_name, un.name as unit_name
       FROM trip_orders t 
       LEFT JOIN vehicles v ON t.vehicle_id = v.id 
       LEFT JOIN drivers d ON t.driver_id = d.id
       LEFT JOIN users req ON t.requester_id = req.id 
       LEFT JOIN companies c ON t.company_id = c.id
       LEFT JOIN units un ON t.unit_id = un.id
       WHERE t.id = ?`, [req.params.id]
    );
    if (trips.length === 0) return res.status(404).json({ success: false, message: 'Trip tidak ditemukan' });

    const [checkpoints] = await db.query('SELECT * FROM trip_checkpoints WHERE trip_id = ? ORDER BY sequence_number', [req.params.id]);
    const [events] = await db.query('SELECT * FROM trip_events WHERE trip_id = ? ORDER BY created_at', [req.params.id]);

    res.json({ success: true, data: { ...trips[0], checkpoints, events } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create trip (from gudang)
router.post('/', auth, checkPermission('trips.create'), async (req, res) => {
  try {
    const order_number = await generateOrderNumber();
    const { company_id, unit_id, division_id, destination, destination_address, purpose, items_description, planned_departure, planned_return } = req.body;
    const [result] = await db.query(
      `INSERT INTO trip_orders (order_number, requester_id, company_id, unit_id, division_id, destination, destination_address, purpose, items_description, planned_departure, planned_return, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [order_number, req.user.id, company_id, unit_id, division_id, destination, destination_address, purpose, items_description, planned_departure, planned_return, 'pending']
    );
    res.status(201).json({ success: true, data: { id: result.insertId, order_number } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create-dinas: Admin buat SPD + assign multi driver/kendaraan
router.post('/:id/create-dinas', auth, checkPermission('trips.approve_admin'), async (req, res) => {
  try {
    const { admin_notes, assignments } = req.body;
    // assignments = [{ vehicle_id, driver_id, unit_id, notes }, ...]
    if (!assignments || assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal 1 assignment driver & kendaraan diperlukan' });
    }

    // Get trip info for SPD number generation
    const [trips] = await db.query(
      `SELECT t.*, c.code as company_code, un.code as unit_code
       FROM trip_orders t
       LEFT JOIN companies c ON t.company_id = c.id
       LEFT JOIN units un ON t.unit_id = un.id
       WHERE t.id = ? AND t.status = 'pending'`, [req.params.id]
    );
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip tidak ditemukan atau sudah diproses' });
    }
    const trip = trips[0];

    // Generate SPD number
    const spd_number = await generateSpdNumber(trip.company_code, trip.unit_code);

    // Update trip_orders
    const firstAssignment = assignments[0];
    await db.query(
      `UPDATE trip_orders SET
        spd_number=?, status='admin_review',
        vehicle_id=?, driver_id=?,
        admin_notes=?, admin_id=?, admin_reviewed_at=NOW()
       WHERE id=?`,
      [spd_number, firstAssignment.vehicle_id, firstAssignment.driver_id,
       admin_notes, req.user.id, req.params.id]
    );

    // Insert all assignments
    await db.query('DELETE FROM trip_assignments WHERE trip_id = ?', [req.params.id]);
    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      await db.query(
        `INSERT INTO trip_assignments (trip_id, vehicle_id, driver_id, unit_id, sequence_no, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.params.id, a.vehicle_id, a.driver_id, a.unit_id || null, i + 1, a.notes || null]
      );
    }

    res.json({ success: true, data: { spd_number }, message: 'SPD berhasil dibuat dan dikirim ke HRGA' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET trip assignments (multi-driver list)
router.get('/:id/assignments', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ta.*, d.name as driver_name, d.phone as driver_phone, d.employee_id,
              v.nopol, v.merk, v.model, un.name as unit_name
       FROM trip_assignments ta
       LEFT JOIN drivers d ON ta.driver_id = d.id
       LEFT JOIN vehicles v ON ta.vehicle_id = v.id
       LEFT JOIN units un ON ta.unit_id = un.id
       WHERE ta.trip_id = ? ORDER BY ta.sequence_no`, [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT admin review - select vehicle & driver (legacy / fallback)
router.put('/:id/admin-review', auth, checkPermission('trips.approve_admin'), async (req, res) => {
  try {
    const { vehicle_id, driver_id, admin_notes, action } = req.body;
    if (action === 'reject') {
      await db.query(`UPDATE trip_orders SET status='rejected', rejection_reason=?, admin_id=?, admin_reviewed_at=NOW() WHERE id=?`,
        [admin_notes, req.user.id, req.params.id]);
    } else {
      let finalDriverId = driver_id;
      if (!finalDriverId && vehicle_id) {
        const [assignment] = await db.query(
          `SELECT driver_id FROM driver_assignments WHERE vehicle_id = ? AND status = 'active' LIMIT 1`, [vehicle_id]
        );
        if (assignment.length > 0) finalDriverId = assignment[0].driver_id;
      }
      await db.query(
        `UPDATE trip_orders SET status='admin_review', vehicle_id=?, driver_id=?, admin_notes=?, admin_id=?, admin_reviewed_at=NOW() WHERE id=?`,
        [vehicle_id, finalDriverId, admin_notes, req.user.id, req.params.id]
      );
    }
    res.json({ success: true, message: action === 'reject' ? 'Trip rejected' : 'Submitted to HRGA' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT HRGA approve/reject SPD
router.put('/:id/hrga-approve', auth, checkPermission('trips.approve_hrga'), async (req, res) => {
  try {
    const { hrga_notes, action } = req.body;
    if (action === 'reject') {
      await db.query(
        `UPDATE trip_orders SET status='rejected', rejection_reason=?, hrga_id=?, hrga_reviewed_at=NOW() WHERE id=?`,
        [hrga_notes, req.user.id, req.params.id]
      );
    } else {
      await db.query(
        `UPDATE trip_orders SET status='approved', hrga_notes=?, hrga_id=?, hrga_reviewed_at=NOW() WHERE id=?`,
        [hrga_notes, req.user.id, req.params.id]
      );
    }
    res.json({ success: true, message: action === 'reject' ? 'SPD ditolak' : 'SPD disetujui' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT HRGA review (legacy)
router.put('/:id/hrga-review', auth, checkPermission('trips.approve_hrga'), async (req, res) => {
  try {
    const { vehicle_id, driver_id, hrga_notes, action } = req.body;
    if (action === 'reject') {
      await db.query(`UPDATE trip_orders SET status='rejected', rejection_reason=?, hrga_id=?, hrga_reviewed_at=NOW() WHERE id=?`,
        [hrga_notes, req.user.id, req.params.id]);
    } else {
      let query = `UPDATE trip_orders SET status='approved', hrga_notes=?, hrga_id=?, hrga_reviewed_at=NOW()`;
      const params = [hrga_notes, req.user.id];
      if (vehicle_id) { query += ', vehicle_id=?'; params.push(vehicle_id); }
      if (driver_id) { query += ', driver_id=?'; params.push(driver_id); }
      query += ' WHERE id=?'; params.push(req.params.id);
      await db.query(query, params);
    }
    res.json({ success: true, message: action === 'reject' ? 'Trip rejected' : 'Trip approved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT start trip
router.put('/:id/start', auth, async (req, res) => {
  try {
    await db.query(`UPDATE trip_orders SET status='in_progress', actual_departure=NOW() WHERE id=?`, [req.params.id]);
    // Update driver & vehicle status
    const [trip] = await db.query('SELECT driver_id, vehicle_id FROM trip_orders WHERE id=?', [req.params.id]);
    if (trip.length > 0) {
      if (trip[0].driver_id) await db.query(`UPDATE drivers SET status='on_duty' WHERE id=?`, [trip[0].driver_id]);
      if (trip[0].vehicle_id) await db.query(`UPDATE vehicles SET status='in_use' WHERE id=?`, [trip[0].vehicle_id]);
    }
    res.json({ success: true, message: 'Trip started' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT complete trip
router.put('/:id/complete', auth, async (req, res) => {
  try {
    await db.query(`UPDATE trip_orders SET status='completed', actual_return=NOW() WHERE id=?`, [req.params.id]);
    const [trip] = await db.query('SELECT driver_id, vehicle_id, departure_km, arrival_km FROM trip_orders WHERE id=?', [req.params.id]);
    if (trip.length > 0) {
      if (trip[0].driver_id) await db.query(`UPDATE drivers SET status='available' WHERE id=?`, [trip[0].driver_id]);
      if (trip[0].vehicle_id) await db.query(`UPDATE vehicles SET status='available' WHERE id=?`, [trip[0].vehicle_id]);
    }
    res.json({ success: true, message: 'Trip completed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST add checkpoint
router.post('/:id/checkpoints', auth, setUploadDir('trips'), upload.fields([
  { name: 'photo_km', maxCount: 1 }, { name: 'photo_nota', maxCount: 1 },
  { name: 'photo_pump', maxCount: 1 }, { name: 'photo_activity', maxCount: 1 }
]), async (req, res) => {
  try {
    const { type, km_reading, latitude, longitude, address, location_accuracy, fuel_liters, fuel_cost, notes } = req.body;
    const [seqResult] = await db.query('SELECT COALESCE(MAX(sequence_number),0)+1 as seq FROM trip_checkpoints WHERE trip_id=?', [req.params.id]);
    
    const files = req.files || {};
    const getPath = (field) => files[field] ? `/uploads/trips/${files[field][0].filename}` : null;

    const [result] = await db.query(
      `INSERT INTO trip_checkpoints (trip_id, sequence_number, type, km_reading, latitude, longitude, address, location_accuracy, photo_km, photo_nota, photo_pump, photo_activity, fuel_liters, fuel_cost, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [req.params.id, seqResult[0].seq, type, km_reading, latitude, longitude, address, location_accuracy,
       getPath('photo_km'), getPath('photo_nota'), getPath('photo_pump'), getPath('photo_activity'),
       fuel_liters, fuel_cost, notes]
    );

    // Update trip KM
    if (type === 'departure') await db.query('UPDATE trip_orders SET departure_km=? WHERE id=?', [km_reading, req.params.id]);
    if (type === 'arrival' || type === 'unloading') await db.query('UPDATE trip_orders SET arrival_km=? WHERE id=?', [km_reading, req.params.id]);
    if (type === 'return_arrival') {
      await db.query('UPDATE trip_orders SET return_km=?, total_distance=?-departure_km WHERE id=?', [km_reading, km_reading, req.params.id]);
    }
    // Update vehicle KM
    const [trip] = await db.query('SELECT vehicle_id FROM trip_orders WHERE id=?', [req.params.id]);
    if (trip.length > 0 && trip[0].vehicle_id) {
      await db.query('UPDATE vehicles SET current_km=? WHERE id=? AND ?> current_km', [km_reading, trip[0].vehicle_id, km_reading]);
    }

    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST add event
router.post('/:id/events', auth, setUploadDir('trips/events'), upload.single('photo'), async (req, res) => {
  try {
    const { checkpoint_id, event_type, title, description, severity, latitude, longitude } = req.body;
    const photo = req.file ? `/uploads/trips/events/${req.file.filename}` : null;
    const [result] = await db.query(
      `INSERT INTO trip_events (trip_id, checkpoint_id, event_type, title, description, severity, photo, latitude, longitude) VALUES (?,?,?,?,?,?,?,?,?)`,
      [req.params.id, checkpoint_id, event_type, title, description, severity || 'medium', photo, latitude, longitude]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// (monitoring route moved to top, above /:id)

module.exports = router;

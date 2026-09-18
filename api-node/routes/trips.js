const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');
const { upload, setUploadDir } = require('../middleware/upload');

// Generate order number: TRP-{SEQ}/{MM}/{YYYY}-{PT}-{UNIT}
const generateOrderNumber = async (companyCode, unitCode) => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const [rows] = await db.query(
    `SELECT COUNT(*) as cnt FROM trip_orders WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`
  );
  const seq = String(rows[0].cnt + 1).padStart(2, '0');
  const pt = (companyCode || 'PT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const unit = (unitCode || 'UNIT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `TRP-${seq}/${mm}/${yyyy}-${pt}-${unit}`;
};

// Generate DN number: DN-{SEQ}/{MM}/{YYYY}-{PT}-{UNIT}
// Contoh: DN-01/06/2026-SAP-SAHO
const generateSpdNumber = async (companyCode, unitCode) => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const [rows] = await db.query(
    `SELECT COUNT(*) as cnt FROM trip_orders WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) AND spd_number IS NOT NULL`
  );
  const seq = String(rows[0].cnt + 1).padStart(2, '0');
  const pt = (companyCode || 'PT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const unit = (unitCode || 'UNIT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `DN-${seq}/${mm}/${yyyy}-${pt}-${unit}`;
};

// GET all trips
router.get('/', auth, checkPermission('trips.view'), async (req, res) => {
  try {
    const { status, driver_id, vehicle_id, date_from, date_to, requester_id } = req.query;
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
    if (requester_id) { query += ' AND t.requester_id = ?'; params.push(requester_id); }
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
              req.name as requester_name, c.name as company_name, un.name as unit_name,
              ext_c.name as extend_company_name, ext_un.name as extend_unit_name,
              (SELECT price FROM fuels WHERE name = v.fuel_type AND active_from <= CURDATE() ORDER BY active_from DESC LIMIT 1) as fuel_price_per_liter
       FROM trip_orders t 
       LEFT JOIN vehicles v ON t.vehicle_id = v.id 
       LEFT JOIN drivers d ON t.driver_id = d.id
       LEFT JOIN users req ON t.requester_id = req.id 
       LEFT JOIN companies c ON t.company_id = c.id
       LEFT JOIN units un ON t.unit_id = un.id
       LEFT JOIN companies ext_c ON t.extend_company_id = ext_c.id
       LEFT JOIN units ext_un ON t.extend_unit_id = ext_un.id
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
    const { company_id, unit_id, division_id, destination, destination_address, purpose, items_description, planned_departure, planned_return } = req.body;
    
    let companyCode = 'PT';
    let unitCode = 'UNIT';
    if (company_id) {
      const [compRows] = await db.query('SELECT code FROM companies WHERE id = ?', [company_id]);
      if (compRows.length > 0) companyCode = compRows[0].code;
    }
    if (unit_id) {
      const [unitRows] = await db.query('SELECT code FROM units WHERE id = ?', [unit_id]);
      if (unitRows.length > 0) unitCode = unitRows[0].code;
    }

    const order_number = await generateOrderNumber(companyCode, unitCode);
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

// PUT withdraw order (by requester when status is pending)
router.put('/:id/withdraw', auth, async (req, res) => {
  try {
    const [trips] = await db.query(
      `SELECT id, status, requester_id FROM trip_orders WHERE id = ?`, [req.params.id]
    );

    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    const trip = trips[0];
    if (trip.requester_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk menarik order ini' });
    }

    if (trip.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Hanya order yang berstatus PENDING yang dapat ditarik' });
    }

    await db.query(
      `UPDATE trip_orders SET status='cancelled', hrga_notes='Ditarik oleh pembuat order' WHERE id=?`,
      [req.params.id]
    );

    res.json({ success: true, message: 'Order berhasil ditarik' });
  } catch (error) {
    console.error('Error withdrawing order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT admin-pre-review: Admin review order awal (pending → admin_review), belum assign driver
router.put('/:id/admin-pre-review', auth, checkPermission('trips.approve_admin'), async (req, res) => {
  try {
    const { admin_notes, action } = req.body;
    const [trips] = await db.query(
      `SELECT id FROM trip_orders WHERE id = ? AND status = 'pending'`, [req.params.id]
    );
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan atau bukan status pending' });
    }
    if (action === 'reject') {
      await db.query(
        `UPDATE trip_orders SET status='rejected', rejection_reason=?, admin_id=?, admin_reviewed_at=NOW() WHERE id=?`,
        [admin_notes, req.user.id, req.params.id]
      );
      return res.json({ success: true, message: 'Order ditolak' });
    }
    await db.query(
      `UPDATE trip_orders SET status='admin_review', admin_notes=?, admin_id=?, admin_reviewed_at=NOW() WHERE id=?`,
      [admin_notes, req.user.id, req.params.id]
    );
    res.json({ success: true, message: 'Order disetujui, siap untuk dibuat Surat Dinas' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create-dinas: Admin buat Surat DN + assign multi driver/kendaraan (hanya dari status admin_review)
router.post('/:id/create-dinas', auth, checkPermission('trips.approve_admin'), async (req, res) => {
  try {
    const { admin_notes, assignments } = req.body;
    // assignments = [{ vehicle_id, driver_id, unit_id, notes }, ...]
    if (!assignments || assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal 1 assignment driver & kendaraan diperlukan' });
    }

    // Hanya proses order yang sudah di-review admin (status: admin_review)
    const [trips] = await db.query(
      `SELECT t.*, c.code as company_code, un.code as unit_code
       FROM trip_orders t
       LEFT JOIN companies c ON t.company_id = c.id
       LEFT JOIN units un ON t.unit_id = un.id
       WHERE t.id = ? AND t.status = 'admin_review'`, [req.params.id]
    );
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan atau belum di-review admin' });
    }
    const trip = trips[0];

    // Generate nomor DN: DN-{seq}/{MM}/{YYYY}-{PT}-{UNIT}
    const spd_number = await generateSpdNumber(trip.company_code, trip.unit_code);

    // Update trip_orders — set status waiting_hrga (menunggu approval HRGA)
    const firstAssignment = assignments[0];
    await db.query(
      `UPDATE trip_orders SET
        spd_number=?, status='waiting_hrga',
        vehicle_id=?, driver_id=?,
        admin_notes=?, admin_id=?, admin_reviewed_at=NOW()
       WHERE id=?`,
      [spd_number, firstAssignment.vehicle_id, firstAssignment.driver_id,
       admin_notes, req.user.id, req.params.id]
    );

    // Insert semua assignment driver/kendaraan
    await db.query('DELETE FROM trip_assignments WHERE trip_id = ?', [req.params.id]);
    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      await db.query(
        `INSERT INTO trip_assignments (trip_id, vehicle_id, driver_id, unit_id, sequence_no, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.params.id, a.vehicle_id, a.driver_id, a.unit_id || null, i + 1, a.notes || null]
      );
    }

    res.json({ success: true, data: { spd_number }, message: `Surat Dinas ${spd_number} berhasil dibuat dan dikirim ke HRGA untuk persetujuan` });
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

// PUT HRGA approve/reject Surat Dinas (dari status waiting_hrga)
router.put('/:id/hrga-approve', auth, checkPermission('trips.approve_hrga'), async (req, res) => {
  try {
    const { hrga_notes, action } = req.body;
    // Pastikan order dalam status waiting_hrga atau admin_review (kompatibilitas lama)
    const [trips] = await db.query(
      `SELECT id, spd_number, status FROM trip_orders WHERE id = ? AND status IN ('waiting_hrga','admin_review')`,
      [req.params.id]
    );
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Surat Dinas tidak ditemukan atau sudah diproses' });
    }
    if (action === 'reject') {
      await db.query(
        `UPDATE trip_orders SET status='rejected', rejection_reason=?, hrga_id=?, hrga_reviewed_at=NOW() WHERE id=?`,
        [hrga_notes, req.user.id, req.params.id]
      );
      return res.json({ success: true, message: 'Surat Dinas ditolak oleh HRGA' });
    }
    await db.query(
      `UPDATE trip_orders SET status='approved', hrga_notes=?, hrga_id=?, hrga_reviewed_at=NOW() WHERE id=?`,
      [hrga_notes, req.user.id, req.params.id]
    );

    // Update driver & vehicle status to on_duty & in_use
    const [tripRows] = await db.query('SELECT driver_id, vehicle_id FROM trip_orders WHERE id=?', [req.params.id]);
    if (tripRows.length > 0) {
      const trip = tripRows[0];
      if (trip.driver_id) await db.query(`UPDATE drivers SET status='on_duty' WHERE id=?`, [trip.driver_id]);
      if (trip.vehicle_id) await db.query(`UPDATE vehicles SET status='in_use' WHERE id=?`, [trip.vehicle_id]);
    }
    const [assignments] = await db.query('SELECT driver_id, vehicle_id FROM trip_assignments WHERE trip_id=?', [req.params.id]);
    for (const a of assignments) {
      if (a.driver_id) await db.query(`UPDATE drivers SET status='on_duty' WHERE id=?`, [a.driver_id]);
      if (a.vehicle_id) await db.query(`UPDATE vehicles SET status='in_use' WHERE id=?`, [a.vehicle_id]);
    }

    res.json({ success: true, message: `Surat Dinas ${trips[0].spd_number} disetujui — Dinas sekarang AKTIF` });
  } catch (error) {
    console.error(error);
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

      // Update driver & vehicle status to on_duty & in_use
      const [tripRows] = await db.query('SELECT driver_id, vehicle_id FROM trip_orders WHERE id=?', [req.params.id]);
      if (tripRows.length > 0) {
        const trip = tripRows[0];
        if (trip.driver_id) await db.query(`UPDATE drivers SET status='on_duty' WHERE id=?`, [trip.driver_id]);
        if (trip.vehicle_id) await db.query(`UPDATE vehicles SET status='in_use' WHERE id=?`, [trip.vehicle_id]);
      }
      const [assignments] = await db.query('SELECT driver_id, vehicle_id FROM trip_assignments WHERE trip_id=?', [req.params.id]);
      for (const a of assignments) {
        if (a.driver_id) await db.query(`UPDATE drivers SET status='on_duty' WHERE id=?`, [a.driver_id]);
        if (a.vehicle_id) await db.query(`UPDATE vehicles SET status='in_use' WHERE id=?`, [a.vehicle_id]);
      }
    }
    res.json({ success: true, message: action === 'reject' ? 'Trip rejected' : 'Trip approved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT cancel trip (HRGA membatalkan dinas aktif)
router.put('/:id/cancel', auth, checkPermission('trips.approve_hrga'), async (req, res) => {
  try {
    const { cancel_reason } = req.body;
    const [trips] = await db.query(
      `SELECT id, status, vehicle_id, driver_id, spd_number FROM trip_orders WHERE id = ?`, [req.params.id]
    );

    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Surat Dinas tidak ditemukan' });
    }

    const trip = trips[0];
    if (!['approved', 'in_progress'].includes(trip.status)) {
      return res.status(400).json({ success: false, message: 'Hanya Surat Dinas dengan status Disetujui (approved) atau Sedang Berjalan (in_progress) yang dapat dibatalkan' });
    }

    // Update status trip order ke 'cancelled'
    const cancelNotes = cancel_reason ? `Dibatalkan HRGA: ${cancel_reason}` : 'Dibatalkan oleh HRGA';
    await db.query(
      `UPDATE trip_orders SET status='cancelled', hrga_notes=?, hrga_id=?, hrga_reviewed_at=NOW() WHERE id=?`,
      [cancelNotes, req.user.id, req.params.id]
    );

    // Reset status primary driver & vehicle
    if (trip.driver_id) {
      await db.query(`UPDATE drivers SET status='available' WHERE id=?`, [trip.driver_id]);
    }
    if (trip.vehicle_id) {
      await db.query(`UPDATE vehicles SET status='available' WHERE id=?`, [trip.vehicle_id]);
    }

    // Reset status assigned drivers & vehicles from trip_assignments
    const [assignments] = await db.query('SELECT driver_id, vehicle_id FROM trip_assignments WHERE trip_id=?', [req.params.id]);
    for (const a of assignments) {
      if (a.driver_id) {
        await db.query(`UPDATE drivers SET status='available' WHERE id=?`, [a.driver_id]);
      }
      if (a.vehicle_id) {
        await db.query(`UPDATE vehicles SET status='available' WHERE id=?`, [a.vehicle_id]);
      }
    }

    res.json({ success: true, message: `Surat Dinas ${trip.spd_number || ''} berhasil dibatalkan` });
  } catch (error) {
    console.error('Error cancelling trip:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT extend trip
router.put('/:id/extend', auth, checkPermission('trips.approve_hrga', 'trips.approve_admin'), async (req, res) => {
  try {
    const { company_id, unit_id, destination, purpose, notes } = req.body;
    
    if (!company_id || !unit_id || !destination) {
      return res.status(400).json({ success: false, message: 'Perusahaan, unit, dan tujuan wajib diisi' });
    }

    const [trips] = await db.query(
      `SELECT id, status FROM trip_orders WHERE id = ?`, [req.params.id]
    );

    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Perjalanan tidak ditemukan' });
    }

    const trip = trips[0];
    if (!['approved', 'in_progress'].includes(trip.status)) {
      return res.status(400).json({ success: false, message: 'Hanya perjalanan aktif yang dapat diperpanjang' });
    }

    await db.query(
      `UPDATE trip_orders SET 
        is_extended = 1,
        extend_company_id = ?,
        extend_unit_id = ?,
        extend_destination = ?,
        extend_purpose = ?,
        extend_notes = ?
       WHERE id = ?`,
      [company_id, unit_id, destination, purpose || null, notes || null, req.params.id]
    );

    res.json({ success: true, message: 'Perjalanan berhasil diperpanjang' });
  } catch (error) {
    console.error('Error extending trip:', error);
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
    // Konversi string kosong ke NULL untuk kolom numerik (MySQL 8 strict mode)
    const toNum = (v) => (v === '' || v === null || v === undefined) ? null : Number(v);
    const toStr = (v) => (v === '' || v === null || v === undefined) ? null : v;

    const [result] = await db.query(
      `INSERT INTO trip_checkpoints (trip_id, sequence_number, type, km_reading, latitude, longitude, address, location_accuracy, photo_km, photo_nota, photo_pump, photo_activity, fuel_liters, fuel_cost, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [req.params.id, seqResult[0].seq, type, toNum(km_reading), toNum(latitude), toNum(longitude),
       toStr(address), toNum(location_accuracy),
       getPath('photo_km'), getPath('photo_nota'), getPath('photo_pump'), getPath('photo_activity'),
       toNum(fuel_liters), toNum(fuel_cost), toStr(notes)]
    );

    // Update trip KM
    if (type === 'departure') await db.query('UPDATE trip_orders SET departure_km=? WHERE id=?', [km_reading, req.params.id]);
    if (type === 'arrival' || type === 'unloading' || type === 'extend_unloading') await db.query('UPDATE trip_orders SET arrival_km=? WHERE id=?', [km_reading, req.params.id]);
    if (type === 'return_arrival') {
      await db.query('UPDATE trip_orders SET return_km=?, total_distance=?-departure_km WHERE id=?', [km_reading, km_reading, req.params.id]);
    }
    // Update vehicle KM and log to historical log table
    const [trip] = await db.query('SELECT vehicle_id FROM trip_orders WHERE id=?', [req.params.id]);
    if (trip.length > 0 && trip[0].vehicle_id) {
      const [vRows] = await db.query('SELECT current_km FROM vehicles WHERE id=?', [trip[0].vehicle_id]);
      const prevKm = vRows.length > 0 ? vRows[0].current_km : 0;
      
      await db.query('UPDATE vehicles SET current_km=? WHERE id=? AND ? > current_km', [km_reading, trip[0].vehicle_id, km_reading]);
      
      const photo_km = getPath('photo_km');
      const labels = {
        departure: 'Mulai Keberangkatan',
        arrival: 'Sampai di Tujuan',
        unloading: 'Mulai Bongkar',
        extend_unloading: 'Bongkar Tambahan',
        return_departure: 'Mulai Kepulangan',
        return_arrival: 'Sampai di Kantor'
      };
      const stepLabel = labels[type] ? `${labels[type]} (Dinas)` : `Checkpoint ${type} (Dinas)`;
      
      await db.query(
        `INSERT INTO vehicle_km_logs (vehicle_id, km_reading, previous_km, recorded_date, recorded_by, photo, source, trip_id, notes)
         VALUES (?, ?, ?, NOW(), ?, ?, 'trip', ?, ?)`,
        [trip[0].vehicle_id, km_reading, prevKm, req.user.id, photo_km, req.params.id, stepLabel]
      );
    }

    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST add event
router.post('/:id/events', auth, setUploadDir('trips'), upload.any(), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { event_type, title, description, severity, latitude, longitude, current_km, address } = req.body;
    
    console.log('Received files for event:', req.files);
    console.log('Received body for event:', req.body);

    const files = req.files || [];
    const photoFile = files.find(f => f.fieldname === 'photo');
    const photoKmFile = files.find(f => f.fieldname === 'photo_km');
    const photo = photoFile ? `/uploads/trips/${photoFile.filename}` : null;
    const photo_km = photoKmFile ? `/uploads/trips/${photoKmFile.filename}` : null;

    const toNum = (v) => (v === '' || v === null || v === undefined) ? null : Number(v);
    const toStr = (v) => (v === '' || v === null || v === undefined) ? null : v;

    const typeMapping = {
      'breakdown': 'kerusakan_kendaraan',
      'accident': 'kecelakaan',
      'flat_tire': 'ban_bocor',
      'traffic_jam': 'macet_parah',
      'other': 'lainnya'
    };
    const dbEventType = typeMapping[event_type] || event_type || 'lainnya';

    // 1. Create matching checkpoint first so it plots on dashboard tracking & routing map
    const [seqResult] = await connection.query('SELECT COALESCE(MAX(sequence_number),0)+1 as seq FROM trip_checkpoints WHERE trip_id=?', [req.params.id]);
    const [cpResult] = await connection.query(
      `INSERT INTO trip_checkpoints (trip_id, sequence_number, type, km_reading, latitude, longitude, address, photo_km, photo_activity, notes)
       VALUES (?, ?, 'incident', ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.id, 
        seqResult[0].seq, 
        toNum(current_km), 
        toNum(latitude), 
        toNum(longitude), 
        toStr(address) || 'Kejadian Kendala', 
        photo_km, 
        photo, 
        toStr(description)
      ]
    );
    const checkpointId = cpResult.insertId;

    // 2. Insert event
    const [result] = await connection.query(
      `INSERT INTO trip_events (trip_id, checkpoint_id, event_type, title, description, severity, photo, latitude, longitude, current_km, photo_km)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.id,
        checkpointId,
        dbEventType,
        title,
        toStr(description),
        severity || 'medium',
        photo,
        toNum(latitude),
        toNum(longitude),
        toNum(current_km),
        photo_km
      ]
    );

    // 3. Update vehicle KM if higher and write odometer log
    const [trip] = await connection.query('SELECT vehicle_id FROM trip_orders WHERE id=?', [req.params.id]);
    if (trip.length > 0 && trip[0].vehicle_id && current_km) {
      const [vRows] = await connection.query('SELECT current_km FROM vehicles WHERE id=?', [trip[0].vehicle_id]);
      const prevKm = vRows.length > 0 ? vRows[0].current_km : 0;
      
      await connection.query('UPDATE vehicles SET current_km=? WHERE id=? AND ? > current_km', [toNum(current_km), trip[0].vehicle_id, toNum(current_km)]);
      
      await connection.query(
        `INSERT INTO vehicle_km_logs (vehicle_id, km_reading, previous_km, recorded_date, recorded_by, photo, source, trip_id, notes)
         VALUES (?, ?, ?, NOW(), ?, ?, 'trip', ?, ?)`,
        [
          trip[0].vehicle_id,
          toNum(current_km),
          prevKm,
          req.user.id,
          photo_km,
          req.params.id,
          `Dari insiden dinas: ${title || 'Kendala Perjalanan'}`
        ]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating trip event:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// (monitoring route moved to top, above /:id)

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');
const { upload, setUploadDir } = require('../middleware/upload');

// Generate RS ticket number: RS-{SEQ}/{MM}/{YYYY}-{PT}-{UNIT}
const generateTicketNumber = async (vehicleId) => {
  const [rows] = await db.query(
    `SELECT c.code as company_code, u.code as unit_code 
     FROM vehicles v
     LEFT JOIN units u ON v.unit_id = u.id
     LEFT JOIN companies c ON u.company_id = c.id
     WHERE v.id = ?`,
    [vehicleId]
  );
  
  const companyCode = (rows[0]?.company_code || 'PT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const unitCode = (rows[0]?.unit_code || 'UNIT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  
  const [countRows] = await db.query(
    `SELECT COUNT(*) as cnt 
     FROM service_tickets 
     WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`
  );
  
  const seq = String(countRows[0].cnt + 1).padStart(2, '0');
  return `RS-${seq}/${mm}/${yyyy}-${companyCode}-${unitCode}`;
};

// Generate WO number: WO-{SEQ}/{MM}/{YYYY}-{PT}-{UNIT}
const generateWONumber = async (vehicleId) => {
  const [rows] = await db.query(
    `SELECT c.code as company_code, u.code as unit_code 
     FROM vehicles v
     LEFT JOIN units u ON v.unit_id = u.id
     LEFT JOIN companies c ON u.company_id = c.id
     WHERE v.id = ?`,
    [vehicleId]
  );
  
  const companyCode = (rows[0]?.company_code || 'PT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const unitCode = (rows[0]?.unit_code || 'UNIT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  
  const [countRows] = await db.query(
    `SELECT COUNT(*) as cnt 
     FROM work_orders 
     WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`
  );
  
  const seq = String(countRows[0].cnt + 1).padStart(2, '0');
  return `WO-${seq}/${mm}/${yyyy}-${companyCode}-${unitCode}`;
};

// Helper: automatically update/reset routine service schedules for a vehicle
const updateLinkedRoutineService = async (connection, vehicleId, kmAtService, completedDate) => {
  try {
    const [rsEntries] = await connection.query(
      'SELECT id, interval_km, interval_days FROM routine_services WHERE vehicle_id = ?',
      [vehicleId]
    );
    for (const entry of rsEntries) {
      const lastKm = kmAtService || 0;
      const lastDate = completedDate || new Date().toISOString().slice(0, 10);
      const nextKm = lastKm + (entry.interval_km || 10000);
      
      const lastDateObj = new Date(lastDate);
      lastDateObj.setDate(lastDateObj.getDate() + (entry.interval_days || 180));
      const nextDate = lastDateObj.toISOString().slice(0, 10);

      await connection.query(
        `UPDATE routine_services 
         SET last_service_date = ?, 
             last_service_km = ?, 
             next_service_date = ?, 
             next_service_km = ?, 
             status = 'on_schedule' 
         WHERE id = ?`,
        [lastDate, lastKm, nextDate, nextKm, entry.id]
      );
    }
  } catch (err) {
    console.error('Error updating routine services:', err);
  }
};

// ==========================================
// 1. DRIVER VEHICLE REPORT TICKETS
// ==========================================

// GET active vehicle for currently logged in driver
router.get('/tickets/active-vehicle', auth, async (req, res) => {
  try {
    const [drivers] = await db.query('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
    if (drivers.length === 0) {
      return res.status(400).json({ success: false, message: 'Driver tidak terdaftar' });
    }
    const driverId = drivers[0].id;
    const [assignments] = await db.query(
      `SELECT v.id, v.nopol, v.merk, v.model, v.current_km, c.name as company_name, u.name as unit_name
       FROM driver_assignments da 
       JOIN vehicles v ON da.vehicle_id = v.id 
       LEFT JOIN units u ON v.unit_id = u.id
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE da.driver_id = ? AND da.status = 'active' 
       LIMIT 1`,
      [driverId]
    );
    if (assignments.length === 0) {
      return res.status(404).json({ success: false, message: 'Anda tidak memiliki kendaraan yang aktif saat ini' });
    }
    res.json({ success: true, data: assignments[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST driver report damage
router.post('/tickets', auth, setUploadDir('services'), upload.any(), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { damage_type, description, notes } = req.body;

    const [drivers] = await connection.query('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
    if (drivers.length === 0) {
      return res.status(400).json({ success: false, message: 'Driver tidak terdaftar' });
    }
    const driverId = drivers[0].id;

    const [assignments] = await connection.query(
      `SELECT vehicle_id FROM driver_assignments WHERE driver_id = ? AND status = 'active' LIMIT 1`,
      [driverId]
    );
    if (assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'Anda tidak memiliki kendaraan aktif' });
    }
    const vehicleId = assignments[0].vehicle_id;

    // Generate RS Ticket number
    const ticketNumber = await generateTicketNumber(vehicleId);

    const [result] = await connection.query(
      `INSERT INTO service_tickets (ticket_number, driver_id, vehicle_id, damage_type, description, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [ticketNumber, driverId, vehicleId, damage_type, description, notes]
    );

    const ticketId = result.insertId;

    // Process uploaded photos
    const files = req.files || [];
    for (const file of files) {
      await connection.query(
        `INSERT INTO service_ticket_photos (ticket_id, photo_path) VALUES (?, ?)`,
        [ticketId, `/uploads/services/${file.filename}`]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, data: { id: ticketId, ticket_number: ticketNumber } });
  } catch (error) {
    await connection.rollback();
    console.error('Error reporting damage:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// GET all damage tickets
router.get('/tickets', auth, async (req, res) => {
  try {
    const { status, driver_id } = req.query;
    let query = `SELECT st.*, v.nopol, v.merk, v.model, d.name as driver_name, c.name as company_name, un.name as unit_name
                 FROM service_tickets st 
                 JOIN vehicles v ON st.vehicle_id = v.id 
                 JOIN drivers d ON st.driver_id = d.id
                 LEFT JOIN units un ON v.unit_id = un.id
                 LEFT JOIN companies c ON un.company_id = c.id
                 WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND st.status = ?'; params.push(status); }
    
    if (req.user.role === 'driver') {
      query += ' AND d.user_id = ?';
      params.push(req.user.id);
    } else if (driver_id) {
      query += ' AND st.driver_id = ?';
      params.push(driver_id);
    }
    
    query += ' ORDER BY st.created_at DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET ticket by ID with photos
router.get('/tickets/:id', auth, async (req, res) => {
  try {
    const [tickets] = await db.query(
      `SELECT st.*, v.nopol, v.merk, v.model, d.name as driver_name, c.name as company_name, un.name as unit_name
       FROM service_tickets st 
       JOIN vehicles v ON st.vehicle_id = v.id 
       JOIN drivers d ON st.driver_id = d.id
       LEFT JOIN units un ON v.unit_id = un.id
       LEFT JOIN companies c ON un.company_id = c.id
       WHERE st.id = ?`,
      [req.params.id]
    );

    if (tickets.length === 0) return res.status(404).json({ success: false, message: 'Ticket not found' });
    const [photos] = await db.query('SELECT * FROM service_ticket_photos WHERE ticket_id = ?', [req.params.id]);

    res.json({ success: true, data: { ...tickets[0], photos } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reject or update status of service ticket
router.put('/tickets/:id/status', auth, checkPermission('services.approve'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }
    await db.query('UPDATE service_tickets SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: 'Status tiket perbaikan berhasil diperbarui' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// 2. WORK ORDERS (WO) SERVICE
// ==========================================

// GET all work orders
router.get('/work-orders', auth, checkPermission('services.view'), async (req, res) => {
  try {
    const { status, vehicle_id, priority } = req.query;
    let query = `SELECT wo.*, v.nopol, v.merk, v.model, cb.name as created_by_name, ab.name as approved_by_name, st.ticket_number
                 FROM work_orders wo 
                 JOIN vehicles v ON wo.vehicle_id = v.id
                 LEFT JOIN users cb ON wo.created_by = cb.id 
                 LEFT JOIN users ab ON wo.approved_by = ab.id
                 LEFT JOIN service_tickets st ON wo.ticket_id = st.id
                 WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND wo.status = ?'; params.push(status); }
    if (vehicle_id) { query += ' AND wo.vehicle_id = ?'; params.push(vehicle_id); }
    if (priority) { query += ' AND wo.priority = ?'; params.push(priority); }
    query += ' ORDER BY wo.created_at DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET active WO task for current driver
router.get('/work-orders/driver/active', auth, async (req, res) => {
  try {
    const [drivers] = await db.query('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
    if (drivers.length === 0) return res.status(400).json({ success: false, message: 'Driver not found' });
    const driverId = drivers[0].id;

    // Retrieve active work order for driver's currently active assigned vehicle
    const [wos] = await db.query(
      `SELECT wo.*, v.nopol, v.merk, v.model
       FROM work_orders wo 
       JOIN vehicles v ON wo.vehicle_id = v.id 
       JOIN driver_assignments da ON v.id = da.vehicle_id 
       WHERE da.driver_id = ? AND da.status = 'active' AND wo.status IN ('approved', 'in_progress')
       ORDER BY wo.created_at DESC LIMIT 1`,
      [driverId]
    );

    if (wos.length === 0) return res.json({ success: true, data: null });
    res.json({ success: true, data: wos[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET work order by ID with checkpoints
router.get('/work-orders/:id', auth, async (req, res) => {
  try {
    const [wo] = await db.query(
      `SELECT wo.*, v.nopol, v.merk, v.model, st.ticket_number
       FROM work_orders wo 
       JOIN vehicles v ON wo.vehicle_id = v.id 
       LEFT JOIN service_tickets st ON wo.ticket_id = st.id
       WHERE wo.id = ?`,
      [req.params.id]
    );
    if (wo.length === 0) return res.status(404).json({ success: false, message: 'WO not found' });
    const [checkpoints] = await db.query('SELECT * FROM service_order_checkpoints WHERE work_order_id = ? ORDER BY id ASC', [req.params.id]);
    res.json({ success: true, data: { ...wo[0], checkpoints } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST Create Work Order (optionally from ticket)
router.post('/work-orders', auth, checkPermission('services.create'), setUploadDir('services'), upload.fields([
  { name: 'before_photo', maxCount: 1 }, { name: 'document_file', maxCount: 1 }
]), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { ticket_id, vehicle_id, service_type, category, description, workshop_name, workshop_address, mechanic_name, reported_date, km_at_service, estimated_cost, priority, notes } = req.body;
    const files = req.files || {};
    const before_photo = files.before_photo ? `/uploads/services/${files.before_photo[0].filename}` : null;
    const document_file = files.document_file ? `/uploads/services/${files.document_file[0].filename}` : null;

    let targetVehicleId = vehicle_id;

    // Resolve vehicle from ticket if ticket_id is supplied
    if (ticket_id) {
      const [tickets] = await connection.query('SELECT vehicle_id FROM service_tickets WHERE id = ?', [ticket_id]);
      if (tickets.length > 0) {
        targetVehicleId = tickets[0].vehicle_id;
      }
    }

    if (!targetVehicleId) {
      return res.status(400).json({ success: false, message: 'Vehicle ID is required' });
    }

    const wo_number = await generateWONumber(targetVehicleId);

    const [result] = await connection.query(
      `INSERT INTO work_orders (ticket_id, wo_number, vehicle_id, service_type, category, description, workshop_name, workshop_address, mechanic_name, reported_date, km_at_service, estimated_cost, priority, status, before_photo, document_file, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'approved',?,?,?,?)`,
      [
        ticket_id || null, 
        wo_number, 
        targetVehicleId, 
        service_type || 'corrective', 
        category || 'Perbaikan Umum', 
        description, 
        workshop_name, 
        workshop_address, 
        mechanic_name, 
        reported_date || new Date().toISOString().slice(0, 10), 
        km_at_service || 0, 
        estimated_cost || 0, 
        priority || 'medium', 
        before_photo, 
        document_file, 
        notes, 
        req.user.id
      ]
    );

    const woId = result.insertId;

    // Update vehicle status to maintenance
    await connection.query(`UPDATE vehicles SET status = 'maintenance' WHERE id = ?`, [targetVehicleId]);

    // If WO is created from ticket, update ticket status to approved
    if (ticket_id) {
      await connection.query(`UPDATE service_tickets SET status = 'approved' WHERE id = ?`, [ticket_id]);
    }

    await connection.commit();
    res.status(201).json({ success: true, data: { id: woId, wo_number } });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating Work Order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// POST register stepper checkpoint for Work Order perbaikan
router.post('/work-orders/:id/checkpoints', auth, setUploadDir('services'), upload.any(), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { type, km_reading, latitude, longitude, address } = req.body;

    const files = req.files || [];
    const photoKmFile = files.find(f => f.fieldname === 'photo_km');
    const photoActivityFile = files.find(f => f.fieldname === 'photo_activity');
    const photoInvoiceFile = files.find(f => f.fieldname === 'photo_invoice');

    const photo_km = photoKmFile ? `/uploads/services/${photoKmFile.filename}` : null;
    const photo_activity = photoActivityFile ? `/uploads/services/${photoActivityFile.filename}` : null;
    const photo_invoice = photoInvoiceFile ? `/uploads/services/${photoInvoiceFile.filename}` : null;

    if (!photo_km) {
      return res.status(400).json({ success: false, message: 'Foto KM wajib dilampirkan' });
    }

    // Insert stepper checkpoint entry
    await connection.query(
      `INSERT INTO service_order_checkpoints (work_order_id, type, km_reading, latitude, longitude, address, photo_km, photo_activity, photo_invoice)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, type, km_reading, latitude || null, longitude || null, address || null, photo_km, photo_activity, photo_invoice]
    );

    // Update Work Order state based on checkpoint type
    if (type === 'start_to_workshop') {
      await connection.query(
        `UPDATE work_orders SET status = 'in_progress', started_date = CURDATE() WHERE id = ?`,
        [req.params.id]
      );
    } else if (type === 'return_to_office') {
      // Get vehicle linked to work order
      const [wos] = await connection.query('SELECT vehicle_id, ticket_id FROM work_orders WHERE id = ?', [req.params.id]);
      if (wos.length > 0) {
        const vehicleId = wos[0].vehicle_id;
        const ticketId = wos[0].ticket_id;

        // Mark work order complete
        const actualCost = req.body.actual_cost ? parseFloat(req.body.actual_cost) : null;
        await connection.query(
          `UPDATE work_orders 
           SET status = 'completed', 
               completed_date = CURDATE(), 
               actual_cost = COALESCE(?, estimated_cost) 
           WHERE id = ?`,
          [actualCost, req.params.id]
        );

        // Reset vehicle status back to available
        await connection.query(
          `UPDATE vehicles SET status = 'available' WHERE id = ?`,
          [vehicleId]
        );

        // Update original ticket to completed
        if (ticketId) {
          await connection.query(`UPDATE service_tickets SET status = 'completed' WHERE id = ?`, [ticketId]);
        }

        // Update routine services for this vehicle
        await updateLinkedRoutineService(connection, vehicleId, km_reading || 0, new Date().toISOString().slice(0, 10));
      }
    }

    // Odometer Update and Historical Logging for ALL checkpoints (start_to_workshop, arrive_at_workshop, return_to_office)
    const [wos] = await connection.query('SELECT vehicle_id FROM work_orders WHERE id = ?', [req.params.id]);
    if (wos.length > 0) {
      const vehicleId = wos[0].vehicle_id;
      const [vRows] = await connection.query('SELECT current_km FROM vehicles WHERE id = ?', [vehicleId]);
      const prevKm = vRows.length > 0 ? vRows[0].current_km : 0;

      await connection.query('UPDATE vehicles SET current_km = ? WHERE id = ? AND ? > current_km', [km_reading, vehicleId, km_reading]);

      const labels = {
        start_to_workshop: 'Mulai Menuju Bengkel (WO)',
        arrive_at_workshop: 'Sampai di Bengkel (WO)',
        return_to_office: 'Sampai di Kantor (WO)'
      };
      const stepLabel = labels[type] ? labels[type] : `Checkpoint ${type} (WO)`;

      await connection.query(
        `INSERT INTO vehicle_km_logs (vehicle_id, km_reading, previous_km, recorded_date, recorded_by, photo, source, notes) 
         VALUES (?, ?, ?, NOW(), ?, ?, 'service', ?)`,
        [vehicleId, km_reading, prevKm, req.user.id, photo_km, stepLabel]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Checkpoint registered successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error logging checkpoint:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Update Work Order status (manual override)
router.put('/work-orders/:id/status', auth, checkPermission('services.approve'), async (req, res) => {
  try {
    const { status, actual_cost, completed_date, notes } = req.body;
    let query = 'UPDATE work_orders SET status=?';
    const params = [status];
    if (status === 'approved') { query += ', approved_by=?, approved_at=NOW()'; params.push(req.user.id); }
    if (actual_cost) { query += ', actual_cost=?'; params.push(actual_cost); }
    if (completed_date) { query += ', completed_date=?'; params.push(completed_date); }
    if (notes) { query += ', notes=?'; params.push(notes); }
    if (status === 'completed' || status === 'cancelled') {
      if (status === 'completed') {
        query += ', completed_date=COALESCE(completed_date, CURDATE())';
      }
      const [wo] = await db.query('SELECT vehicle_id, ticket_id, km_at_service FROM work_orders WHERE id=?', [req.params.id]);
      if (wo.length > 0) {
        const vehicleId = wo[0].vehicle_id;
        await db.query(`UPDATE vehicles SET status='available' WHERE id=? AND status='maintenance'`, [vehicleId]);
        if (wo[0].ticket_id) {
          const targetTicketStatus = status === 'completed' ? 'completed' : 'pending';
          await db.query(`UPDATE service_tickets SET status = ? WHERE id = ?`, [targetTicketStatus, wo[0].ticket_id]);
        }
        if (status === 'completed') {
          let km = wo[0].km_at_service || 0;
          if (!km) {
            const [vRows] = await db.query('SELECT current_km FROM vehicles WHERE id = ?', [vehicleId]);
            km = vRows[0]?.current_km || 0;
          }
          const compDate = completed_date || new Date().toISOString().slice(0, 10);
          await updateLinkedRoutineService(db, vehicleId, km, compDate);
        }
      }
    }
    query += ' WHERE id=?'; params.push(req.params.id);
    await db.query(query, params);
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// 3. ROUTINE SERVICES
// ==========================================

router.get('/routine', auth, async (req, res) => {
  try {
    // Sync routine service statuses dynamically based on current vehicle KM and dates
    await db.query(`
      UPDATE routine_services rs
      JOIN vehicles v ON rs.vehicle_id = v.id
      SET rs.status = CASE
        WHEN v.current_km >= rs.next_service_km OR CURDATE() >= rs.next_service_date THEN 'overdue'
        WHEN v.current_km >= (rs.next_service_km - 1000) OR DATEDIFF(rs.next_service_date, CURDATE()) <= 14 THEN 'due_soon'
        ELSE 'on_schedule'
      END
    `).catch(err => console.error('Status sync error:', err));

    const [rows] = await db.query(
      `SELECT rs.*, v.nopol, v.merk, v.current_km FROM routine_services rs JOIN vehicles v ON rs.vehicle_id = v.id ORDER BY rs.status DESC, rs.next_service_date`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/routine', auth, checkPermission('services.create'), async (req, res) => {
  try {
    const { vehicle_id, service_type, interval_km, interval_days, last_service_date, last_service_km, next_service_date, next_service_km, notes } = req.body;
    const [result] = await db.query(
      `INSERT INTO routine_services (vehicle_id, service_type, interval_km, interval_days, last_service_date, last_service_km, next_service_date, next_service_km, notes) VALUES (?,?,?,?,?,?,?,?,?)`,
      [vehicle_id, service_type, interval_km, interval_days, last_service_date, last_service_km, next_service_date, next_service_km, notes]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/routine/:id', auth, checkPermission('services.create'), async (req, res) => {
  try {
    const { vehicle_id, service_type, interval_km, interval_days, last_service_date, last_service_km, next_service_date, next_service_km, notes } = req.body;
    await db.query(
      `UPDATE routine_services 
       SET vehicle_id=?, service_type=?, interval_km=?, interval_days=?, last_service_date=?, last_service_km=?, next_service_date=?, next_service_km=?, notes=? 
       WHERE id=?`,
      [vehicle_id, service_type, interval_km, interval_days, last_service_date, last_service_km, next_service_date, next_service_km, notes, req.params.id]
    );
    res.json({ success: true, message: 'Routine service updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/routine/:id', auth, checkPermission('services.create'), async (req, res) => {
  try {
    await db.query('DELETE FROM routine_services WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Routine service deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// 4. GENERAL HISTORY
// ==========================================

router.get('/history', auth, async (req, res) => {
  try {
    const { vehicle_id, type } = req.query;
    let query = `SELECT wo.*, v.nopol, v.merk FROM work_orders wo JOIN vehicles v ON wo.vehicle_id = v.id WHERE wo.status = 'completed'`;
    const params = [];
    if (vehicle_id) { query += ' AND wo.vehicle_id = ?'; params.push(vehicle_id); }
    if (type) { query += ' AND wo.service_type = ?'; params.push(type); }
    query += ' ORDER BY wo.completed_date DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

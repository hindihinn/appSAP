const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, checkPermission } = require('../middleware/auth');
const { upload, setUploadDir } = require('../middleware/upload');

const generateRMBNumber = async () => {
  const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const [rows] = await db.query(`SELECT COUNT(*) as cnt FROM reimbursements WHERE DATE(created_at)=CURDATE()`);
  return `RMB-${date}-${String(rows[0].cnt+1).padStart(4,'0')}`;
};

router.get('/', auth, checkPermission('reimburse.view'), async (req, res) => {
  try {
    const { status, driver_id } = req.query;
    let query = `SELECT r.*, d.name as driver_name, d.employee_id, t.order_number, t.destination,
                        rv.name as reviewed_by_name, ap.name as approved_by_name
                 FROM reimbursements r JOIN drivers d ON r.driver_id=d.id
                 LEFT JOIN trip_orders t ON r.trip_id=t.id
                 LEFT JOIN users rv ON r.reviewed_by=rv.id LEFT JOIN users ap ON r.approved_by=ap.id WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND r.status=?'; params.push(status); }
    if (driver_id) { query += ' AND r.driver_id=?'; params.push(driver_id); }
    query += ' ORDER BY r.created_at DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const [rmb] = await db.query(
      `SELECT r.*, d.name as driver_name, t.order_number, t.destination FROM reimbursements r 
       JOIN drivers d ON r.driver_id=d.id LEFT JOIN trip_orders t ON r.trip_id=t.id WHERE r.id=?`, [req.params.id]);
    if (rmb.length===0) return res.status(404).json({ success: false, message: 'Not found' });
    const [items] = await db.query('SELECT * FROM reimbursement_items WHERE reimbursement_id=?', [req.params.id]);
    res.json({ success: true, data: { ...rmb[0], items } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', auth, checkPermission('reimburse.create'), async (req, res) => {
  try {
    const reimburse_number = await generateRMBNumber();
    const { trip_id, driver_id, notes, items } = req.body;
    let total = 0;
    if (items) { const parsed = typeof items==='string'?JSON.parse(items):items; total = parsed.reduce((s,i)=>s+Number(i.amount),0); }
    const [result] = await db.query(
      `INSERT INTO reimbursements (reimburse_number, trip_id, driver_id, total_amount, notes) VALUES (?,?,?,?,?)`,
      [reimburse_number, trip_id, driver_id, total, notes]);
    if (items) {
      const parsed = typeof items==='string'?JSON.parse(items):items;
      for (const item of parsed) {
        await db.query(`INSERT INTO reimbursement_items (reimbursement_id, type, description, amount, receipt_date, notes) VALUES (?,?,?,?,?,?)`,
          [result.insertId, item.type, item.description, item.amount, item.receipt_date, item.notes]);
      }
    }
    res.status(201).json({ success: true, data: { id: result.insertId, reimburse_number } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/items', auth, setUploadDir('reimbursements'), upload.single('receipt_photo'), async (req, res) => {
  try {
    const { type, description, amount, receipt_date, notes } = req.body;
    const receipt_photo = req.file ? `/uploads/reimbursements/${req.file.filename}` : null;
    const [result] = await db.query(
      `INSERT INTO reimbursement_items (reimbursement_id, type, description, amount, receipt_photo, receipt_date, notes) VALUES (?,?,?,?,?,?,?)`,
      [req.params.id, type, description, amount, receipt_photo, receipt_date, notes]);
    await db.query('UPDATE reimbursements SET total_amount=(SELECT SUM(amount) FROM reimbursement_items WHERE reimbursement_id=?) WHERE id=?', [req.params.id, req.params.id]);
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id/status', auth, checkPermission('reimburse.approve'), async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    let query = 'UPDATE reimbursements SET status=?';
    const params = [status];
    if (status==='submitted') { query += ', submitted_at=NOW()'; }
    if (status==='reviewed') { query += ', reviewed_by=?, reviewed_at=NOW()'; params.push(req.user.id); }
    if (status==='approved') { query += ', approved_by=?, approved_at=NOW()'; params.push(req.user.id); }
    if (status==='paid') { query += ', paid_at=NOW()'; }
    if (status==='rejected') { query += ', rejection_reason=?'; params.push(rejection_reason); }
    query += ' WHERE id=?'; params.push(req.params.id);
    await db.query(query, params);
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

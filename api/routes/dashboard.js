const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [totalVehicles] = await db.query('SELECT COUNT(*) as count FROM vehicles WHERE is_active=1');
    const [vehiclesByStatus] = await db.query('SELECT status, COUNT(*) as count FROM vehicles WHERE is_active=1 GROUP BY status');
    const [totalDrivers] = await db.query('SELECT COUNT(*) as count FROM drivers WHERE is_active=1');
    const [driversByStatus] = await db.query('SELECT status, COUNT(*) as count FROM drivers WHERE is_active=1 GROUP BY status');
    const [activeTrips] = await db.query(`SELECT COUNT(*) as count FROM trip_orders WHERE status IN ('in_progress','approved')`);
    const [pendingTrips] = await db.query(`SELECT COUNT(*) as count FROM trip_orders WHERE status IN ('pending','admin_review','hrga_review')`);
    const [completedTrips] = await db.query(`SELECT COUNT(*) as count FROM trip_orders WHERE status='completed' AND MONTH(actual_return)=MONTH(NOW())`);
    const [pendingWO] = await db.query(`SELECT COUNT(*) as count FROM work_orders WHERE status IN ('draft','pending','in_progress')`);
    const [pendingReimburse] = await db.query(`SELECT COUNT(*) as count FROM reimbursements WHERE status IN ('submitted','reviewed')`);
    const [reimburseTotal] = await db.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM reimbursements WHERE status='paid' AND MONTH(paid_at)=MONTH(NOW())`);
    
    const [expiringVehicleDocs] = await db.query(
      `SELECT vl.*, v.nopol FROM vehicle_legality vl JOIN vehicles v ON vl.vehicle_id=v.id 
       WHERE vl.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) ORDER BY vl.expiry_date LIMIT 10`);
    const [expiringDriverDocs] = await db.query(
      `SELECT dl.*, d.name as driver_name FROM driver_legality dl JOIN drivers d ON dl.driver_id=d.id 
       WHERE dl.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) ORDER BY dl.expiry_date LIMIT 10`);
    const [recentTrips] = await db.query(
      `SELECT t.*, v.nopol, d.name as driver_name FROM trip_orders t 
       LEFT JOIN vehicles v ON t.vehicle_id=v.id LEFT JOIN drivers d ON t.driver_id=d.id 
       ORDER BY t.created_at DESC LIMIT 5`);
    const [overdueServices] = await db.query(
      `SELECT rs.*, v.nopol FROM routine_services rs JOIN vehicles v ON rs.vehicle_id=v.id WHERE rs.status='overdue'`);

    // Monthly trip chart data
    const [monthlyTrips] = await db.query(
      `SELECT DATE_FORMAT(planned_departure, '%Y-%m') as month, COUNT(*) as count, status
       FROM trip_orders WHERE planned_departure >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY month, status ORDER BY month`);

    res.json({
      success: true,
      data: {
        stats: {
          totalVehicles: totalVehicles[0].count,
          vehiclesByStatus,
          totalDrivers: totalDrivers[0].count,
          driversByStatus,
          activeTrips: activeTrips[0].count,
          pendingTrips: pendingTrips[0].count,
          completedTripsMonth: completedTrips[0].count,
          pendingWO: pendingWO[0].count,
          pendingReimburse: pendingReimburse[0].count,
          reimburseTotalMonth: reimburseTotal[0].total
        },
        alerts: { expiringVehicleDocs, expiringDriverDocs, overdueServices },
        recentTrips,
        monthlyTrips
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

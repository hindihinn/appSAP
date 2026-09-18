package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"fleet-management-api/config"

	"github.com/gin-gonic/gin"
)

// GET /api/dashboard
func GetDashboard(c *gin.Context) {
	// Sync routine service statuses based on latest mileage and date
	_, _ = config.DB.Exec(`
		UPDATE routine_services rs
		JOIN vehicles v ON rs.vehicle_id = v.id
		SET rs.status = CASE
			WHEN v.current_km >= rs.next_service_km OR CURDATE() >= rs.next_service_date THEN 'overdue'
			WHEN v.current_km >= (rs.next_service_km - 1000) OR DATEDIFF(rs.next_service_date, CURDATE()) <= 14 THEN 'due_soon'
			ELSE 'on_schedule'
		END
	`)

	// Total vehicles
	var totalVehicles int
	_ = config.DB.QueryRow("SELECT COUNT(*) as count FROM vehicles WHERE is_active=1").Scan(&totalVehicles)

	// Vehicles by status
	rowsVehStatus, err := config.DB.Query("SELECT status, COUNT(*) as count FROM vehicles WHERE is_active=1 GROUP BY status")
	vehiclesByStatus := []gin.H{}
	if err == nil {
		defer rowsVehStatus.Close()
		for rowsVehStatus.Next() {
			var status string
			var count int
			if err := rowsVehStatus.Scan(&status, &count); err == nil {
				vehiclesByStatus = append(vehiclesByStatus, gin.H{"status": status, "count": count})
			}
		}
	}

	// Total drivers
	var totalDrivers int
	_ = config.DB.QueryRow("SELECT COUNT(*) as count FROM drivers WHERE is_active=1").Scan(&totalDrivers)

	// Drivers by status
	rowsDrvStatus, err := config.DB.Query("SELECT status, COUNT(*) as count FROM drivers WHERE is_active=1 GROUP BY status")
	driversByStatus := []gin.H{}
	if err == nil {
		defer rowsDrvStatus.Close()
		for rowsDrvStatus.Next() {
			var status string
			var count int
			if err := rowsDrvStatus.Scan(&status, &count); err == nil {
				driversByStatus = append(driversByStatus, gin.H{"status": status, "count": count})
			}
		}
	}

	// Active trips
	var activeTrips int
	_ = config.DB.QueryRow("SELECT COUNT(*) as count FROM trip_orders WHERE status IN ('in_progress','approved')").Scan(&activeTrips)

	// Pending trips
	var pendingTrips int
	_ = config.DB.QueryRow("SELECT COUNT(*) as count FROM trip_orders WHERE status IN ('pending','admin_review','hrga_review')").Scan(&pendingTrips)

	// Completed trips this month
	var completedTrips int
	_ = config.DB.QueryRow("SELECT COUNT(*) as count FROM trip_orders WHERE status='completed' AND MONTH(actual_return)=MONTH(NOW()) AND YEAR(actual_return)=YEAR(NOW())").Scan(&completedTrips)

	// Pending Work Orders
	var pendingWO int
	_ = config.DB.QueryRow("SELECT COUNT(*) as count FROM work_orders WHERE status IN ('draft','pending','in_progress')").Scan(&pendingWO)

	// Pending Reimbursements
	var pendingReimburse int
	_ = config.DB.QueryRow("SELECT COUNT(*) as count FROM reimbursements WHERE status IN ('submitted','reviewed')").Scan(&pendingReimburse)

	// Reimburse Total Month
	var reimburseTotal float64
	_ = config.DB.QueryRow("SELECT COALESCE(SUM(total_amount), 0) as total FROM reimbursements WHERE status='paid' AND MONTH(paid_at)=MONTH(NOW()) AND YEAR(paid_at)=YEAR(NOW())").Scan(&reimburseTotal)

	// Expiring vehicle docs
	rowsVehDocs, err := config.DB.Query(
		`SELECT vl.id, vl.vehicle_id, vl.type, vl.document_number, vl.expiry_date, v.nopol 
		 FROM vehicle_legality vl 
		 JOIN vehicles v ON vl.vehicle_id=v.id 
		 WHERE vl.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
		 ORDER BY vl.expiry_date LIMIT 10`,
	)
	expiringVehicleDocs := []gin.H{}
	if err == nil {
		defer rowsVehDocs.Close()
		for rowsVehDocs.Next() {
			var id, vehicleID int
			var lType, docNum, nopol string
			var expiryDate time.Time
			if err := rowsVehDocs.Scan(&id, &vehicleID, &lType, &docNum, &expiryDate, &nopol); err == nil {
				expiringVehicleDocs = append(expiringVehicleDocs, gin.H{
					"id":              id,
					"vehicle_id":      vehicleID,
					"type":            lType,
					"document_number": docNum,
					"expiry_date":     expiryDate,
					"nopol":           nopol,
				})
			}
		}
	}

	// Expiring driver docs
	rowsDrvDocs, err := config.DB.Query(
		`SELECT dl.id, dl.driver_id, dl.type, dl.document_number, dl.expiry_date, d.name as driver_name 
		 FROM driver_legality dl 
		 JOIN drivers d ON dl.driver_id=d.id 
		 WHERE dl.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
		 ORDER BY dl.expiry_date LIMIT 10`,
	)
	expiringDriverDocs := []gin.H{}
	if err == nil {
		defer rowsDrvDocs.Close()
		for rowsDrvDocs.Next() {
			var id, driverID int
			var lType, docNum, driverName string
			var expiryDate time.Time
			if err := rowsDrvDocs.Scan(&id, &driverID, &lType, &docNum, &expiryDate, &driverName); err == nil {
				expiringDriverDocs = append(expiringDriverDocs, gin.H{
					"id":              id,
					"driver_id":       driverID,
					"type":            lType,
					"document_number": docNum,
					"expiry_date":     expiryDate,
					"driver_name":     driverName,
				})
			}
		}
	}

	// Recent trips
	rowsTrips, err := config.DB.Query(
		`SELECT t.id, t.order_number, t.status, t.destination, t.planned_departure, v.nopol, d.name as driver_name 
		 FROM trip_orders t 
		 LEFT JOIN vehicles v ON t.vehicle_id=v.id 
		 LEFT JOIN drivers d ON t.driver_id=d.id 
		 ORDER BY t.created_at DESC LIMIT 5`,
	)
	recentTrips := []gin.H{}
	if err == nil {
		defer rowsTrips.Close()
		for rowsTrips.Next() {
			var id int
			var orderNum, status, dest, plannedDep string
			var nopol, driverName sql.NullString
			if err := rowsTrips.Scan(&id, &orderNum, &status, &dest, &plannedDep, &nopol, &driverName); err == nil {
				recentTrips = append(recentTrips, gin.H{
					"id":                id,
					"order_number":      orderNum,
					"status":            status,
					"destination":       dest,
					"planned_departure": plannedDep,
					"nopol":             nopol.String,
					"driver_name":       driverName.String,
				})
			}
		}
	}

	// Overdue services
	rowsOverdue, err := config.DB.Query(
		`SELECT rs.id, rs.vehicle_id, rs.service_name, rs.next_service_km, rs.next_service_date, v.nopol 
		 FROM routine_services rs 
		 JOIN vehicles v ON rs.vehicle_id=v.id 
		 WHERE rs.status='overdue'`,
	)
	overdueServices := []gin.H{}
	if err == nil {
		defer rowsOverdue.Close()
		for rowsOverdue.Next() {
			var id, vehicleID int
			var serviceName, nopol string
			var nextKm int
			var nextDate time.Time
			if err := rowsOverdue.Scan(&id, &vehicleID, &serviceName, &nextKm, &nextDate, &nopol); err == nil {
				overdueServices = append(overdueServices, gin.H{
					"id":                id,
					"vehicle_id":        vehicleID,
					"service_name":      serviceName,
					"next_service_km":   nextKm,
					"next_service_date": nextDate,
					"nopol":             nopol,
				})
			}
		}
	}

	// Monthly trip chart data
	rowsChart, err := config.DB.Query(
		`SELECT DATE_FORMAT(planned_departure, '%Y-%m') as month, COUNT(*) as count, status
		 FROM trip_orders 
		 WHERE planned_departure >= DATE_SUB(NOW(), INTERVAL 6 MONTH) 
		 GROUP BY month, status 
		 ORDER BY month`,
	)
	monthlyTrips := []gin.H{}
	if err == nil {
		defer rowsChart.Close()
		for rowsChart.Next() {
			var month, status string
			var count int
			if err := rowsChart.Scan(&month, &count, &status); err == nil {
				monthlyTrips = append(monthlyTrips, gin.H{
					"month":  month,
					"count":  count,
					"status": status,
				})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"stats": gin.H{
				"totalVehicles":        totalVehicles,
				"vehiclesByStatus":     vehiclesByStatus,
				"totalDrivers":         totalDrivers,
				"driversByStatus":      driversByStatus,
				"activeTrips":          activeTrips,
				"pendingTrips":         pendingTrips,
				"completedTripsMonth":  completedTrips,
				"pendingWO":            pendingWO,
				"pendingReimburse":     pendingReimburse,
				"reimburseTotalMonth":  reimburseTotal,
			},
			"alerts": gin.H{
				"expiringVehicleDocs": expiringVehicleDocs,
				"expiringDriverDocs":  expiringDriverDocs,
				"overdueServices":     overdueServices,
			},
			"recentTrips":  recentTrips,
			"monthlyTrips": monthlyTrips,
		},
	})
}

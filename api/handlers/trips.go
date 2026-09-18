package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"fleet-management-api/config"
	"fleet-management-api/middleware"
	"fleet-management-api/models"

	"github.com/gin-gonic/gin"
)

// Generate order number: TRP-{SEQ}/{MM}/{YYYY}-{PT}-{UNIT}
func generateOrderNumber(companyCode, unitCode string) (string, error) {
	now := time.Now()
	mm := fmt.Sprintf("%02d", now.Month())
	yyyy := now.Year()

	var cnt int
	err := config.DB.QueryRow(
		`SELECT COUNT(*) as cnt FROM trip_orders WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`,
	).Scan(&cnt)
	if err != nil {
		return "", err
	}

	seq := fmt.Sprintf("%02d", cnt+1)
	pt := sanitizeCode(companyCode, "PT")
	unit := sanitizeCode(unitCode, "UNIT")
	return fmt.Sprintf("TRP-%s/%s/%d-%s-%s", seq, mm, yyyy, pt, unit), nil
}

// Generate DN number: DN-{SEQ}/{MM}/{YYYY}-{PT}-{UNIT}
func generateSpdNumber(companyCode, unitCode string) (string, error) {
	now := time.Now()
	mm := fmt.Sprintf("%02d", now.Month())
	yyyy := now.Year()

	var cnt int
	err := config.DB.QueryRow(
		`SELECT COUNT(*) as cnt FROM trip_orders WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) AND spd_number IS NOT NULL`,
	).Scan(&cnt)
	if err != nil {
		return "", err
	}

	seq := fmt.Sprintf("%02d", cnt+1)
	pt := sanitizeCode(companyCode, "PT")
	unit := sanitizeCode(unitCode, "UNIT")
	return fmt.Sprintf("DN-%s/%s/%d-%s-%s", seq, mm, yyyy, pt, unit), nil
}

func sanitizeCode(val, fallback string) string {
	if val == "" {
		val = fallback
	}
	val = strings.ToUpper(val)
	var sb strings.Builder
	for i := 0; i < len(val); i++ {
		b := val[i]
		if (b >= 'A' && b <= 'Z') || (b >= '0' && b <= '9') {
			sb.WriteByte(b)
		}
	}
	return sb.String()
}

// GET /api/trips
func GetTrips(c *gin.Context) {
	status := c.Query("status")
	driverID := c.Query("driver_id")
	vehicleID := c.Query("vehicle_id")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	requesterID := c.Query("requester_id")

	query := `SELECT t.id, t.order_number, t.spd_number, t.requester_id, t.company_id, t.unit_id,
	                 t.extend_company_id, t.extend_unit_id, t.vehicle_id, t.driver_id, t.admin_id, t.hrga_id,
	                 t.destination, t.destination_address, t.purpose, t.items_description, t.planned_departure,
	                 t.planned_return, t.actual_departure, t.actual_return, t.departure_km, t.arrival_km, t.return_km, t.total_distance,
	                 t.status, t.admin_notes, t.hrga_notes, t.rejection_reason, t.admin_reviewed_at, t.hrga_reviewed_at, t.created_at,
	                 v.nopol, v.merk, d.name as driver_name, 
	                 req.name as requester_name, adm.name as admin_name, hrga.name as hrga_name,
	                 c.name as company_name, c.code as company_code,
	                 un.name as unit_name, un.code as unit_code,
	                 (SELECT COUNT(*) FROM trip_assignments ta WHERE ta.trip_id = t.id) as assignment_count
	          FROM trip_orders t
	          LEFT JOIN vehicles v ON t.vehicle_id = v.id
	          LEFT JOIN drivers d ON t.driver_id = d.id
	          LEFT JOIN users req ON t.requester_id = req.id
	          LEFT JOIN users adm ON t.admin_id = adm.id
	          LEFT JOIN users hrga ON t.hrga_id = hrga.id
	          LEFT JOIN companies c ON t.company_id = c.id
	          LEFT JOIN units un ON t.unit_id = un.id
	          WHERE 1=1`

	var params []interface{}

	if status != "" {
		query += " AND t.status = ?"
		params = append(params, status)
	}
	if requesterID != "" {
		query += " AND t.requester_id = ?"
		params = append(params, requesterID)
	}
	if driverID != "" {
		rowsDrv, err := config.DB.Query("SELECT id FROM drivers WHERE id = ? OR user_id = ?", driverID, driverID)
		if err == nil {
			var ids []string
			for rowsDrv.Next() {
				var id int
				if err := rowsDrv.Scan(&id); err == nil {
					ids = append(ids, "?")
					params = append(params, id)
				}
			}
			rowsDrv.Close()
			if len(ids) > 0 {
				query += " AND t.driver_id IN (" + strings.Join(ids, ",") + ")"
			} else {
				query += " AND t.driver_id = ?"
				params = append(params, driverID)
			}
		}
	}
	if vehicleID != "" {
		query += " AND t.vehicle_id = ?"
		params = append(params, vehicleID)
	}
	if dateFrom != "" {
		query += " AND t.planned_departure >= ?"
		params = append(params, dateFrom)
	}
	if dateTo != "" {
		query += " AND t.planned_departure <= ?"
		params = append(params, dateTo)
	}

	query += " ORDER BY t.created_at DESC"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}
	defer rows.Close()

	trips := []models.TripOrder{}
	for rows.Next() {
		var t models.TripOrder
		var spdNum, destAddr, purpose, itemsDesc, planReturn, actDep, actRet, adminNotes, hrgaNotes, rejReason sql.NullString
		var adminRevTime, hrgaAppTime sql.NullTime
		var compID, unitID, extCompID, extUnitID, vehID, drvID, admID, hrgaID sql.NullInt64
		var depKm, arrKm, retKm, totKm sql.NullInt64
		var nopol, merk, drvName, reqName, admName, hrgaName, compName, compCode, unitName, unitCode sql.NullString

		err := rows.Scan(
			&t.ID, &t.OrderNumber, &spdNum, &t.RequesterID, &compID, &unitID,
			&extCompID, &extUnitID, &vehID, &drvID, &admID, &hrgaID,
			&t.Destination, &destAddr, &purpose, &itemsDesc, &t.PlannedDeparture,
			&planReturn, &actDep, &actRet, &depKm, &arrKm, &retKm, &totKm,
			&t.Status, &adminNotes, &hrgaNotes, &rejReason, &adminRevTime, &hrgaAppTime, &t.CreatedAt,
			&nopol, &merk, &drvName, &reqName, &admName, &hrgaName, &compName, &compCode, &unitName, &unitCode,
			&t.AssignmentCount,
		)
		if err == nil {
			if spdNum.Valid {
				t.SpdNumber = &spdNum.String
			}
			if compID.Valid {
				val := int(compID.Int64)
				t.CompanyID = &val
			}
			if unitID.Valid {
				val := int(unitID.Int64)
				t.UnitID = &val
			}
			if extCompID.Valid {
				val := int(extCompID.Int64)
				t.ExtendCompanyID = &val
			}
			if extUnitID.Valid {
				val := int(extUnitID.Int64)
				t.ExtendUnitID = &val
			}
			if vehID.Valid {
				val := int(vehID.Int64)
				t.VehicleID = &val
			}
			if drvID.Valid {
				val := int(drvID.Int64)
				t.DriverID = &val
			}
			if admID.Valid {
				val := int(admID.Int64)
				t.AdminID = &val
			}
			if hrgaID.Valid {
				val := int(hrgaID.Int64)
				t.HrgaID = &val
			}
			if destAddr.Valid {
				t.DestinationAddress = &destAddr.String
			}
			if purpose.Valid {
				t.Purpose = &purpose.String
			}
			if itemsDesc.Valid {
				t.ItemsDescription = &itemsDesc.String
			}
			if planReturn.Valid {
				t.PlannedReturn = &planReturn.String
			}
			if actDep.Valid {
				t.ActualDeparture = &actDep.String
			}
			if actRet.Valid {
				t.ActualReturn = &actRet.String
			}
			if depKm.Valid {
				val := int(depKm.Int64)
				t.DepartureKm = &val
			}
			if arrKm.Valid {
				val := int(arrKm.Int64)
				t.ArrivalKm = &val
			}
			if retKm.Valid {
				val := int(retKm.Int64)
				t.ReturnKm = &val
			}
			if totKm.Valid {
				val := int(totKm.Int64)
				t.TotalKm = &val
			}
			if adminNotes.Valid {
				t.AdminNotes = &adminNotes.String
			}
			if hrgaNotes.Valid {
				t.HrgaNotes = &hrgaNotes.String
			}
			if rejReason.Valid {
				t.RejectionReason = &rejReason.String
			}
			if adminRevTime.Valid {
				t.AdminReviewedAt = &adminRevTime.Time
			}
			if hrgaAppTime.Valid {
				t.HrgaApprovedAt = &hrgaAppTime.Time
			}

			if nopol.Valid {
				t.Nopol = &nopol.String
			}
			if merk.Valid {
				t.Merk = &merk.String
			}
			if drvName.Valid {
				t.DriverName = &drvName.String
			}
			if reqName.Valid {
				t.RequesterName = &reqName.String
			}
			if admName.Valid {
				t.AdminName = &admName.String
			}
			if hrgaName.Valid {
				t.HrgaName = &hrgaName.String
			}
			if compName.Valid {
				t.CompanyName = &compName.String
			}
			if compCode.Valid {
				t.CompanyCode = &compCode.String
			}
			if unitName.Valid {
				t.UnitName = &unitName.String
			}
			if unitCode.Valid {
				t.UnitCode = &unitCode.String
			}

			trips = append(trips, t)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": trips})
}

// GET /api/trips/status/monitoring
func GetTripsMonitoring(c *gin.Context) {
	query := `SELECT t.id, t.order_number, t.spd_number, t.requester_id, t.company_id, t.unit_id,
	                 t.vehicle_id, t.driver_id, t.destination, t.planned_departure, t.planned_return, t.status, t.created_at,
	                 v.nopol, d.name as driver_name, d.phone as driver_phone,
	                 (SELECT COUNT(*) FROM trip_checkpoints WHERE trip_id = t.id) as checkpoint_count,
	                 (SELECT COUNT(*) FROM trip_events WHERE trip_id = t.id) as event_count
	          FROM trip_orders t 
	          LEFT JOIN vehicles v ON t.vehicle_id = v.id 
	          LEFT JOIN drivers d ON t.driver_id = d.id
	          WHERE t.status IN ('approved','in_progress') 
	          ORDER BY t.planned_departure`

	rows, err := config.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	type MonitoringTrip struct {
		ID               int     `json:"id"`
		OrderNumber      string  `json:"order_number"`
		SpdNumber        *string `json:"spd_number"`
		RequesterID      int     `json:"requester_id"`
		CompanyID        *int    `json:"company_id"`
		UnitID           *int    `json:"unit_id"`
		VehicleID        *int    `json:"vehicle_id"`
		DriverID         *int    `json:"driver_id"`
		Destination      string  `json:"destination"`
		PlannedDeparture string  `json:"planned_departure"`
		PlannedReturn    *string `json:"planned_return"`
		Status           string  `json:"status"`
		CreatedAt        time.Time
		Nopol            *string `json:"nopol"`
		DriverName       *string `json:"driver_name"`
		DriverPhone      *string `json:"driver_phone"`
		CheckpointCount  int     `json:"checkpoint_count"`
		EventCount       int     `json:"event_count"`
	}

	trips := []MonitoringTrip{}
	for rows.Next() {
		var t MonitoringTrip
		var spdNum, planRet, nopol, drvName, drvPhone sql.NullString
		var compID, unitID, vehID, drvID sql.NullInt64

		err := rows.Scan(
			&t.ID, &t.OrderNumber, &spdNum, &t.RequesterID, &compID, &unitID,
			&vehID, &drvID, &t.Destination, &t.PlannedDeparture, &planRet, &t.Status, &t.CreatedAt,
			&nopol, &drvName, &drvPhone, &t.CheckpointCount, &t.EventCount,
		)
		if err == nil {
			if spdNum.Valid {
				t.SpdNumber = &spdNum.String
			}
			if compID.Valid {
				val := int(compID.Int64)
				t.CompanyID = &val
			}
			if unitID.Valid {
				val := int(unitID.Int64)
				t.UnitID = &val
			}
			if vehID.Valid {
				val := int(vehID.Int64)
				t.VehicleID = &val
			}
			if drvID.Valid {
				val := int(drvID.Int64)
				t.DriverID = &val
			}
			if planRet.Valid {
				t.PlannedReturn = &planRet.String
			}
			if nopol.Valid {
				t.Nopol = &nopol.String
			}
			if drvName.Valid {
				t.DriverName = &drvName.String
			}
			if drvPhone.Valid {
				t.DriverPhone = &drvPhone.String
			}
			trips = append(trips, t)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": trips})
}

// GET /api/trips/:id
func GetTripByID(c *gin.Context) {
	tripID := c.Param("id")

	query := `SELECT t.id, t.order_number, t.spd_number, t.requester_id, t.company_id, t.unit_id,
	                 t.extend_company_id, t.extend_unit_id, t.vehicle_id, t.driver_id, t.admin_id, t.hrga_id,
	                 t.destination, t.destination_address, t.purpose, t.items_description, t.planned_departure,
	                 t.planned_return, t.actual_departure, t.actual_return, t.departure_km, t.arrival_km, t.return_km, t.total_distance,
	                 t.status, t.admin_notes, t.hrga_notes, t.rejection_reason, t.admin_reviewed_at, t.hrga_reviewed_at, t.created_at,
	                 v.nopol, v.merk, d.name as driver_name, d.phone as driver_phone,
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
	          WHERE t.id = ?`

	row := config.DB.QueryRow(query, tripID)

	var t models.TripOrder
	var spdNum, destAddr, purpose, itemsDesc, planReturn, actDep, actRet, adminNotes, hrgaNotes, rejReason sql.NullString
	var adminRevTime, hrgaAppTime sql.NullTime
	var compID, unitID, extCompID, extUnitID, vehID, drvID, admID, hrgaID sql.NullInt64
	var depKm, arrKm, retKm, totKm sql.NullInt64
	var nopol, merk, drvName, drvPhone, reqName, compName, unitName, extCompName, extUnitName sql.NullString
	var fuelPrice sql.NullFloat64

	err := row.Scan(
		&t.ID, &t.OrderNumber, &spdNum, &t.RequesterID, &compID, &unitID,
		&extCompID, &extUnitID, &vehID, &drvID, &admID, &hrgaID,
		&t.Destination, &destAddr, &purpose, &itemsDesc, &t.PlannedDeparture,
		&planReturn, &actDep, &actRet, &depKm, &arrKm, &retKm, &totKm,
		&t.Status, &adminNotes, &hrgaNotes, &rejReason, &adminRevTime, &hrgaAppTime, &t.CreatedAt,
		&nopol, &merk, &drvName, &drvPhone, &reqName, &compName, &unitName, &extCompName, &extUnitName, &fuelPrice,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Trip tidak ditemukan"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	if spdNum.Valid {
		t.SpdNumber = &spdNum.String
	}
	if compID.Valid {
		val := int(compID.Int64)
		t.CompanyID = &val
	}
	if unitID.Valid {
		val := int(unitID.Int64)
		t.UnitID = &val
	}
	if extCompID.Valid {
		val := int(extCompID.Int64)
		t.ExtendCompanyID = &val
	}
	if extUnitID.Valid {
		val := int(extUnitID.Int64)
		t.ExtendUnitID = &val
	}
	if vehID.Valid {
		val := int(vehID.Int64)
		t.VehicleID = &val
	}
	if drvID.Valid {
		val := int(drvID.Int64)
		t.DriverID = &val
	}
	if admID.Valid {
		val := int(admID.Int64)
		t.AdminID = &val
	}
	if hrgaID.Valid {
		val := int(hrgaID.Int64)
		t.HrgaID = &val
	}
	if destAddr.Valid {
		t.DestinationAddress = &destAddr.String
	}
	if purpose.Valid {
		t.Purpose = &purpose.String
	}
	if itemsDesc.Valid {
		t.ItemsDescription = &itemsDesc.String
	}
	if planReturn.Valid {
		t.PlannedReturn = &planReturn.String
	}
	if actDep.Valid {
		t.ActualDeparture = &actDep.String
	}
	if actRet.Valid {
		t.ActualReturn = &actRet.String
	}
	if depKm.Valid {
		val := int(depKm.Int64)
		t.DepartureKm = &val
	}
	if arrKm.Valid {
		val := int(arrKm.Int64)
		t.ArrivalKm = &val
	}
	if retKm.Valid {
		val := int(retKm.Int64)
		t.ReturnKm = &val
	}
	if totKm.Valid {
		val := int(totKm.Int64)
		t.TotalKm = &val
	}
	if adminNotes.Valid {
		t.AdminNotes = &adminNotes.String
	}
	if hrgaNotes.Valid {
		t.HrgaNotes = &hrgaNotes.String
	}
	if rejReason.Valid {
		t.RejectionReason = &rejReason.String
	}
	if adminRevTime.Valid {
		t.AdminReviewedAt = &adminRevTime.Time
	}
	if hrgaAppTime.Valid {
		t.HrgaApprovedAt = &hrgaAppTime.Time
	}
	if nopol.Valid {
		t.Nopol = &nopol.String
	}
	if merk.Valid {
		t.Merk = &merk.String
	}
	if drvName.Valid {
		t.DriverName = &drvName.String
	}
	if drvPhone.Valid {
		t.DriverPhone = &drvPhone.String
	}
	if reqName.Valid {
		t.RequesterName = &reqName.String
	}
	if compName.Valid {
		t.CompanyName = &compName.String
	}
	if unitName.Valid {
		t.UnitName = &unitName.String
	}

	// Fetch Checkpoints
	cpRows, err := config.DB.Query("SELECT id, trip_id, sequence_number, type, km_reading, latitude, longitude, address, location_accuracy, photo_km, photo_nota, photo_pump, photo_activity, fuel_liters, fuel_cost, notes, recorded_at FROM trip_checkpoints WHERE trip_id = ? ORDER BY sequence_number", t.ID)
	checkpoints := []models.TripCheckpoint{}
	if err == nil {
		defer cpRows.Close()
		for cpRows.Next() {
			var cp models.TripCheckpoint
			var kmVal sql.NullInt64
			var locAcc sql.NullFloat64
			var lat, lng sql.NullFloat64
			var addr, photoKm, photoNota, photoPump, photoActivity, notes sql.NullString
			var fuelLiters, fuelCost sql.NullFloat64
			var actTime, schedTime string // placeholders for dates
			err := cpRows.Scan(&cp.ID, &cp.TripID, &cp.SequenceNumber, &cp.Type, &kmVal, &lat, &lng, &addr, &locAcc, &photoKm, &photoNota, &photoPump, &photoActivity, &fuelLiters, &fuelCost, &notes, &cp.RecordedAt)
			if err == nil {
				if kmVal.Valid {
					val := int(kmVal.Int64)
					cp.KmReading = &val
				}
				if lat.Valid {
					cp.Lat = &lat.Float64
				}
				if lng.Valid {
					cp.Lng = &lng.Float64
				}
				if addr.Valid {
					cp.Address = addr.String
				}
				if locAcc.Valid {
					val := locAcc.Float64
					cp.LocationAccuracy = &val
				}
				if photoKm.Valid {
					cp.Photo = &photoKm.String
					cp.PhotoKm = &photoKm.String
				}
				if photoNota.Valid {
					cp.PhotoNota = &photoNota.String
				}
				if photoPump.Valid {
					cp.PhotoPump = &photoPump.String
				}
				if photoActivity.Valid {
					cp.PhotoActivity = &photoActivity.String
				}
				if fuelLiters.Valid {
					cp.FuelLiters = &fuelLiters.Float64
				}
				if fuelCost.Valid {
					cp.FuelCost = &fuelCost.Float64
				}
				if notes.Valid {
					cp.Notes = &notes.String
				}
				// Set strings to placeholder
				cp.ActualTime = &actTime
				cp.ScheduledTime = &schedTime
				checkpoints = append(checkpoints, cp)
			}
		}
	}

	// Fetch Events
	evRows, err := config.DB.Query("SELECT id, trip_id, event_type, description, notes, latitude, longitude, photo, recorded_at FROM trip_events WHERE trip_id = ? ORDER BY recorded_at", t.ID)
	events := []models.TripEvent{}
	if err == nil {
		defer evRows.Close()
		for evRows.Next() {
			var ev models.TripEvent
			var notes, photo sql.NullString
			var lat, lng sql.NullFloat64
			err := evRows.Scan(&ev.ID, &ev.TripID, &ev.EventType, &ev.Description, &notes, &lat, &lng, &photo, &ev.RecordedAt)
			if err == nil {
				if notes.Valid {
					ev.Notes = &notes.String
				}
				if lat.Valid {
					ev.Lat = &lat.Float64
				}
				if lng.Valid {
					ev.Lng = &lng.Float64
				}
				if photo.Valid {
					ev.Photo = &photo.String
				}
				events = append(events, ev)
			}
		}
	}

	var extCName *string
	if extCompName.Valid {
		extCName = &extCompName.String
	}
	var extUName *string
	if extUnitName.Valid {
		extUName = &extUnitName.String
	}
	var fPrice *float64
	if fuelPrice.Valid {
		fPrice = &fuelPrice.Float64
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"id":                  t.ID,
			"order_number":        t.OrderNumber,
			"spd_number":          t.SpdNumber,
			"requester_id":        t.RequesterID,
			"company_id":          t.CompanyID,
			"unit_id":             t.UnitID,
			"extend_company_id":   t.ExtendCompanyID,
			"extend_unit_id":      t.ExtendUnitID,
			"vehicle_id":          t.VehicleID,
			"driver_id":           t.DriverID,
			"admin_id":            t.AdminID,
			"hrga_id":             t.HrgaID,
			"destination":         t.Destination,
			"destination_address": t.DestinationAddress,
			"purpose":             t.Purpose,
			"items_description":   t.ItemsDescription,
			"planned_departure":   t.PlannedDeparture,
			"planned_return":       t.PlannedReturn,
			"actual_departure":    t.ActualDeparture,
			"actual_return":       t.ActualReturn,
			"departure_km":        t.DepartureKm,
			"arrival_km":          t.ArrivalKm,
			"return_km":           t.ReturnKm,
			"total_distance":      t.TotalKm,
			"status":              t.Status,
			"admin_notes":         t.AdminNotes,
			"hrga_notes":          t.HrgaNotes,
			"rejection_reason":    t.RejectionReason,
			"admin_reviewed_at":   t.AdminReviewedAt,
			"hrga_approved_at":    t.HrgaApprovedAt,
			"created_at":          t.CreatedAt,
			"nopol":               t.Nopol,
			"merk":                t.Merk,
			"driver_name":         t.DriverName,
			"driver_phone":        t.DriverPhone,
			"requester_name":      t.RequesterName,
			"company_name":        t.CompanyName,
			"unit_name":           t.UnitName,
			"extend_company_name": extCName,
			"extend_unit_name":    extUName,
			"fuel_price_per_liter": fPrice,
			"checkpoints":         checkpoints,
			"events":              events,
		},
	})
}

// POST /api/trips
func CreateTrip(c *gin.Context) {
	var input struct {
		CompanyID          int     `json:"company_id" binding:"required"`
		UnitID             *int    `json:"unit_id"`
		Destination        string  `json:"destination" binding:"required"`
		DestinationAddress *string `json:"destination_address"`
		Purpose            string  `json:"purpose" binding:"required"`
		ItemsDescription   *string `json:"items_description"`
		PlannedDeparture   string  `json:"planned_departure" binding:"required"`
		PlannedReturn      *string `json:"planned_return"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var companyCode = "PT"
	var unitCode = "UNIT"

	_ = config.DB.QueryRow("SELECT code FROM companies WHERE id = ?", input.CompanyID).Scan(&companyCode)
	if input.UnitID != nil {
		_ = config.DB.QueryRow("SELECT code FROM units WHERE id = ?", *input.UnitID).Scan(&unitCode)
	}

	orderNum, err := generateOrderNumber(companyCode, unitCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal generate nomor order"})
		return
	}

	res, err := config.DB.Exec(
		`INSERT INTO trip_orders (order_number, requester_id, company_id, unit_id, destination, destination_address, purpose, items_description, planned_departure, planned_return, status)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		orderNum, user.ID, input.CompanyID, input.UnitID, input.Destination, input.DestinationAddress, input.Purpose, input.ItemsDescription, input.PlannedDeparture, input.PlannedReturn, "pending",
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menyimpan trip order: " + err.Error()})
		return
	}

	insertID, _ := res.LastInsertId()

	// Notify Super Admin, Admin GA & Staff GA roles
	_ = CreateNotificationForRoles([]string{"super_admin", "admin_ga", "ga"}, 
		"Order Perjalanan Baru", 
		"Order baru ke " + input.Destination + " diajukan oleh " + user.Name + ".", 
		"info", "trips", int(insertID), "trip")

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID, "order_number": orderNum}})
}

// PUT /api/trips/:id/withdraw
func WithdrawTrip(c *gin.Context) {
	tripID := c.Param("id")
	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var requesterID int
	var status string
	err := config.DB.QueryRow("SELECT requester_id, status FROM trip_orders WHERE id = ?", tripID).Scan(&requesterID, &status)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Order tidak ditemukan"})
		return
	}

	if requesterID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Anda tidak memiliki hak untuk menarik order ini"})
		return
	}

	if status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Hanya order yang berstatus PENDING yang dapat ditarik"})
		return
	}

	_, err = config.DB.Exec("UPDATE trip_orders SET status='cancelled', hrga_notes='Ditarik oleh pembuat order' WHERE id=?", tripID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Order berhasil ditarik"})
}

// PUT /api/trips/:id/admin-pre-review
func AdminPreReviewTrip(c *gin.Context) {
	tripID := c.Param("id")
	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var input struct {
		AdminNotes string `json:"admin_notes"`
		Action     string `json:"action"` // accept / reject
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	var status string
	var requesterID int
	var destination string
	err := config.DB.QueryRow("SELECT status, requester_id, destination FROM trip_orders WHERE id = ? AND status = 'pending'", tripID).Scan(&status, &requesterID, &destination)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Order tidak ditemukan atau bukan status pending"})
		return
	}

	intID, _ := strconv.Atoi(tripID)

	if input.Action == "reject" {
		_, err = config.DB.Exec(
			"UPDATE trip_orders SET status='rejected', rejection_reason=?, admin_id=?, admin_reviewed_at=NOW() WHERE id=?",
			input.AdminNotes, user.ID, tripID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
			return
		}
		
		// Notify requester
		_ = CreateNotificationForUser(requesterID, "Order Perjalanan Ditolak", "Order baru ke " + destination + " ditolak oleh Admin GA dengan alasan: " + input.AdminNotes, "danger", "trips", intID, "trip")
		
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Order ditolak"})
		return
	}

	_, err = config.DB.Exec(
		"UPDATE trip_orders SET status='admin_review', admin_notes=?, admin_id=?, admin_reviewed_at=NOW() WHERE id=?",
		input.AdminNotes, user.ID, tripID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	// Notify requester
	_ = CreateNotificationForUser(requesterID, "Order Perjalanan Direview", "Order baru ke " + destination + " telah direview oleh Admin GA. Menunggu pembuatan Surat Dinas.", "info", "trips", intID, "trip")

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Order disetujui, siap untuk dibuat Surat Dinas"})
}

// POST /api/trips/:id/create-dinas
func CreateDinas(c *gin.Context) {
	tripID := c.Param("id")
	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	type AssignmentInput struct {
		VehicleID int     `json:"vehicle_id" binding:"required"`
		DriverID  int     `json:"driver_id" binding:"required"`
		UnitID    *int    `json:"unit_id"`
		Notes     *string `json:"notes"`
	}

	var input struct {
		AdminNotes  string            `json:"admin_notes"`
		Assignments []AssignmentInput `json:"assignments"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	if len(input.Assignments) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Minimal 1 assignment driver & kendaraan diperlukan"})
		return
	}

	var companyCode, unitCode string
	var status, destination string
	var requesterID int
	err := config.DB.QueryRow(
		`SELECT t.status, t.requester_id, t.destination, c.code as company_code, un.code as unit_code
		 FROM trip_orders t
		 LEFT JOIN companies c ON t.company_id = c.id
		 LEFT JOIN units un ON t.unit_id = un.id
		 WHERE t.id = ? AND t.status = 'admin_review'`, tripID,
	).Scan(&status, &requesterID, &destination, &companyCode, &unitCode)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Order tidak ditemukan atau belum di-review admin"})
		return
	}

	spdNumber, err := generateSpdNumber(companyCode, unitCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal generate nomor SPD"})
		return
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	firstAssignment := input.Assignments[0]
	_, err = tx.Exec(
		`UPDATE trip_orders SET
			spd_number=?, status='waiting_hrga',
			vehicle_id=?, driver_id=?,
			admin_notes=?, admin_id=?, admin_reviewed_at=NOW()
		 WHERE id=?`,
		spdNumber, firstAssignment.VehicleID, firstAssignment.DriverID,
		input.AdminNotes, user.ID, tripID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal update trip: " + err.Error()})
		return
	}

	_, err = tx.Exec("DELETE FROM trip_assignments WHERE trip_id = ?", tripID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	for idx, a := range input.Assignments {
		_, err = tx.Exec(
			`INSERT INTO trip_assignments (trip_id, vehicle_id, driver_id, unit_id, sequence_no, notes)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			tripID, a.VehicleID, a.DriverID, a.UnitID, idx+1, a.Notes,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal insert assignment: " + err.Error()})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	intID, _ := strconv.Atoi(tripID)
	// Notify requester
	_ = CreateNotificationForUser(requesterID, "Surat Dinas Dibuat", "Surat Dinas nomor " + spdNumber + " ke " + destination + " telah dibuat oleh Admin GA dan menunggu persetujuan Staff GA.", "info", "trips", intID, "trip")
	// Notify Staff GA roles
	_ = CreateNotificationForRoles([]string{"super_admin", "ga"}, "Surat Dinas Menunggu Approval", "Surat Dinas " + spdNumber + " ke " + destination + " menunggu persetujuan Anda.", "warning", "trips", intID, "trip")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"spd_number": spdNumber},
		"message": "Surat Dinas " + spdNumber + " berhasil dibuat dan dikirim ke GA untuk persetujuan",
	})
}

// GET /api/trips/:id/assignments
func GetTripAssignments(c *gin.Context) {
	tripID := c.Param("id")

	query := `SELECT ta.id, ta.trip_id, ta.vehicle_id, ta.driver_id, ta.unit_id, ta.sequence_no, ta.notes, ta.created_at,
	                 d.name as driver_name, d.phone as driver_phone, d.employee_id,
	                 v.nopol, v.merk, v.model, un.name as unit_name
	          FROM trip_assignments ta
	          LEFT JOIN drivers d ON ta.driver_id = d.id
	          LEFT JOIN vehicles v ON ta.vehicle_id = v.id
	          LEFT JOIN units un ON ta.unit_id = un.id
	          WHERE ta.trip_id = ? ORDER BY ta.sequence_no`

	rows, err := config.DB.Query(query, tripID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	type AssignmentDetail struct {
		models.TripAssignment
		DriverPhone *string `json:"driver_phone"`
		EmployeeID  string  `json:"employee_id"`
		Model       *string `json:"model"`
	}

	list := []AssignmentDetail{}
	for rows.Next() {
		var a AssignmentDetail
		var unitID sql.NullInt64
		var notes, phone, nopol, merk, model, unitName sql.NullString
		err := rows.Scan(
			&a.ID, &a.TripID, &a.VehicleID, &a.DriverID, &unitID, &a.SequenceNo, &notes, &a.AssignedAt,
			&a.DriverName, &phone, &a.EmployeeID, &nopol, &merk, &model, &unitName,
		)
		if err == nil {
			if unitID.Valid {
				id := int(unitID.Int64)
				a.UnitID = &id
			}
			if notes.Valid {
				val := notes.String
				a.Notes = &val
			}
			if phone.Valid {
				a.DriverPhone = &phone.String
			}
			if nopol.Valid {
				a.Nopol = &nopol.String
			}
			if merk.Valid {
				a.Merk = &merk.String
			}
			if model.Valid {
				a.Model = &model.String
			}
			if unitName.Valid {
				a.UnitName = &unitName.String
			}
			list = append(list, a)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": list})
}

// PUT /api/trips/:id/admin-review (legacy/fallback)
func AdminReviewTrip(c *gin.Context) {
	tripID := c.Param("id")
	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var input struct {
		VehicleID  *int    `json:"vehicle_id"`
		DriverID   *int    `json:"driver_id"`
		AdminNotes string  `json:"admin_notes"`
		Action     string  `json:"action"` // accept / reject
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	if input.Action == "reject" {
		_, err := config.DB.Exec(
			"UPDATE trip_orders SET status='rejected', rejection_reason=?, admin_id=?, admin_reviewed_at=NOW() WHERE id=?",
			input.AdminNotes, user.ID, tripID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Trip rejected"})
		return
	}

	var finalDriverID = input.DriverID
	if finalDriverID == nil && input.VehicleID != nil {
		var activeDrvID int
		err := config.DB.QueryRow(
			"SELECT driver_id FROM driver_assignments WHERE vehicle_id = ? AND status = 'active' LIMIT 1",
			*input.VehicleID,
		).Scan(&activeDrvID)
		if err == nil {
			finalDriverID = &activeDrvID
		}
	}

	_, err := config.DB.Exec(
		"UPDATE trip_orders SET status='admin_review', vehicle_id=?, driver_id=?, admin_notes=?, admin_id=?, admin_reviewed_at=NOW() WHERE id=?",
		input.VehicleID, finalDriverID, input.AdminNotes, user.ID, tripID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Submitted to HRGA"})
}

// PUT /api/trips/:id/hrga-approve
func HrgaApproveTrip(c *gin.Context) {
	tripID := c.Param("id")
	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var input struct {
		HrgaNotes string `json:"hrga_notes"`
		Action    string `json:"action"` // accept / reject
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	var spdNumber, status, destination string
	var requesterID int
	err := config.DB.QueryRow(
		"SELECT spd_number, status, requester_id, destination FROM trip_orders WHERE id = ? AND status IN ('waiting_hrga','admin_review')",
		tripID,
	).Scan(&spdNumber, &status, &requesterID, &destination)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Surat Dinas tidak ditemukan atau sudah diproses"})
		return
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	intID, _ := strconv.Atoi(tripID)

	if input.Action == "reject" {
		_, err = tx.Exec(
			"UPDATE trip_orders SET status='rejected', rejection_reason=?, hrga_id=?, hrga_reviewed_at=NOW() WHERE id=?",
			input.HrgaNotes, user.ID, tripID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
			return
		}
		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
			return
		}
		
		// Notify requester
		_ = CreateNotificationForUser(requesterID, "Surat Dinas Ditolak", "Surat Dinas " + spdNumber + " ke " + destination + " ditolak oleh GA dengan alasan: " + input.HrgaNotes, "danger", "trips", intID, "trip")
		
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Surat Dinas ditolak oleh GA"})
		return
	}

	_, err = tx.Exec(
		"UPDATE trip_orders SET status='approved', hrga_notes=?, hrga_id=?, hrga_reviewed_at=NOW() WHERE id=?",
		input.HrgaNotes, user.ID, tripID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	// Update driver & vehicle status to on_duty & in_use
	var pDriverID, pVehicleID sql.NullInt64
	_ = tx.QueryRow("SELECT driver_id, vehicle_id FROM trip_orders WHERE id=?", tripID).Scan(&pDriverID, &pVehicleID)

	if pDriverID.Valid {
		_, _ = tx.Exec("UPDATE drivers SET status='on_duty' WHERE id=?", pDriverID.Int64)
	}
	if pVehicleID.Valid {
		_, _ = tx.Exec("UPDATE vehicles SET status='in_use' WHERE id=?", pVehicleID.Int64)
	}

	rowsAss, err := tx.Query("SELECT driver_id, vehicle_id FROM trip_assignments WHERE trip_id=?", tripID)
	if err == nil {
		var drivers []int
		var vehicles []int
		for rowsAss.Next() {
			var dID, vID int
			if err := rowsAss.Scan(&dID, &vID); err == nil {
				drivers = append(drivers, dID)
				vehicles = append(vehicles, vID)
			}
		}
		rowsAss.Close()

		for _, dID := range drivers {
			_, _ = tx.Exec("UPDATE drivers SET status='on_duty' WHERE id=?", dID)
		}
		for _, vID := range vehicles {
			_, _ = tx.Exec("UPDATE vehicles SET status='in_use' WHERE id=?", vID)
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	// Notify requester
	_ = CreateNotificationForUser(requesterID, "Surat Dinas Disetujui", "Surat Dinas " + spdNumber + " ke " + destination + " disetujui oleh GA. Perjalanan dinas sekarang aktif.", "success", "trips", intID, "trip")

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Surat Dinas " + spdNumber + " disetujui — Dinas sekarang AKTIF"})
}

// PUT /api/trips/:id/hrga-review (legacy fallback)
func HrgaReviewTrip(c *gin.Context) {
	tripID := c.Param("id")
	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var input struct {
		VehicleID *int   `json:"vehicle_id"`
		DriverID  *int   `json:"driver_id"`
		HrgaNotes string `json:"hrga_notes"`
		Action    string `json:"action"` // accept / reject
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	if input.Action == "reject" {
		_, err = tx.Exec(
			"UPDATE trip_orders SET status='rejected', rejection_reason=?, hrga_id=?, hrga_reviewed_at=NOW() WHERE id=?",
			input.HrgaNotes, user.ID, tripID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
			return
		}
	} else {
		query := `UPDATE trip_orders SET status='approved', hrga_notes=?, hrga_id=?, hrga_reviewed_at=NOW()`
		params := []interface{}{input.HrgaNotes, user.ID}
		if input.VehicleID != nil {
			query += ", vehicle_id=?"
			params = append(params, *input.VehicleID)
		}
		if input.DriverID != nil {
			query += ", driver_id=?"
			params = append(params, *input.DriverID)
		}
		query += " WHERE id=?"
		params = append(params, tripID)

		_, err = tx.Exec(query, params...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
			return
		}

		// Update driver & vehicle status to on_duty & in_use
		var pDriverID, pVehicleID sql.NullInt64
		_ = tx.QueryRow("SELECT driver_id, vehicle_id FROM trip_orders WHERE id=?", tripID).Scan(&pDriverID, &pVehicleID)

		if pDriverID.Valid {
			_, _ = tx.Exec("UPDATE drivers SET status='on_duty' WHERE id=?", pDriverID.Int64)
		}
		if pVehicleID.Valid {
			_, _ = tx.Exec("UPDATE vehicles SET status='in_use' WHERE id=?", pVehicleID.Int64)
		}

		rowsAss, err := tx.Query("SELECT driver_id, vehicle_id FROM trip_assignments WHERE trip_id=?", tripID)
		if err == nil {
			for rowsAss.Next() {
				var dID, vID int
				if err := rowsAss.Scan(&dID, &vID); err == nil {
					_, _ = tx.Exec("UPDATE drivers SET status='on_duty' WHERE id=?", dID)
					_, _ = tx.Exec("UPDATE vehicles SET status='in_use' WHERE id=?", vID)
				}
			}
			rowsAss.Close()
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	message := "Trip approved"
	if input.Action == "reject" {
		message = "Trip rejected"
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": message})
}

// PUT /api/trips/:id/cancel
func CancelTrip(c *gin.Context) {
	tripID := c.Param("id")
	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var input struct {
		CancelReason string `json:"cancel_reason"`
	}
	_ = c.ShouldBindJSON(&input)

	var status, spdNumber string
	var pDriverID, pVehicleID sql.NullInt64

	err := config.DB.QueryRow(
		"SELECT status, driver_id, vehicle_id, spd_number FROM trip_orders WHERE id = ?",
		tripID,
	).Scan(&status, &pDriverID, &pVehicleID, &spdNumber)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Surat Dinas tidak ditemukan"})
		return
	}

	if status != "approved" && status != "in_progress" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Hanya Surat Dinas dengan status Disetujui (approved) atau Sedang Berjalan (in_progress) yang dapat dibatalkan"})
		return
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	cancelNotes := "Dibatalkan oleh HRGA"
	if input.CancelReason != "" {
		cancelNotes = "Dibatalkan HRGA: " + input.CancelReason
	}

	_, err = tx.Exec(
		"UPDATE trip_orders SET status='cancelled', hrga_notes=?, hrga_id=?, hrga_reviewed_at=NOW() WHERE id=?",
		cancelNotes, user.ID, tripID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	// Reset primary driver and vehicle
	if pDriverID.Valid {
		_, _ = tx.Exec("UPDATE drivers SET status='available' WHERE id=?", pDriverID.Int64)
	}
	if pVehicleID.Valid {
		_, _ = tx.Exec("UPDATE vehicles SET status='available' WHERE id=?", pVehicleID.Int64)
	}

	// Reset assigned drivers and vehicles
	rowsAss, err := tx.Query("SELECT driver_id, vehicle_id FROM trip_assignments WHERE trip_id=?", tripID)
	if err == nil {
		var drivers []int
		var vehicles []int
		for rowsAss.Next() {
			var dID, vID int
			if err := rowsAss.Scan(&dID, &vID); err == nil {
				drivers = append(drivers, dID)
				vehicles = append(vehicles, vID)
			}
		}
		rowsAss.Close()

		for _, dID := range drivers {
			_, _ = tx.Exec("UPDATE drivers SET status='available' WHERE id=?", dID)
		}
		for _, vID := range vehicles {
			_, _ = tx.Exec("UPDATE vehicles SET status='available' WHERE id=?", vID)
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Surat Dinas " + spdNumber + " berhasil dibatalkan"})
}

// PUT /api/trips/:id/extend
func ExtendTrip(c *gin.Context) {
	tripID := c.Param("id")

	var input struct {
		CompanyID   int     `json:"company_id" binding:"required"`
		UnitID      int     `json:"unit_id" binding:"required"`
		Destination string  `json:"destination" binding:"required"`
		Purpose     *string `json:"purpose"`
		Notes       *string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Perusahaan, unit, dan tujuan wajib diisi"})
		return
	}

	var status string
	err := config.DB.QueryRow("SELECT status FROM trip_orders WHERE id = ?", tripID).Scan(&status)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Perjalanan tidak ditemukan"})
		return
	}

	if status != "approved" && status != "in_progress" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Hanya perjalanan aktif yang dapat diperpanjang"})
		return
	}

	_, err = config.DB.Exec(
		`UPDATE trip_orders SET 
			is_extended = 1,
			extend_company_id = ?,
			extend_unit_id = ?,
			extend_destination = ?,
			extend_purpose = ?,
			extend_notes = ?
		 WHERE id = ?`,
		input.CompanyID, input.UnitID, input.Destination, input.Purpose, input.Notes, tripID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Perjalanan berhasil diperpanjang"})
}

// PUT /api/trips/:id/start
func StartTrip(c *gin.Context) {
	tripID := c.Param("id")

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE trip_orders SET status='in_progress', actual_departure=NOW() WHERE id=?", tripID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	var pDriverID, pVehicleID sql.NullInt64
	_ = tx.QueryRow("SELECT driver_id, vehicle_id FROM trip_orders WHERE id=?", tripID).Scan(&pDriverID, &pVehicleID)

	if pDriverID.Valid {
		_, _ = tx.Exec("UPDATE drivers SET status='on_duty' WHERE id=?", pDriverID.Int64)
	}
	if pVehicleID.Valid {
		_, _ = tx.Exec("UPDATE vehicles SET status='in_use' WHERE id=?", pVehicleID.Int64)
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Trip started"})
}

// PUT /api/trips/:id/complete
func CompleteTrip(c *gin.Context) {
	tripID := c.Param("id")

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE trip_orders SET status='completed', actual_return=NOW() WHERE id=?", tripID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	var pDriverID, pVehicleID sql.NullInt64
	_ = tx.QueryRow("SELECT driver_id, vehicle_id FROM trip_orders WHERE id=?", tripID).Scan(&pDriverID, &pVehicleID)

	if pDriverID.Valid {
		_, _ = tx.Exec("UPDATE drivers SET status='available' WHERE id=?", pDriverID.Int64)
	}
	if pVehicleID.Valid {
		_, _ = tx.Exec("UPDATE vehicles SET status='available' WHERE id=?", pVehicleID.Int64)
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Trip completed"})
}

// POST /api/trips/:id/checkpoints
func AddCheckpoint(c *gin.Context) {
	tripID := c.Param("id")

	cType := c.PostForm("type")
	kmReadingStr := c.PostForm("km_reading")
	latitudeStr := c.PostForm("latitude")
	longitudeStr := c.PostForm("longitude")
	address := c.PostForm("address")
	accuracyStr := c.PostForm("location_accuracy")
	fuelLitersStr := c.PostForm("fuel_liters")
	fuelCostStr := c.PostForm("fuel_cost")
	notes := c.PostForm("notes")

	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var kmReading *int
	if kmReadingStr != "" {
		if val, err := strconv.Atoi(kmReadingStr); err == nil {
			kmReading = &val
		}
	}

	var lat, lng *float64
	if latitudeStr != "" {
		if val, err := strconv.ParseFloat(latitudeStr, 64); err == nil {
			lat = &val
		}
	}
	if longitudeStr != "" {
		if val, err := strconv.ParseFloat(longitudeStr, 64); err == nil {
			lng = &val
		}
	}

	var accuracy *float64
	if accuracyStr != "" {
		if val, err := strconv.ParseFloat(accuracyStr, 64); err == nil {
			accuracy = &val
		}
	}

	var fuelLiters, fuelCost *float64
	if fuelLitersStr != "" {
		if val, err := strconv.ParseFloat(fuelLitersStr, 64); err == nil {
			fuelLiters = &val
		}
	}
	if fuelCostStr != "" {
		if val, err := strconv.ParseFloat(fuelCostStr, 64); err == nil {
			fuelCost = &val
		}
	}

	var photoKm, photoNota, photoPump, photoActivity *string

	if file, err := c.FormFile("photo_km"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "trips"); err == nil {
			photoKm = &path
		}
	}
	if file, err := c.FormFile("photo_nota"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "trips"); err == nil {
			photoNota = &path
		}
	}
	if file, err := c.FormFile("photo_pump"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "trips"); err == nil {
			photoPump = &path
		}
	}
	if file, err := c.FormFile("photo_activity"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "trips"); err == nil {
			photoActivity = &path
		}
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	var seq int
	_ = tx.QueryRow("SELECT COALESCE(MAX(sequence_number), 0)+1 FROM trip_checkpoints WHERE trip_id=?", tripID).Scan(&seq)

	res, err := tx.Exec(
		`INSERT INTO trip_checkpoints (trip_id, sequence_number, type, km_reading, latitude, longitude, address, location_accuracy, photo_km, photo_nota, photo_pump, photo_activity, fuel_liters, fuel_cost, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		tripID, seq, cType, kmReading, lat, lng, address, accuracy, photoKm, photoNota, photoPump, photoActivity, fuelLiters, fuelCost, notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menyimpan checkpoint: " + err.Error()})
		return
	}

	// Update Trip mileage metrics
	if kmReading != nil {
		if cType == "departure" {
			_, _ = tx.Exec("UPDATE trip_orders SET departure_km=? WHERE id=?", *kmReading, tripID)
		}
		if cType == "arrival" || cType == "unloading" || cType == "extend_unloading" {
			_, _ = tx.Exec("UPDATE trip_orders SET arrival_km=? WHERE id=?", *kmReading, tripID)
		}
		if cType == "return_arrival" {
			_, _ = tx.Exec("UPDATE trip_orders SET return_km=?, total_distance=?-departure_km WHERE id=?", *kmReading, *kmReading, tripID)
		}

		// Update vehicle mileage
		var vehicleID int
		err := tx.QueryRow("SELECT vehicle_id FROM trip_orders WHERE id=?", tripID).Scan(&vehicleID)
		if err == nil && vehicleID > 0 {
			var currentKm int
			_ = tx.QueryRow("SELECT current_km FROM vehicles WHERE id=?", vehicleID).Scan(&currentKm)

			_, _ = tx.Exec("UPDATE vehicles SET current_km=? WHERE id=? AND ? > current_km", *kmReading, vehicleID, *kmReading)

			labels := map[string]string{
				"departure":        "Mulai Keberangkatan",
				"arrival":          "Sampai di Tujuan",
				"unloading":        "Mulai Bongkar",
				"extend_unloading": "Bongkar Tambahan",
				"return_departure": "Mulai Kepulangan",
				"return_arrival":   "Sampai di Kantor",
			}
			stepLabel, ok := labels[cType]
			if !ok {
				stepLabel = "Checkpoint " + cType
			}
			stepLabel += " (Dinas)"

			_, _ = tx.Exec(
				`INSERT INTO vehicle_km_logs (vehicle_id, km_reading, previous_km, recorded_date, recorded_by, photo, source, trip_id, notes)
				 VALUES (?, ?, ?, NOW(), ?, ?, 'trip', ?, ?)`,
				vehicleID, *kmReading, currentKm, user.ID, photoKm, tripID, stepLabel,
			)
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID}})
}

// POST /api/trips/:id/events
func AddTripEvent(c *gin.Context) {
	tripID := c.Param("id")

	eventType := c.PostForm("event_type")
	title := c.PostForm("title")
	description := c.PostForm("description")
	severity := c.PostForm("severity")
	latitudeStr := c.PostForm("latitude")
	longitudeStr := c.PostForm("longitude")
	currentKmStr := c.PostForm("current_km")
	address := c.PostForm("address")

	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var lat, lng *float64
	if latitudeStr != "" {
		if val, err := strconv.ParseFloat(latitudeStr, 64); err == nil {
			lat = &val
		}
	}
	if longitudeStr != "" {
		if val, err := strconv.ParseFloat(longitudeStr, 64); err == nil {
			lng = &val
		}
	}

	var currentKm *int
	if currentKmStr != "" {
		if val, err := strconv.Atoi(currentKmStr); err == nil {
			currentKm = &val
		}
	}

	var photo, photoKm *string
	// Multi-part file upload parsing
	form, err := c.MultipartForm()
	if err == nil {
		if files, ok := form.File["photo"]; ok && len(files) > 0 {
			if path, err := middleware.SaveUploadedFile(c, files[0], "trips"); err == nil {
				photo = &path
			}
		}
		if files, ok := form.File["photo_km"]; ok && len(files) > 0 {
			if path, err := middleware.SaveUploadedFile(c, files[0], "trips"); err == nil {
				photoKm = &path
			}
		}
	}

	dbEventType := eventType
	typeMapping := map[string]string{
		"breakdown":   "kerusakan_kendaraan",
		"accident":    "kecelakaan",
		"flat_tire":   "ban_bocor",
		"traffic_jam": "macet_parah",
		"other":       "lainnya",
	}
	if val, ok := typeMapping[eventType]; ok {
		dbEventType = val
	}
	if dbEventType == "" {
		dbEventType = "lainnya"
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	// 1. Insert Checkpoint for tracking
	var seq int
	_ = tx.QueryRow("SELECT COALESCE(MAX(sequence_number), 0)+1 FROM trip_checkpoints WHERE trip_id=?", tripID).Scan(&seq)

	var cpNotes = description
	var cpAddress = address
	if cpAddress == "" {
		cpAddress = "Kejadian Kendala"
	}

	resCp, err := tx.Exec(
		`INSERT INTO trip_checkpoints (trip_id, sequence_number, type, km_reading, latitude, longitude, address, photo_km, photo_activity, notes)
		 VALUES (?, ?, 'incident', ?, ?, ?, ?, ?, ?, ?)`,
		tripID, seq, currentKm, lat, lng, cpAddress, photoKm, photo, cpNotes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	checkpointID, _ := resCp.LastInsertId()

	// 2. Insert Event record
	var sev = severity
	if sev == "" {
		sev = "medium"
	}

	resEv, err := tx.Exec(
		`INSERT INTO trip_events (trip_id, checkpoint_id, event_type, title, description, severity, photo, latitude, longitude, current_km, photo_km)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		tripID, checkpointID, dbEventType, title, description, sev, photo, lat, lng, currentKm, photoKm,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	// 3. Update vehicle mileage
	var vehicleID int
	err = tx.QueryRow("SELECT vehicle_id FROM trip_orders WHERE id=?", tripID).Scan(&vehicleID)
	if err == nil && vehicleID > 0 && currentKm != nil {
		var prevKm int
		_ = tx.QueryRow("SELECT current_km FROM vehicles WHERE id=?", vehicleID).Scan(&prevKm)

		_, _ = tx.Exec("UPDATE vehicles SET current_km=? WHERE id=? AND ? > current_km", *currentKm, vehicleID, *currentKm)

		stepTitle := title
		if stepTitle == "" {
			stepTitle = "Kendala Perjalanan"
		}
		notesLabel := "Dari insiden dinas: " + stepTitle

		_, _ = tx.Exec(
			`INSERT INTO vehicle_km_logs (vehicle_id, km_reading, previous_km, recorded_date, recorded_by, photo, source, trip_id, notes)
			 VALUES (?, ?, ?, NOW(), ?, ?, 'trip', ?, ?)`,
			vehicleID, *currentKm, prevKm, user.ID, photoKm, tripID, notesLabel,
		)
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	insertID, _ := resEv.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID}})
}

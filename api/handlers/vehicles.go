package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"fleet-management-api/config"
	"fleet-management-api/middleware"
	"fleet-management-api/models"

	"github.com/gin-gonic/gin"
)

// GET /api/vehicles
func GetVehicles(c *gin.Context) {
	status := c.Query("status")
	unitID := c.Query("unit_id")
	vType := c.Query("type")
	search := c.Query("search")
	excludePhotos := c.Query("exclude_photos") == "true"

	photoFCol := "v.photo_front"
	photoBCol := "NULL as photo_back"
	photoLCol := "NULL as photo_left"
	photoRCol := "NULL as photo_right"

	if excludePhotos {
		photoFCol = "NULL as photo_front"
	}

	query := fmt.Sprintf(`SELECT v.id, v.vehicle_code, v.unit_id, v.nopol, v.merk, v.model, v.type, v.year, v.color, v.chassis_number, v.engine_number,
	                 v.capacity_ton, v.fuel_type, %s, %s, %s, %s, v.current_km,
	                 v.status, v.ownership, v.notes, v.is_active, u.name as unit_name, c.name as company_name, c.id as company_id,
	                 (EXISTS (SELECT 1 FROM trip_orders WHERE vehicle_id = v.id) OR
	                  EXISTS (SELECT 1 FROM service_tickets WHERE vehicle_id = v.id) OR
	                  EXISTS (SELECT 1 FROM work_orders WHERE vehicle_id = v.id)) as has_transactions
	          FROM vehicles v
	          LEFT JOIN units u ON v.unit_id = u.id 
	          LEFT JOIN companies c ON u.company_id = c.id
	          WHERE v.is_active = 1`, photoFCol, photoBCol, photoLCol, photoRCol)

	var params []interface{}

	if status != "" {
		query += " AND v.status = ?"
		params = append(params, status)
	}
	if unitID != "" {
		query += " AND v.unit_id = ?"
		params = append(params, unitID)
	}
	if vType != "" {
		query += " AND v.type = ?"
		params = append(params, vType)
	}
	if search != "" {
		query += " AND (v.nopol LIKE ? OR v.merk LIKE ? OR v.model LIKE ? OR v.vehicle_code LIKE ?)"
		params = append(params, "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	query += " ORDER BY v.nopol"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	vehicles := []models.Vehicle{}
	for rows.Next() {
		var v models.Vehicle
		var unitIDVal, companyIDVal sql.NullInt64
		var vehicleCodeVal, model, color, chassis, engine, photoF, photoB, photoL, photoR, notes sql.NullString
		var unitName, companyName sql.NullString
		var year sql.NullInt64
		var capacity sql.NullFloat64
		var hasTransactionsVal bool

		err := rows.Scan(&v.ID, &vehicleCodeVal, &unitIDVal, &v.Nopol, &v.Merk, &model, &v.Type, &year, &color, &chassis, &engine,
			&capacity, &v.FuelType, &photoF, &photoB, &photoL, &photoR, &v.CurrentKm,
			&v.Status, &v.Ownership, &notes, &v.IsActive, &unitName, &companyName, &companyIDVal, &hasTransactionsVal)

		if err == nil {
			if vehicleCodeVal.Valid {
				v.VehicleCode = &vehicleCodeVal.String
			}
			if unitIDVal.Valid {
				id := int(unitIDVal.Int64)
				v.UnitID = &id
			}
			if companyIDVal.Valid {
				id := int(companyIDVal.Int64)
				v.CompanyID = &id
			}
			if model.Valid {
				v.Model = &model.String
			}
			if year.Valid {
				val := int(year.Int64)
				v.Year = &val
			}
			if color.Valid {
				v.Color = &color.String
			}
			if chassis.Valid {
				v.ChassisNumber = &chassis.String
			}
			if engine.Valid {
				v.EngineNumber = &engine.String
			}
			if capacity.Valid {
				v.CapacityTon = &capacity.Float64
			}
			if photoF.Valid {
				v.PhotoFront = &photoF.String
			}
			if photoB.Valid {
				v.PhotoBack = &photoB.String
			}
			if photoL.Valid {
				v.PhotoLeft = &photoL.String
			}
			if photoR.Valid {
				v.PhotoRight = &photoR.String
			}
			if notes.Valid {
				v.Notes = &notes.String
			}
			if unitName.Valid {
				v.UnitName = &unitName.String
			}
			if companyName.Valid {
				v.CompanyName = &companyName.String
			}
			v.HasTransactions = hasTransactionsVal
			vehicles = append(vehicles, v)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": vehicles})
}

// GET /api/vehicles/stats/summary
func GetVehiclesSummary(c *gin.Context) {
	var total int
	err := config.DB.QueryRow("SELECT COUNT(*) as count FROM vehicles WHERE is_active=1").Scan(&total)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	// Group by status
	rowsStatus, err := config.DB.Query("SELECT status, COUNT(*) as count FROM vehicles WHERE is_active=1 GROUP BY status")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rowsStatus.Close()

	byStatus := []gin.H{}
	for rowsStatus.Next() {
		var status string
		var count int
		if err := rowsStatus.Scan(&status, &count); err == nil {
			byStatus = append(byStatus, gin.H{"status": status, "count": count})
		}
	}

	// Group by type
	rowsType, err := config.DB.Query("SELECT type, COUNT(*) as count FROM vehicles WHERE is_active=1 GROUP BY type")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rowsType.Close()

	byType := []gin.H{}
	for rowsType.Next() {
		var vType string
		var count int
		if err := rowsType.Scan(&vType, &count); err == nil {
			byType = append(byType, gin.H{"type": vType, "count": count})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total":    total,
			"byStatus": byStatus,
			"byType":   byType,
		},
	})
}

// GET /api/vehicles/stats/by-date
func GetVehiclesStatsByDate(c *gin.Context) {
	date := c.Query("date")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	fromDate := dateFrom
	if fromDate == "" {
		fromDate = date
	}
	toDate := dateTo
	if toDate == "" {
		toDate = date
		if toDate == "" {
			toDate = dateFrom
		}
	}

	if fromDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Parameter date atau date_from diperlukan"})
		return
	}

	query := `
		SELECT v.id, v.unit_id, v.nopol, v.merk, v.model, v.type, v.year, v.color, v.chassis_number, v.engine_number,
		       v.capacity_ton, v.fuel_type, v.photo_front, v.photo_back, v.photo_left, v.photo_right, v.current_km,
		       v.ownership, v.notes, v.is_active, u.name as unit_name, c.name as company_name, c.id as company_id,
		  CASE 
		    WHEN v.status = 'maintenance' THEN 'maintenance'
		    WHEN EXISTS (
		      SELECT 1 FROM trip_orders t 
		      WHERE t.vehicle_id = v.id 
		        AND t.status IN ('approved', 'in_progress')
		        AND DATE(t.planned_departure) <= DATE(?)
		        AND COALESCE(DATE(t.planned_return), DATE(t.planned_departure)) >= DATE(?)
		    ) THEN 'in_use'
		    ELSE 'available'
		  END as status
		FROM vehicles v 
		LEFT JOIN units u ON v.unit_id = u.id 
		LEFT JOIN companies c ON u.company_id = c.id 
		WHERE v.is_active = 1
		ORDER BY v.nopol
	`

	rows, err := config.DB.Query(query, toDate, fromDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	vehicles := []models.Vehicle{}
	for rows.Next() {
		var v models.Vehicle
		var unitIDVal, companyIDVal sql.NullInt64
		var model, color, chassis, engine, photoF, photoB, photoL, photoR, notes sql.NullString
		var unitName, companyName sql.NullString
		var year sql.NullInt64
		var capacity sql.NullFloat64

		err := rows.Scan(&v.ID, &unitIDVal, &v.Nopol, &v.Merk, &model, &v.Type, &year, &color, &chassis, &engine,
			&capacity, &v.FuelType, &photoF, &photoB, &photoL, &photoR, &v.CurrentKm,
			&v.Ownership, &notes, &v.IsActive, &unitName, &companyName, &companyIDVal, &v.Status)

		if err == nil {
			if unitIDVal.Valid {
				id := int(unitIDVal.Int64)
				v.UnitID = &id
			}
			if companyIDVal.Valid {
				id := int(companyIDVal.Int64)
				v.CompanyID = &id
			}
			if model.Valid {
				v.Model = &model.String
			}
			if year.Valid {
				val := int(year.Int64)
				v.Year = &val
			}
			if color.Valid {
				v.Color = &color.String
			}
			if chassis.Valid {
				v.ChassisNumber = &chassis.String
			}
			if engine.Valid {
				v.EngineNumber = &engine.String
			}
			if capacity.Valid {
				v.CapacityTon = &capacity.Float64
			}
			if photoF.Valid {
				v.PhotoFront = &photoF.String
			}
			if photoB.Valid {
				v.PhotoBack = &photoB.String
			}
			if photoL.Valid {
				v.PhotoLeft = &photoL.String
			}
			if photoR.Valid {
				v.PhotoRight = &photoR.String
			}
			if notes.Valid {
				v.Notes = &notes.String
			}
			if unitName.Valid {
				v.UnitName = &unitName.String
			}
			if companyName.Valid {
				v.CompanyName = &companyName.String
			}
			vehicles = append(vehicles, v)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": vehicles})
}

// GET /api/vehicles/:id/assigned-driver
func GetVehicleAssignedDriver(c *gin.Context) {
	vehicleID := c.Param("id")

	query := `SELECT d.id, d.name, d.employee_id, d.phone, d.status,
	                 da.id as assignment_id, da.assigned_date, da.notes as assignment_notes
	          FROM driver_assignments da
	          JOIN drivers d ON da.driver_id = d.id
	          WHERE da.vehicle_id = ? AND da.status = 'active'
	          ORDER BY da.assigned_date DESC
	          LIMIT 1`

	row := config.DB.QueryRow(query, vehicleID)

	var d struct {
		ID              int     `json:"id"`
		Name            string  `json:"name"`
		EmployeeID      string  `json:"employee_id"`
		Phone           string  `json:"phone"`
		Status          string  `json:"status"`
		AssignmentID    int     `json:"assignment_id"`
		AssignedDate    string  `json:"assigned_date"`
		AssignmentNotes *string `json:"assignment_notes"`
	}

	var notes sql.NullString
	err := row.Scan(&d.ID, &d.Name, &d.EmployeeID, &d.Phone, &d.Status, &d.AssignmentID, &d.AssignedDate, &notes)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": nil, "message": "Tidak ada driver yang di-assign ke kendaraan ini"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	if notes.Valid {
		d.AssignmentNotes = &notes.String
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": d})
}

// GET /api/vehicles/:id
func GetVehicleByID(c *gin.Context) {
	vehicleID := c.Param("id")

	query := `SELECT v.id, v.vehicle_code, v.unit_id, v.nopol, v.merk, v.model, v.type, v.year, v.color, v.chassis_number, v.engine_number,
	                 v.capacity_ton, v.fuel_type, v.photo_front, v.photo_back, v.photo_left, v.photo_right, v.current_km,
	                 v.status, v.ownership, v.notes, v.is_active, u.name as unit_name, c.name as company_name, c.id as company_id,
	                 (EXISTS (SELECT 1 FROM trip_orders WHERE vehicle_id = v.id) OR
	                  EXISTS (SELECT 1 FROM service_tickets WHERE vehicle_id = v.id) OR
	                  EXISTS (SELECT 1 FROM work_orders WHERE vehicle_id = v.id)) as has_transactions
	          FROM vehicles v
	          LEFT JOIN units u ON v.unit_id = u.id 
	          LEFT JOIN companies c ON u.company_id = c.id
	          WHERE v.id = ?`

	row := config.DB.QueryRow(query, vehicleID)

	var v models.Vehicle
	var unitIDVal, companyIDVal sql.NullInt64
	var vehicleCodeVal, model, color, chassis, engine, photoF, photoB, photoL, photoR, notes sql.NullString
	var unitName, companyName sql.NullString
	var year sql.NullInt64
	var capacity sql.NullFloat64
	var hasTransactionsVal bool

	err := row.Scan(&v.ID, &vehicleCodeVal, &unitIDVal, &v.Nopol, &v.Merk, &model, &v.Type, &year, &color, &chassis, &engine,
		&capacity, &v.FuelType, &photoF, &photoB, &photoL, &photoR, &v.CurrentKm,
		&v.Status, &v.Ownership, &notes, &v.IsActive, &unitName, &companyName, &companyIDVal, &hasTransactionsVal)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Kendaraan tidak ditemukan"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	if vehicleCodeVal.Valid {
		v.VehicleCode = &vehicleCodeVal.String
	}
	if unitIDVal.Valid {
		id := int(unitIDVal.Int64)
		v.UnitID = &id
	}
	if companyIDVal.Valid {
		id := int(companyIDVal.Int64)
		v.CompanyID = &id
	}
	if model.Valid {
		v.Model = &model.String
	}
	if year.Valid {
		val := int(year.Int64)
		v.Year = &val
	}
	if color.Valid {
		v.Color = &color.String
	}
	if chassis.Valid {
		v.ChassisNumber = &chassis.String
	}
	if engine.Valid {
		v.EngineNumber = &engine.String
	}
	if capacity.Valid {
		v.CapacityTon = &capacity.Float64
	}
	if photoF.Valid {
		v.PhotoFront = &photoF.String
	}
	if photoB.Valid {
		v.PhotoBack = &photoB.String
	}
	if photoL.Valid {
		v.PhotoLeft = &photoL.String
	}
	if photoR.Valid {
		v.PhotoRight = &photoR.String
	}
	if notes.Valid {
		v.Notes = &notes.String
	}
	if unitName.Valid {
		v.UnitName = &unitName.String
	}
	if companyName.Valid {
		v.CompanyName = &companyName.String
	}
	v.HasTransactions = hasTransactionsVal

	c.JSON(http.StatusOK, gin.H{"success": true, "data": v})
}

// POST /api/vehicles
func CreateVehicle(c *gin.Context) {
	// Parse multipart fields manually
	unitIDStr := c.PostForm("unit_id")
	vehicleCode := c.PostForm("vehicle_code")
	nopol := c.PostForm("nopol")
	merk := c.PostForm("merk")
	model := c.PostForm("model")
	vType := c.PostForm("type")
	yearStr := c.PostForm("year")
	color := c.PostForm("color")
	chassisNumber := c.PostForm("chassis_number")
	engineNumber := c.PostForm("engine_number")
	capacityStr := c.PostForm("capacity_ton")
	fuelType := c.PostForm("fuel_type")
	currentKmStr := c.PostForm("current_km")
	ownership := c.PostForm("ownership")
	notes := c.PostForm("notes")

	var unitID *int
	if unitIDStr != "" {
		if id, err := strconv.Atoi(unitIDStr); err == nil {
			unitID = &id
		}
	}

	var year *int
	if yearStr != "" {
		if yr, err := strconv.Atoi(yearStr); err == nil {
			year = &yr
		}
	}

	var capacity *float64
	if capacityStr != "" {
		if capVal, err := strconv.ParseFloat(capacityStr, 64); err == nil {
			capacity = &capVal
		}
	}

	currentKm := 0
	if currentKmStr != "" {
		if km, err := strconv.Atoi(currentKmStr); err == nil {
			currentKm = km
		}
	}

	if vType == "" {
		vType = "truck"
	}
	if fuelType == "" {
		fuelType = "solar"
	}
	if ownership == "" {
		ownership = "owned"
	}

	var photoFront, photoBack, photoLeft, photoRight *string

	// Check files
	if file, err := c.FormFile("photo_front"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "vehicles"); err == nil {
			photoFront = &path
		}
	}
	if file, err := c.FormFile("photo_back"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "vehicles"); err == nil {
			photoBack = &path
		}
	}
	if file, err := c.FormFile("photo_left"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "vehicles"); err == nil {
			photoLeft = &path
		}
	}
	if file, err := c.FormFile("photo_right"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "vehicles"); err == nil {
			photoRight = &path
		}
	}

	var vCode *string
	if strings.TrimSpace(vehicleCode) != "" {
		trimmed := strings.TrimSpace(vehicleCode)
		vCode = &trimmed
	}

	res, err := config.DB.Exec(
		`INSERT INTO vehicles (unit_id, vehicle_code, nopol, merk, model, type, year, color, chassis_number, engine_number, capacity_ton, fuel_type, photo_front, photo_back, photo_left, photo_right, current_km, ownership, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		unitID, vCode, nopol, merk, model, vType, year, color, chassisNumber, engineNumber, capacity, fuelType, photoFront, photoBack, photoLeft, photoRight, currentKm, ownership, notes,
	)

	if err != nil {
		if strings.Contains(err.Error(), "Error 1062") {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Nopol atau Kode Kendaraan sudah terdaftar"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID}, "message": "Berhasil ditambahkan"})
}

// PUT /api/vehicles/:id
func UpdateVehicle(c *gin.Context) {
	vehicleID := c.Param("id")

	unitIDStr := c.PostForm("unit_id")
	vehicleCode := c.PostForm("vehicle_code")
	nopol := c.PostForm("nopol")
	merk := c.PostForm("merk")
	model := c.PostForm("model")
	vType := c.PostForm("type")
	yearStr := c.PostForm("year")
	color := c.PostForm("color")
	chassisNumber := c.PostForm("chassis_number")
	engineNumber := c.PostForm("engine_number")
	capacityStr := c.PostForm("capacity_ton")
	fuelType := c.PostForm("fuel_type")
	currentKmStr := c.PostForm("current_km")
	status := c.PostForm("status")
	ownership := c.PostForm("ownership")
	notes := c.PostForm("notes")

	var unitID *int
	if unitIDStr != "" {
		if id, err := strconv.Atoi(unitIDStr); err == nil {
			unitID = &id
		}
	}

	var year *int
	if yearStr != "" {
		if yr, err := strconv.Atoi(yearStr); err == nil {
			year = &yr
		}
	}

	var capacity *float64
	if capacityStr != "" {
		if capVal, err := strconv.ParseFloat(capacityStr, 64); err == nil {
			capacity = &capVal
		}
	}

	currentKm := 0
	if currentKmStr != "" {
		if km, err := strconv.Atoi(currentKmStr); err == nil {
			currentKm = km
		}
	}

	var photoFront, photoBack, photoLeft, photoRight *string

	if file, err := c.FormFile("photo_front"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "vehicles"); err == nil {
			photoFront = &path
		}
	}
	if file, err := c.FormFile("photo_back"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "vehicles"); err == nil {
			photoBack = &path
		}
	}
	if file, err := c.FormFile("photo_left"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "vehicles"); err == nil {
			photoLeft = &path
		}
	}
	if file, err := c.FormFile("photo_right"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "vehicles"); err == nil {
			photoRight = &path
		}
	}

	var vCode *string
	if strings.TrimSpace(vehicleCode) != "" {
		trimmed := strings.TrimSpace(vehicleCode)
		vCode = &trimmed
	}

	query := `UPDATE vehicles SET unit_id=?, vehicle_code=?, nopol=?, merk=?, model=?, type=?, year=?, color=?, chassis_number=?, engine_number=?, capacity_ton=?, fuel_type=?, current_km=?, status=?, ownership=?, notes=?`
	params := []interface{}{unitID, vCode, nopol, merk, model, vType, year, color, chassisNumber, engineNumber, capacity, fuelType, currentKm, status, ownership, notes}

	if photoFront != nil {
		query += ", photo_front=?"
		params = append(params, *photoFront)
	}
	if photoBack != nil {
		query += ", photo_back=?"
		params = append(params, *photoBack)
	}
	if photoLeft != nil {
		query += ", photo_left=?"
		params = append(params, *photoLeft)
	}
	if photoRight != nil {
		query += ", photo_right=?"
		params = append(params, *photoRight)
	}

	query += " WHERE id=?"
	params = append(params, vehicleID)

	_, err := config.DB.Exec(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Berhasil diupdate"})
}

// DELETE /api/vehicles/:id
func DeleteVehicle(c *gin.Context) {
	vehicleID := c.Param("id")

	// Check if there are transactions
	var hasTx bool
	queryCheck := `SELECT (
		EXISTS (SELECT 1 FROM trip_orders WHERE vehicle_id = ?) OR
		EXISTS (SELECT 1 FROM service_tickets WHERE vehicle_id = ?) OR
		EXISTS (SELECT 1 FROM work_orders WHERE vehicle_id = ?)
	)`
	err := config.DB.QueryRow(queryCheck, vehicleID, vehicleID, vehicleID).Scan(&hasTx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	if hasTx {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Kendaraan tidak bisa dihapus karena memiliki transaksi"})
		return
	}

	_, err = config.DB.Exec("UPDATE vehicles SET is_active = 0 WHERE id = ?", vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Kendaraan berhasil dihapus"})
}

// PUT /api/vehicles/:id/status
func UpdateVehicleStatus(c *gin.Context) {
	vehicleID := c.Param("id")

	var input struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		status := c.PostForm("status")
		if status == "" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Status is required"})
			return
		}
		input.Status = status
	}

	_, err := config.DB.Exec("UPDATE vehicles SET status = ? WHERE id = ?", input.Status, vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Status kendaraan berhasil diupdate"})
}

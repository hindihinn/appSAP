package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"fleet-management-api/config"
	"fleet-management-api/middleware"

	"github.com/gin-gonic/gin"
)

// GET /api/vehicle-legality
func GetVehicleLegalities(c *gin.Context) {
	vehicleID := c.Query("vehicle_id")
	status := c.Query("status")
	vType := c.Query("type")

	query := `SELECT vl.id, vl.vehicle_id, vl.type, vl.document_number, vl.issued_date, vl.expiry_date,
	                 vl.document_file, vl.reminder_days, vl.status, vl.notes, vl.created_at,
	                 v.nopol, v.merk, v.model 
	          FROM vehicle_legality vl 
	          JOIN vehicles v ON vl.vehicle_id = v.id 
	          WHERE 1=1`

	var params []interface{}

	if vehicleID != "" {
		query += " AND vl.vehicle_id = ?"
		params = append(params, vehicleID)
	}
	if status != "" {
		query += " AND vl.status = ?"
		params = append(params, status)
	}
	if vType != "" {
		query += " AND vl.type = ?"
		params = append(params, vType)
	}
	query += " ORDER BY vl.expiry_date ASC"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	type LegalityResponse struct {
		ID             int       `json:"id"`
		VehicleID      int       `json:"vehicle_id"`
		Type           string    `json:"type"`
		DocumentNumber *string   `json:"document_number"`
		IssuedDate     *string   `json:"issued_date"`
		ExpiryDate     time.Time `json:"expiry_date"`
		DocumentFile   *string   `json:"document_file"`
		ReminderDays   int       `json:"reminder_days"`
		Status         string    `json:"status"`
		Notes          *string   `json:"notes"`
		CreatedAt      time.Time `json:"created_at"`
		Nopol          string    `json:"nopol"`
		Merk           string    `json:"merk"`
		Model          *string   `json:"model"`
	}

	legalities := []LegalityResponse{}
	for rows.Next() {
		var l LegalityResponse
		var docNum, issuedDate, docFile, notes, model sql.NullString
		err := rows.Scan(&l.ID, &l.VehicleID, &l.Type, &docNum, &issuedDate, &l.ExpiryDate,
			&docFile, &l.ReminderDays, &l.Status, &notes, &l.CreatedAt, &l.Nopol, &l.Merk, &model)
		if err == nil {
			if docNum.Valid {
				l.DocumentNumber = &docNum.String
			}
			if issuedDate.Valid {
				l.IssuedDate = &issuedDate.String
			}
			if docFile.Valid {
				l.DocumentFile = &docFile.String
			}
			if notes.Valid {
				l.Notes = &notes.String
			}
			if model.Valid {
				l.Model = &model.String
			}
			legalities = append(legalities, l)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": legalities})
}

// GET /api/vehicle-legality/expiring
func GetExpiringVehicleLegalities(c *gin.Context) {
	daysStr := c.Query("days")
	days := 30
	if daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil {
			days = d
		}
	}

	query := `SELECT vl.id, vl.vehicle_id, vl.type, vl.document_number, vl.issued_date, vl.expiry_date,
	                 vl.document_file, vl.reminder_days, vl.status, vl.notes, vl.created_at,
	                 v.nopol, v.merk
	          FROM vehicle_legality vl 
	          JOIN vehicles v ON vl.vehicle_id = v.id 
	          WHERE vl.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) 
	          ORDER BY vl.expiry_date ASC`

	rows, err := config.DB.Query(query, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	type LegalityResponse struct {
		ID             int       `json:"id"`
		VehicleID      int       `json:"vehicle_id"`
		Type           string    `json:"type"`
		DocumentNumber *string   `json:"document_number"`
		IssuedDate     *string   `json:"issued_date"`
		ExpiryDate     time.Time `json:"expiry_date"`
		DocumentFile   *string   `json:"document_file"`
		ReminderDays   int       `json:"reminder_days"`
		Status         string    `json:"status"`
		Notes          *string   `json:"notes"`
		CreatedAt      time.Time `json:"created_at"`
		Nopol          string    `json:"nopol"`
		Merk           string    `json:"merk"`
	}

	results := []LegalityResponse{}
	for rows.Next() {
		var l LegalityResponse
		var docNum, issuedDate, docFile, notes sql.NullString
		err := rows.Scan(&l.ID, &l.VehicleID, &l.Type, &docNum, &issuedDate, &l.ExpiryDate,
			&docFile, &l.ReminderDays, &l.Status, &notes, &l.CreatedAt, &l.Nopol, &l.Merk)
		if err == nil {
			if docNum.Valid {
				l.DocumentNumber = &docNum.String
			}
			if issuedDate.Valid {
				l.IssuedDate = &issuedDate.String
			}
			if docFile.Valid {
				l.DocumentFile = &docFile.String
			}
			if notes.Valid {
				l.Notes = &notes.String
			}
			results = append(results, l)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": results})
}

// POST /api/vehicle-legality
func CreateVehicleLegality(c *gin.Context) {
	vehicleIDStr := c.PostForm("vehicle_id")
	lType := c.PostForm("type")
	documentNumber := c.PostForm("document_number")
	issuedDate := c.PostForm("issued_date")
	expiryDate := c.PostForm("expiry_date")
	reminderDaysStr := c.PostForm("reminder_days")
	notes := c.PostForm("notes")

	vehicleID, err := strconv.Atoi(vehicleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid vehicle_id"})
		return
	}

	reminderDays := 30
	if reminderDaysStr != "" {
		if r, err := strconv.Atoi(reminderDaysStr); err == nil {
			reminderDays = r
		}
	}

	var documentFile *string
	if file, err := c.FormFile("document_file"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "legality/vehicles"); err == nil {
			documentFile = &path
		}
	}

	var issuedVal interface{} = nil
	if issuedDate != "" {
		issuedVal = issuedDate
	}

	res, err := config.DB.Exec(
		`INSERT INTO vehicle_legality (vehicle_id, type, document_number, issued_date, expiry_date, document_file, reminder_days, notes) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		vehicleID, lType, documentNumber, issuedVal, expiryDate, documentFile, reminderDays, notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID}})
}

// PUT /api/vehicle-legality/:id
func UpdateVehicleLegality(c *gin.Context) {
	legalityID := c.Param("id")

	vehicleIDStr := c.PostForm("vehicle_id")
	lType := c.PostForm("type")
	documentNumber := c.PostForm("document_number")
	issuedDate := c.PostForm("issued_date")
	expiryDate := c.PostForm("expiry_date")
	reminderDaysStr := c.PostForm("reminder_days")
	status := c.PostForm("status")
	notes := c.PostForm("notes")

	vehicleID, err := strconv.Atoi(vehicleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid vehicle_id"})
		return
	}

	reminderDays := 30
	if reminderDaysStr != "" {
		if r, err := strconv.Atoi(reminderDaysStr); err == nil {
			reminderDays = r
		}
	}

	var documentFile *string
	if file, err := c.FormFile("document_file"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "legality/vehicles"); err == nil {
			documentFile = &path
		}
	}

	var issuedVal interface{} = nil
	if issuedDate != "" {
		issuedVal = issuedDate
	}

	query := `UPDATE vehicle_legality SET vehicle_id=?, type=?, document_number=?, issued_date=?, expiry_date=?, reminder_days=?, status=?, notes=?`
	params := []interface{}{vehicleID, lType, documentNumber, issuedVal, expiryDate, reminderDays, status, notes}

	if documentFile != nil {
		query += ", document_file=?"
		params = append(params, *documentFile)
	}

	query += " WHERE id=?"
	params = append(params, legalityID)

	_, err = config.DB.Exec(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Updated"})
}

// DELETE /api/vehicle-legality/:id
func DeleteVehicleLegality(c *gin.Context) {
	legalityID := c.Param("id")
	_, err := config.DB.Exec("DELETE FROM vehicle_legality WHERE id = ?", legalityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Deleted"})
}

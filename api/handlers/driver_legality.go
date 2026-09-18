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

// GET /api/driver-legality
func GetDriverLegalities(c *gin.Context) {
	driverID := c.Query("driver_id")
	status := c.Query("status")
	lType := c.Query("type")

	query := `SELECT dl.id, dl.driver_id, dl.type, dl.document_number, dl.issued_date, dl.expiry_date,
	                 dl.document_file, dl.reminder_days, dl.status, dl.notes, dl.created_at,
	                 d.name as driver_name, d.employee_id 
	          FROM driver_legality dl 
	          JOIN drivers d ON dl.driver_id = d.id 
	          WHERE 1=1`

	var params []interface{}

	if driverID != "" {
		query += " AND dl.driver_id = ?"
		params = append(params, driverID)
	}
	if status != "" {
		query += " AND dl.status = ?"
		params = append(params, status)
	}
	if lType != "" {
		query += " AND dl.type = ?"
		params = append(params, lType)
	}
	query += " ORDER BY dl.expiry_date ASC"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	type LegalityResponse struct {
		ID             int       `json:"id"`
		DriverID       int       `json:"driver_id"`
		Type           string    `json:"type"`
		DocumentNumber *string   `json:"document_number"`
		IssuedDate     *string   `json:"issued_date"`
		ExpiryDate     time.Time `json:"expiry_date"`
		DocumentFile   *string   `json:"document_file"`
		ReminderDays   int       `json:"reminder_days"`
		Status         string    `json:"status"`
		Notes          *string   `json:"notes"`
		CreatedAt      time.Time `json:"created_at"`
		DriverName     string    `json:"driver_name"`
		EmployeeID     string    `json:"employee_id"`
	}

	legalities := []LegalityResponse{}
	for rows.Next() {
		var l LegalityResponse
		var docNum, issuedDate, docFile, notes sql.NullString
		err := rows.Scan(&l.ID, &l.DriverID, &l.Type, &docNum, &issuedDate, &l.ExpiryDate,
			&docFile, &l.ReminderDays, &l.Status, &notes, &l.CreatedAt, &l.DriverName, &l.EmployeeID)
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
			legalities = append(legalities, l)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": legalities})
}

// GET /api/driver-legality/expiring
func GetExpiringDriverLegalities(c *gin.Context) {
	daysStr := c.Query("days")
	days := 30
	if daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil {
			days = d
		}
	}

	query := `SELECT dl.id, dl.driver_id, dl.type, dl.document_number, dl.issued_date, dl.expiry_date,
	                 dl.document_file, dl.reminder_days, dl.status, dl.notes, dl.created_at,
	                 d.name as driver_name
	          FROM driver_legality dl 
	          JOIN drivers d ON dl.driver_id = d.id 
	          WHERE dl.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) 
	          ORDER BY dl.expiry_date ASC`

	rows, err := config.DB.Query(query, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	type LegalityResponse struct {
		ID             int       `json:"id"`
		DriverID       int       `json:"driver_id"`
		Type           string    `json:"type"`
		DocumentNumber *string   `json:"document_number"`
		IssuedDate     *string   `json:"issued_date"`
		ExpiryDate     time.Time `json:"expiry_date"`
		DocumentFile   *string   `json:"document_file"`
		ReminderDays   int       `json:"reminder_days"`
		Status         string    `json:"status"`
		Notes          *string   `json:"notes"`
		CreatedAt      time.Time `json:"created_at"`
		DriverName     string    `json:"driver_name"`
	}

	results := []LegalityResponse{}
	for rows.Next() {
		var l LegalityResponse
		var docNum, issuedDate, docFile, notes sql.NullString
		err := rows.Scan(&l.ID, &l.DriverID, &l.Type, &docNum, &issuedDate, &l.ExpiryDate,
			&docFile, &l.ReminderDays, &l.Status, &notes, &l.CreatedAt, &l.DriverName)
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

// POST /api/driver-legality
func CreateDriverLegality(c *gin.Context) {
	driverIDStr := c.PostForm("driver_id")
	lType := c.PostForm("type")
	documentNumber := c.PostForm("document_number")
	issuedDate := c.PostForm("issued_date")
	expiryDate := c.PostForm("expiry_date")
	reminderDaysStr := c.PostForm("reminder_days")
	notes := c.PostForm("notes")

	driverID, err := strconv.Atoi(driverIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid driver_id"})
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
		if path, err := middleware.SaveUploadedFile(c, file, "legality/drivers"); err == nil {
			documentFile = &path
		}
	}

	var issuedVal interface{} = nil
	if issuedDate != "" {
		issuedVal = issuedDate
	}

	res, err := config.DB.Exec(
		`INSERT INTO driver_legality (driver_id, type, document_number, issued_date, expiry_date, document_file, reminder_days, notes) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		driverID, lType, documentNumber, issuedVal, expiryDate, documentFile, reminderDays, notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID}})
}

// PUT /api/driver-legality/:id
func UpdateDriverLegality(c *gin.Context) {
	legalityID := c.Param("id")

	driverIDStr := c.PostForm("driver_id")
	lType := c.PostForm("type")
	documentNumber := c.PostForm("document_number")
	issuedDate := c.PostForm("issued_date")
	expiryDate := c.PostForm("expiry_date")
	reminderDaysStr := c.PostForm("reminder_days")
	status := c.PostForm("status")
	notes := c.PostForm("notes")

	driverID, err := strconv.Atoi(driverIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid driver_id"})
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
		if path, err := middleware.SaveUploadedFile(c, file, "legality/drivers"); err == nil {
			documentFile = &path
		}
	}

	var issuedVal interface{} = nil
	if issuedDate != "" {
		issuedVal = issuedDate
	}

	query := `UPDATE driver_legality SET driver_id=?, type=?, document_number=?, issued_date=?, expiry_date=?, reminder_days=?, status=?, notes=?`
	params := []interface{}{driverID, lType, documentNumber, issuedVal, expiryDate, reminderDays, status, notes}

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

// DELETE /api/driver-legality/:id
func DeleteDriverLegality(c *gin.Context) {
	legalityID := c.Param("id")
	_, err := config.DB.Exec("DELETE FROM driver_legality WHERE id = ?", legalityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Deleted"})
}

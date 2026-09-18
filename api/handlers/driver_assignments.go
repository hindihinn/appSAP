package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"fleet-management-api/config"
	"fleet-management-api/middleware"

	"github.com/gin-gonic/gin"
)

// GET /api/driver-assignments
func GetDriverAssignments(c *gin.Context) {
	driverID := c.Query("driver_id")
	vehicleID := c.Query("vehicle_id")
	status := c.Query("status")

	query := `SELECT da.id, da.driver_id, da.vehicle_id, da.assigned_date, da.end_date, da.status, da.notes, da.created_at,
	                 d.name as driver_name, d.employee_id, d.phone as driver_phone,
	                 v.nopol, v.merk, v.model, u.name as assigned_by_name
	          FROM driver_assignments da 
	          JOIN drivers d ON da.driver_id = d.id 
	          JOIN vehicles v ON da.vehicle_id = v.id
	          LEFT JOIN users u ON da.assigned_by = u.id 
	          WHERE 1=1`

	var params []interface{}

	if driverID != "" {
		query += " AND da.driver_id = ?"
		params = append(params, driverID)
	}
	if vehicleID != "" {
		query += " AND da.vehicle_id = ?"
		params = append(params, vehicleID)
	}
	if status != "" {
		query += " AND da.status = ?"
		params = append(params, status)
	}
	query += " ORDER BY da.assigned_date DESC"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	type AssignmentResponse struct {
		ID             int       `json:"id"`
		DriverID       int       `json:"driver_id"`
		VehicleID      int       `json:"vehicle_id"`
		AssignedDate   time.Time `json:"assigned_date"`
		EndDate        *string   `json:"end_date"`
		Status         string    `json:"status"`
		Notes          *string   `json:"notes"`
		CreatedAt      time.Time `json:"created_at"`
		DriverName     string    `json:"driver_name"`
		EmployeeID     string    `json:"employee_id"`
		DriverPhone    *string   `json:"driver_phone"`
		Nopol          string    `json:"nopol"`
		Merk           string    `json:"merk"`
		Model          *string   `json:"model"`
		AssignedByName *string   `json:"assigned_by_name"`
	}

	assignments := []AssignmentResponse{}
	for rows.Next() {
		var a AssignmentResponse
		var endDate, notes, phone, model, assByName sql.NullString
		err := rows.Scan(&a.ID, &a.DriverID, &a.VehicleID, &a.AssignedDate, &endDate, &a.Status, &notes, &a.CreatedAt,
			&a.DriverName, &a.EmployeeID, &phone, &a.Nopol, &a.Merk, &model, &assByName)
		if err == nil {
			if endDate.Valid {
				a.EndDate = &endDate.String
			}
			if notes.Valid {
				a.Notes = &notes.String
			}
			if phone.Valid {
				a.DriverPhone = &phone.String
			}
			if model.Valid {
				a.Model = &model.String
			}
			if assByName.Valid {
				a.AssignedByName = &assByName.String
			}
			assignments = append(assignments, a)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": assignments})
}

// POST /api/driver-assignments
func CreateDriverAssignment(c *gin.Context) {
	var input struct {
		DriverID     int     `json:"driver_id" binding:"required"`
		VehicleID    int     `json:"vehicle_id" binding:"required"`
		AssignedDate *string `json:"assigned_date"`
		Notes        *string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	// End previous active assignments for this driver
	_, err = tx.Exec("UPDATE driver_assignments SET status='ended', end_date=CURDATE() WHERE driver_id=? AND status='active'", input.DriverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	assDate := time.Now()
	if input.AssignedDate != nil && *input.AssignedDate != "" {
		if t, err := time.Parse("2006-01-02", *input.AssignedDate); err == nil {
			assDate = t
		}
	}

	res, err := tx.Exec(
		`INSERT INTO driver_assignments (driver_id, vehicle_id, assigned_date, assigned_by, notes) VALUES (?,?,?,?,?)`,
		input.DriverID, input.VehicleID, assDate, user.ID, input.Notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID}})
}

// PUT /api/driver-assignments/:id
func UpdateDriverAssignment(c *gin.Context) {
	assignmentID := c.Param("id")

	var input struct {
		Status  string  `json:"status" binding:"required"`
		EndDate *string `json:"end_date"`
		Notes   *string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	var endDateVal interface{} = nil
	if input.EndDate != nil && *input.EndDate != "" {
		endDateVal = *input.EndDate
	}

	_, err := config.DB.Exec(
		"UPDATE driver_assignments SET status=?, end_date=?, notes=? WHERE id=?",
		input.Status, endDateVal, input.Notes, assignmentID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Updated"})
}

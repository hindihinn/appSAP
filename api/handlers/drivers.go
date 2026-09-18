package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	"fleet-management-api/config"
	"fleet-management-api/middleware"

	"github.com/gin-gonic/gin"
)

// GET /api/drivers
func GetDrivers(c *gin.Context) {
	status := c.Query("status")
	unitID := c.Query("unit_id")
	search := c.Query("search")
	excludePhotos := c.Query("exclude_photos") == "true"

	photoCol := "d.photo"
	if excludePhotos {
		photoCol = "NULL as photo"
	}

	query := fmt.Sprintf(`SELECT d.id, d.user_id, d.employee_id, d.name, d.nik, d.address, d.phone, d.emergency_contact, d.emergency_phone,
	                 d.birth_date, %s, d.blood_type, d.unit_id, d.status, d.join_date, d.notes, d.is_active,
	                 u.name as unit_name, us.username as email 
	          FROM drivers d 
	          LEFT JOIN units u ON d.unit_id = u.id 
	          LEFT JOIN users us ON d.user_id = us.id 
	          WHERE d.is_active = 1`, photoCol)

	var params []interface{}

	if status != "" {
		query += " AND d.status = ?"
		params = append(params, status)
	}
	if unitID != "" {
		query += " AND d.unit_id = ?"
		params = append(params, unitID)
	}
	if search != "" {
		query += " AND (d.name LIKE ? OR d.employee_id LIKE ?)"
		params = append(params, "%"+search+"%", "%"+search+"%")
	}
	query += " ORDER BY d.name"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	type DriverResponse struct {
		ID               int     `json:"id"`
		UserID           *int    `json:"user_id"`
		EmployeeID       string  `json:"employee_id"`
		Name             string  `json:"name"`
		Nik              *string `json:"nik"`
		Address          *string `json:"address"`
		Phone            *string `json:"phone"`
		EmergencyContact *string `json:"emergency_contact"`
		EmergencyPhone   *string `json:"emergency_phone"`
		BirthDate        *string `json:"birth_date"`
		Photo            *string `json:"photo"`
		BloodType        *string `json:"blood_type"`
		UnitID           *int    `json:"unit_id"`
		Status           string  `json:"status"`
		JoinDate         *string `json:"join_date"`
		Notes            *string `json:"notes"`
		IsActive         int     `json:"is_active"`
		UnitName         *string `json:"unit_name"`
		Email            *string `json:"email"`
	}

	drivers := []DriverResponse{}
	for rows.Next() {
		var d DriverResponse
		var nik, addr, phone, emCont, emPhone, birth, photo, blood, join, notes, unitName, email sql.NullString
		var unitIDVal, userIDVal sql.NullInt64

		err := rows.Scan(&d.ID, &userIDVal, &d.EmployeeID, &d.Name, &nik, &addr, &phone, &emCont, &emPhone,
			&birth, &photo, &blood, &unitIDVal, &d.Status, &join, &notes, &d.IsActive, &unitName, &email)

		if err == nil {
			if userIDVal.Valid {
				val := int(userIDVal.Int64)
				d.UserID = &val
			}
			if nik.Valid {
				d.Nik = &nik.String
			}
			if addr.Valid {
				d.Address = &addr.String
			}
			if phone.Valid {
				d.Phone = &phone.String
			}
			if emCont.Valid {
				d.EmergencyContact = &emCont.String
			}
			if emPhone.Valid {
				d.EmergencyPhone = &emPhone.String
			}
			if birth.Valid {
				d.BirthDate = &birth.String
			}
			if photo.Valid {
				d.Photo = &photo.String
			}
			if blood.Valid {
				d.BloodType = &blood.String
			}
			if unitIDVal.Valid {
				val := int(unitIDVal.Int64)
				d.UnitID = &val
			}
			if join.Valid {
				d.JoinDate = &join.String
			}
			if notes.Valid {
				d.Notes = &notes.String
			}
			if unitName.Valid {
				d.UnitName = &unitName.String
			}
			if email.Valid {
				d.Email = &email.String
			}
			drivers = append(drivers, d)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": drivers})
}

// GET /api/drivers/available
func GetAvailableDrivers(c *gin.Context) {
	query := `SELECT d.id, d.user_id, d.employee_id, d.name, d.phone, d.status, d.is_active,
	                 da.vehicle_id, v.nopol as assigned_vehicle 
	          FROM drivers d 
	          LEFT JOIN driver_assignments da ON d.id = da.driver_id AND da.status = 'active'
	          LEFT JOIN vehicles v ON da.vehicle_id = v.id
	          WHERE d.is_active = 1 AND d.status = 'available' 
	          ORDER BY d.name`

	rows, err := config.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	type AvailableDriver struct {
		ID              int     `json:"id"`
		UserID          *int    `json:"user_id"`
		EmployeeID      string  `json:"employee_id"`
		Name            string  `json:"name"`
		Phone           *string `json:"phone"`
		Status          string  `json:"status"`
		IsActive        int     `json:"is_active"`
		VehicleID       *int    `json:"vehicle_id"`
		AssignedVehicle *string `json:"assigned_vehicle"`
	}

	drivers := []AvailableDriver{}
	for rows.Next() {
		var d AvailableDriver
		var phone, assVeh sql.NullString
		var vehID, userIDVal sql.NullInt64

		err := rows.Scan(&d.ID, &userIDVal, &d.EmployeeID, &d.Name, &phone, &d.Status, &d.IsActive, &vehID, &assVeh)
		if err == nil {
			if userIDVal.Valid {
				val := int(userIDVal.Int64)
				d.UserID = &val
			}
			if phone.Valid {
				d.Phone = &phone.String
			}
			if vehID.Valid {
				val := int(vehID.Int64)
				d.VehicleID = &val
			}
			if assVeh.Valid {
				d.AssignedVehicle = &assVeh.String
			}
			drivers = append(drivers, d)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": drivers})
}

// GET /api/drivers/:id
func GetDriverByID(c *gin.Context) {
	driverID := c.Param("id")

	query := `SELECT d.id, d.user_id, d.employee_id, d.name, d.nik, d.address, d.phone, d.emergency_contact, d.emergency_phone,
	                 d.birth_date, d.photo, d.blood_type, d.unit_id, d.status, d.join_date, d.notes, d.is_active,
	                 u.name as unit_name, us.username as email 
	          FROM drivers d 
	          LEFT JOIN units u ON d.unit_id = u.id 
	          LEFT JOIN users us ON d.user_id = us.id 
	          WHERE d.id = ?`

	row := config.DB.QueryRow(query, driverID)

	type DriverDetail struct {
		ID               int     `json:"id"`
		UserID           *int    `json:"user_id"`
		EmployeeID       string  `json:"employee_id"`
		Name             string  `json:"name"`
		Nik              *string `json:"nik"`
		Address          *string `json:"address"`
		Phone            *string `json:"phone"`
		EmergencyContact *string `json:"emergency_contact"`
		EmergencyPhone   *string `json:"emergency_phone"`
		BirthDate        *string `json:"birth_date"`
		Photo            *string `json:"photo"`
		BloodType        *string `json:"blood_type"`
		UnitID           *int    `json:"unit_id"`
		Status           string  `json:"status"`
		JoinDate         *string `json:"join_date"`
		Notes            *string `json:"notes"`
		IsActive         int     `json:"is_active"`
		UnitName         *string `json:"unit_name"`
		Email            *string `json:"email"`
	}

	var d DriverDetail
	var nik, addr, phone, emCont, emPhone, birth, photo, blood, join, notes, unitName, email sql.NullString
	var unitIDVal, userIDVal sql.NullInt64

	err := row.Scan(&d.ID, &userIDVal, &d.EmployeeID, &d.Name, &nik, &addr, &phone, &emCont, &emPhone,
		&birth, &photo, &blood, &unitIDVal, &d.Status, &join, &notes, &d.IsActive, &unitName, &email)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Driver tidak ditemukan"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	if userIDVal.Valid {
		val := int(userIDVal.Int64)
		d.UserID = &val
	}

	if nik.Valid {
		d.Nik = &nik.String
	}
	if addr.Valid {
		d.Address = &addr.String
	}
	if phone.Valid {
		d.Phone = &phone.String
	}
	if emCont.Valid {
		d.EmergencyContact = &emCont.String
	}
	if emPhone.Valid {
		d.EmergencyPhone = &emPhone.String
	}
	if birth.Valid {
		d.BirthDate = &birth.String
	}
	if photo.Valid {
		d.Photo = &photo.String
	}
	if blood.Valid {
		d.BloodType = &blood.String
	}
	if unitIDVal.Valid {
		val := int(unitIDVal.Int64)
		d.UnitID = &val
	}
	if join.Valid {
		d.JoinDate = &join.String
	}
	if notes.Valid {
		d.Notes = &notes.String
	}
	if unitName.Valid {
		d.UnitName = &unitName.String
	}
	if email.Valid {
		d.Email = &email.String
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": d})
}

// POST /api/drivers
func CreateDriver(c *gin.Context) {
	userIDStr := c.PostForm("user_id")
	employeeID := c.PostForm("employee_id")
	name := c.PostForm("name")
	nik := c.PostForm("nik")
	address := c.PostForm("address")
	phone := c.PostForm("phone")
	emergencyContact := c.PostForm("emergency_contact")
	emergencyPhone := c.PostForm("emergency_phone")
	birthDate := c.PostForm("birth_date")
	bloodType := c.PostForm("blood_type")
	unitIDStr := c.PostForm("unit_id")
	joinDate := c.PostForm("join_date")
	notes := c.PostForm("notes")

	var userID *int
	if userIDStr != "" {
		if id, err := strconv.Atoi(userIDStr); err == nil {
			userID = &id
		}
	}

	var unitID *int
	if unitIDStr != "" {
		if id, err := strconv.Atoi(unitIDStr); err == nil {
			unitID = &id
		}
	}

	var photo *string
	if file, err := c.FormFile("photo"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "drivers"); err == nil {
			photo = &path
		}
	}

	birthVal := parseISODate(birthDate)
	joinVal := parseISODate(joinDate)

	res, err := config.DB.Exec(
		`INSERT INTO drivers (user_id, employee_id, name, nik, address, phone, emergency_contact, emergency_phone, birth_date, photo, blood_type, unit_id, join_date, notes) 
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		userID, employeeID, name, nik, address, phone, emergencyContact, emergencyPhone, birthVal, photo, bloodType, unitID, joinVal, notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID}})
}

// PUT /api/drivers/:id
func UpdateDriver(c *gin.Context) {
	driverID := c.Param("id")

	employeeID := c.PostForm("employee_id")
	name := c.PostForm("name")
	nik := c.PostForm("nik")
	address := c.PostForm("address")
	phone := c.PostForm("phone")
	emergencyContact := c.PostForm("emergency_contact")
	emergencyPhone := c.PostForm("emergency_phone")
	birthDate := c.PostForm("birth_date")
	bloodType := c.PostForm("blood_type")
	unitIDStr := c.PostForm("unit_id")
	status := c.PostForm("status")
	joinDate := c.PostForm("join_date")
	notes := c.PostForm("notes")

	var unitID *int
	if unitIDStr != "" {
		if id, err := strconv.Atoi(unitIDStr); err == nil {
			unitID = &id
		}
	}

	var photo *string
	if file, err := c.FormFile("photo"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "drivers"); err == nil {
			photo = &path
		}
	}

	birthVal := parseISODate(birthDate)
	joinVal := parseISODate(joinDate)

	query := `UPDATE drivers SET employee_id=?, name=?, nik=?, address=?, phone=?, emergency_contact=?, emergency_phone=?, birth_date=?, blood_type=?, unit_id=?, status=?, join_date=?, notes=?`
	params := []interface{}{employeeID, name, nik, address, phone, emergencyContact, emergencyPhone, birthVal, bloodType, unitID, status, joinVal, notes}

	if photo != nil {
		query += ", photo=?"
		params = append(params, *photo)
	}

	query += " WHERE id=?"
	params = append(params, driverID)

	_, err := config.DB.Exec(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Driver updated"})
}

// DELETE /api/drivers/:id
func DeleteDriver(c *gin.Context) {
	driverID := c.Param("id")

	_, err := config.DB.Exec("UPDATE drivers SET is_active = 0 WHERE id = ?", driverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Driver deactivated"})
}

func parseISODate(dateStr string) interface{} {
	if dateStr == "" {
		return nil
	}
	if len(dateStr) >= 10 {
		if dateStr[4] == '-' && dateStr[7] == '-' {
			return dateStr[:10]
		}
	}
	return dateStr
}

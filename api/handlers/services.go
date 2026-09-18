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

// Generate RS ticket number: RS-{SEQ}/{MM}/{YYYY}-{PT}-{UNIT}
func generateTicketNumber(vehicleID int) (string, error) {
	var companyCode, unitCode string
	err := config.DB.QueryRow(
		`SELECT c.code as company_code, u.code as unit_code 
		 FROM vehicles v
		 LEFT JOIN units u ON v.unit_id = u.id
		 LEFT JOIN companies c ON u.company_id = c.id
		 WHERE v.id = ?`, vehicleID,
	).Scan(&companyCode, &unitCode)
	if err != nil {
		companyCode = "PT"
		unitCode = "UNIT"
	}

	companyCode = sanitizeCode(companyCode, "PT")
	unitCode = sanitizeCode(unitCode, "UNIT")

	now := time.Now()
	mm := fmt.Sprintf("%02d", now.Month())
	yyyy := now.Year()

	var cnt int
	err = config.DB.QueryRow(
		`SELECT COUNT(*) as cnt FROM service_tickets WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`,
	).Scan(&cnt)
	if err != nil {
		return "", err
	}

	seq := fmt.Sprintf("%02d", cnt+1)
	return fmt.Sprintf("RS-%s/%s/%d-%s-%s", seq, mm, yyyy, companyCode, unitCode), nil
}

// Generate WO number: WO-{SEQ}/{MM}/{YYYY}-{PT}-{UNIT}
func generateWONumber(vehicleID int) (string, error) {
	var companyCode, unitCode string
	err := config.DB.QueryRow(
		`SELECT c.code as company_code, u.code as unit_code 
		 FROM vehicles v
		 LEFT JOIN units u ON v.unit_id = u.id
		 LEFT JOIN companies c ON u.company_id = c.id
		 WHERE v.id = ?`, vehicleID,
	).Scan(&companyCode, &unitCode)
	if err != nil {
		companyCode = "PT"
		unitCode = "UNIT"
	}

	companyCode = sanitizeCode(companyCode, "PT")
	unitCode = sanitizeCode(unitCode, "UNIT")

	now := time.Now()
	mm := fmt.Sprintf("%02d", now.Month())
	yyyy := now.Year()

	var cnt int
	err = config.DB.QueryRow(
		`SELECT COUNT(*) as cnt FROM work_orders WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`,
	).Scan(&cnt)
	if err != nil {
		return "", err
	}

	seq := fmt.Sprintf("%02d", cnt+1)
	return fmt.Sprintf("WO-%s/%s/%d-%s-%s", seq, mm, yyyy, companyCode, unitCode), nil
}

// Helper to update linked routine service schedules for a vehicle
func updateLinkedRoutineService(tx *sql.Tx, db *sql.DB, vehicleID int, kmAtService int, completedDate string) error {
	var rows *sql.Rows
	var err error
	if tx != nil {
		rows, err = tx.Query("SELECT id, interval_km, interval_days FROM routine_services WHERE vehicle_id = ?", vehicleID)
	} else {
		rows, err = db.Query("SELECT id, interval_km, interval_days FROM routine_services WHERE vehicle_id = ?", vehicleID)
	}

	if err != nil {
		return err
	}
	defer rows.Close()

	type rsEntry struct {
		id           int
		intervalKm   int
		intervalDays int
	}

	entries := []rsEntry{}
	for rows.Next() {
		var e rsEntry
		if err := rows.Scan(&e.id, &e.intervalKm, &e.intervalDays); err == nil {
			entries = append(entries, e)
		}
	}

	compTime, err := time.Parse("2006-01-02", completedDate)
	if err != nil {
		compTime = time.Now()
	}

	for _, entry := range entries {
		nextKm := kmAtService + entry.intervalKm
		nextDate := compTime.AddDate(0, 0, entry.intervalDays).Format("2006-01-02")

		if tx != nil {
			_, _ = tx.Exec(
				`UPDATE routine_services 
				 SET last_service_date = ?, 
				     last_service_km = ?, 
				     next_service_date = ?, 
				     next_service_km = ?, 
				     status = 'on_schedule' 
				 WHERE id = ?`,
				completedDate, kmAtService, nextDate, nextKm, entry.id,
			)
		} else {
			_, _ = db.Exec(
				`UPDATE routine_services 
				 SET last_service_date = ?, 
				     last_service_km = ?, 
				     next_service_date = ?, 
				     next_service_km = ?, 
				     status = 'on_schedule' 
				 WHERE id = ?`,
				completedDate, kmAtService, nextDate, nextKm, entry.id,
			)
		}
	}

	return nil
}

// GET /api/services/tickets/active-vehicle
func GetActiveVehicleTicket(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var driverID int
	err := config.DB.QueryRow("SELECT id FROM drivers WHERE user_id = ?", user.ID).Scan(&driverID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Driver tidak terdaftar"})
		return
	}

	var v struct {
		ID          int    `json:"id"`
		Nopol       string `json:"nopol"`
		Merk        string `json:"merk"`
		Model       string `json:"model"`
		CurrentKm   int    `json:"current_km"`
		CompanyName string `json:"company_name"`
		UnitName    string `json:"unit_name"`
	}

	var model, compName, unitName sql.NullString
	query := `SELECT v.id, v.nopol, v.merk, v.model, v.current_km, c.name as company_name, u.name as unit_name
	          FROM driver_assignments da 
	          JOIN vehicles v ON da.vehicle_id = v.id 
	          LEFT JOIN units u ON v.unit_id = u.id
	          LEFT JOIN companies c ON u.company_id = c.id
	          WHERE da.driver_id = ? AND da.status = 'active' 
	          LIMIT 1`

	err = config.DB.QueryRow(query, driverID).Scan(&v.ID, &v.Nopol, &v.Merk, &model, &v.CurrentKm, &compName, &unitName)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Anda tidak memiliki kendaraan yang aktif saat ini"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	if model.Valid {
		v.Model = model.String
	}
	if compName.Valid {
		v.CompanyName = compName.String
	}
	if unitName.Valid {
		v.UnitName = unitName.String
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": v})
}

// POST /api/services/tickets
func CreateServiceTicket(c *gin.Context) {
	damageType := c.PostForm("damage_type")
	description := c.PostForm("description")
	notes := c.PostForm("notes")

	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var driverID int
	err := config.DB.QueryRow("SELECT id FROM drivers WHERE user_id = ?", user.ID).Scan(&driverID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Driver tidak terdaftar"})
		return
	}

	var vehicleID int
	err = config.DB.QueryRow("SELECT vehicle_id FROM driver_assignments WHERE driver_id = ? AND status = 'active' LIMIT 1", driverID).Scan(&vehicleID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Anda tidak memiliki kendaraan aktif"})
		return
	}

	ticketNumber, err := generateTicketNumber(vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal generate nomor tiket"})
		return
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	res, err := tx.Exec(
		`INSERT INTO service_tickets (ticket_number, driver_id, vehicle_id, damage_type, description, notes, status)
		 VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
		ticketNumber, driverID, vehicleID, damageType, description, notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menyimpan tiket: " + err.Error()})
		return
	}

	ticketID, _ := res.LastInsertId()

	// Parse photos if uploaded
	form, err := c.MultipartForm()
	if err == nil {
		for fieldname, files := range form.File {
			if strings.HasPrefix(fieldname, "photo") && len(files) > 0 {
				if path, err := middleware.SaveUploadedFile(c, files[0], "services"); err == nil {
					_, _ = tx.Exec(
						`INSERT INTO service_ticket_photos (ticket_id, photo_path) VALUES (?, ?)`,
						ticketID, path,
					)
				}
			}
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	// Fetch vehicle nopol for details
	var nopol string
	_ = config.DB.QueryRow("SELECT nopol FROM vehicles WHERE id = ?", vehicleID).Scan(&nopol)

	// Notify Super Admin, Admin GA, and GA roles
	_ = CreateNotificationForRoles([]string{"super_admin", "admin_ga", "ga"},
		"Laporan Servis Baru",
		"Laporan kerusakan (" + damageType + ") untuk kendaraan " + nopol + " dilaporkan oleh " + user.Name + ".",
		"danger", "services", int(ticketID), "work_order")

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": ticketID, "ticket_number": ticketNumber}})
}

// GET /api/services/tickets
func GetServiceTickets(c *gin.Context) {
	status := c.Query("status")
	driverID := c.Query("driver_id")

	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	query := `SELECT st.id, st.ticket_number, st.vehicle_id, st.driver_id, st.damage_type, st.description, st.notes, st.reported_at, st.status, st.approved_by, st.approved_at, st.rejection_reason, st.work_order_id,
	                 v.nopol, v.merk, v.model, d.name as driver_name, c.name as company_name, un.name as unit_name
	          FROM service_tickets st 
	          JOIN vehicles v ON st.vehicle_id = v.id 
	          JOIN drivers d ON st.driver_id = d.id
	          LEFT JOIN units un ON v.unit_id = un.id
	          LEFT JOIN companies c ON un.company_id = c.id
	          WHERE 1=1`

	var params []interface{}

	if status != "" {
		query += " AND st.status = ?"
		params = append(params, status)
	}

	if user.RoleName == "driver" {
		query += " AND d.user_id = ?"
		params = append(params, user.ID)
	} else if driverID != "" {
		query += " AND st.driver_id = ?"
		params = append(params, driverID)
	}

	query += " ORDER BY st.created_at DESC" // wait, in schema created_at or reported_at? Let's check table has reported_at
	// We can fallback to reported_at
	query = strings.ReplaceAll(query, "st.created_at", "st.reported_at")

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}
	defer rows.Close()

	tickets := []models.ServiceTicket{}
	for rows.Next() {
		var t models.ServiceTicket
		var appBy, woID sql.NullInt64
		var notesStr, rejStr sql.NullString
		var appAt sql.NullTime
		var nopol, merk, model, drvName, compName, unitName sql.NullString

		err := rows.Scan(
			&t.ID, &t.TicketNumber, &t.VehicleID, &t.DriverID, &t.DamageType, &t.Description, &notesStr, &t.ReportedAt, &t.Status, &appBy, &appAt, &rejStr, &woID,
			&nopol, &merk, &model, &drvName, &compName, &unitName,
		)
		if err == nil {
			if notesStr.Valid {
				t.Notes = &notesStr.String
			}
			if rejStr.Valid {
				t.RejectionReason = &rejStr.String
			}
			if appBy.Valid {
				val := int(appBy.Int64)
				t.ApprovedBy = &val
			}
			if appAt.Valid {
				t.ApprovedAt = &appAt.Time
			}
			if woID.Valid {
				val := int(woID.Int64)
				t.WorkOrderID = &val
			}
			if nopol.Valid {
				t.Nopol = &nopol.String
			}
			if merk.Valid {
				t.Merk = &merk.String
			}
			if model.Valid {
				t.Model = &model.String
			}
			if drvName.Valid {
				t.DriverName = &drvName.String
			}
			if compName.Valid {
				t.CompanyName = &compName.String
			}
			if unitName.Valid {
				t.UnitName = &unitName.String
			}
			tickets = append(tickets, t)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": tickets})
}

// GET /api/services/tickets/:id
func GetServiceTicketByID(c *gin.Context) {
	ticketID := c.Param("id")

	query := `SELECT st.id, st.ticket_number, st.vehicle_id, st.driver_id, st.damage_type, st.description, st.notes, st.reported_at, st.status, st.approved_by, st.approved_at, st.rejection_reason, st.work_order_id,
	                 v.nopol, v.merk, v.model, d.name as driver_name, c.name as company_name, un.name as unit_name
	          FROM service_tickets st 
	          JOIN vehicles v ON st.vehicle_id = v.id 
	          JOIN drivers d ON st.driver_id = d.id
	          LEFT JOIN units un ON v.unit_id = un.id
	          LEFT JOIN companies c ON un.company_id = c.id
	          WHERE st.id = ?`

	row := config.DB.QueryRow(query, ticketID)

	var t models.ServiceTicket
	var notesStr, rejStr sql.NullString
	var appBy, woID sql.NullInt64
	var appAt sql.NullTime
	var nopol, merk, model, drvName, compName, unitName sql.NullString

	err := row.Scan(
		&t.ID, &t.TicketNumber, &t.VehicleID, &t.DriverID, &t.DamageType, &t.Description, &notesStr, &t.ReportedAt, &t.Status, &appBy, &appAt, &rejStr, &woID,
		&nopol, &merk, &model, &drvName, &compName, &unitName,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Ticket not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	if notesStr.Valid {
		t.Notes = &notesStr.String
	}
	if rejStr.Valid {
		t.RejectionReason = &rejStr.String
	}
	if appBy.Valid {
		val := int(appBy.Int64)
		t.ApprovedBy = &val
	}
	if appAt.Valid {
		t.ApprovedAt = &appAt.Time
	}
	if woID.Valid {
		val := int(woID.Int64)
		t.WorkOrderID = &val
	}
	if nopol.Valid {
		t.Nopol = &nopol.String
	}
	if merk.Valid {
		t.Merk = &merk.String
	}
	if model.Valid {
		t.Model = &model.String
	}
	if drvName.Valid {
		t.DriverName = &drvName.String
	}
	if compName.Valid {
		t.CompanyName = &compName.String
	}
	if unitName.Valid {
		t.UnitName = &unitName.String
	}

	// Fetch Photos
	rowsPhotos, err := config.DB.Query("SELECT id, ticket_id, photo_path FROM service_ticket_photos WHERE ticket_id = ?", ticketID)
	photos := []models.ServiceTicketPhoto{}
	if err == nil {
		defer rowsPhotos.Close()
		for rowsPhotos.Next() {
			var p models.ServiceTicketPhoto
			if err := rowsPhotos.Scan(&p.ID, &p.TicketID, &p.PhotoPath); err == nil {
				photos = append(photos, p)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"id":               t.ID,
			"ticket_number":    t.TicketNumber,
			"vehicle_id":       t.VehicleID,
			"driver_id":        t.DriverID,
			"damage_type":      t.DamageType,
			"description":      t.Description,
			"notes":            t.Notes,
			"reported_at":      t.ReportedAt,
			"status":           t.Status,
			"approved_by":      t.ApprovedBy,
			"approved_at":      t.ApprovedAt,
			"rejection_reason": t.RejectionReason,
			"work_order_id":    t.WorkOrderID,
			"nopol":            t.Nopol,
			"merk":             t.Merk,
			"model":            t.Model,
			"driver_name":      t.DriverName,
			"company_name":     t.CompanyName,
			"unit_name":        t.UnitName,
			"photos":           photos,
		},
	})
}

// PUT /api/services/tickets/:id/status
func UpdateServiceTicketStatus(c *gin.Context) {
	ticketID := c.Param("id")

	var input struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	validStatuses := map[string]bool{"pending": true, "approved": true, "completed": true, "rejected": true}
	if !validStatuses[input.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Status tidak valid"})
		return
	}

	_, err := config.DB.Exec("UPDATE service_tickets SET status = ? WHERE id = ?", input.Status, ticketID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Status tiket perbaikan berhasil diperbarui"})
}

// ==========================================
// 2. WORK ORDERS (WO) SERVICE
// ==========================================

// GET /api/services/work-orders
func GetWorkOrders(c *gin.Context) {
	status := c.Query("status")
	vehicleID := c.Query("vehicle_id")
	priority := c.Query("priority")

	query := `SELECT wo.id, wo.wo_number, wo.vehicle_id, wo.service_type, wo.category, wo.description, wo.workshop_name, wo.workshop_address, wo.mechanic_name, wo.reported_date, wo.km_at_service, wo.estimated_cost, wo.actual_cost, wo.status, wo.created_by, wo.approved_by, wo.approved_at, wo.start_date, wo.completed_date, wo.before_photo, wo.document_file, wo.notes, wo.created_at,
	                 v.nopol, v.merk, v.model, cb.name as created_by_name, ab.name as approved_by_name, st.ticket_number
	          FROM work_orders wo 
	          JOIN vehicles v ON wo.vehicle_id = v.id
	          LEFT JOIN users cb ON wo.created_by = cb.id 
	          LEFT JOIN users ab ON wo.approved_by = ab.id
	          LEFT JOIN service_tickets st ON wo.ticket_id = st.id
	          WHERE 1=1`

	var params []interface{}
	if status != "" {
		query += " AND wo.status = ?"
		params = append(params, status)
	}
	if vehicleID != "" {
		query += " AND wo.vehicle_id = ?"
		params = append(params, vehicleID)
	}
	if priority != "" {
		query += " AND wo.priority = ?"
		params = append(params, priority)
	}

	query += " ORDER BY wo.created_at DESC"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}
	defer rows.Close()

	type WoResponse struct {
		models.WorkOrder
		Category        *string    `json:"category"`
		ServiceType     *string    `json:"service_type"`
		WorkshopName    *string    `json:"workshop_name"`
		WorkshopAddress *string    `json:"workshop_address"`
		MechanicName    *string    `json:"mechanic_name"`
		ReportedDate    *string    `json:"reported_date"`
		KmAtService     *int       `json:"km_at_service"`
		BeforePhoto     *string    `json:"before_photo"`
		DocumentFile    *string    `json:"document_file"`
		CreatedByName   *string    `json:"created_by_name"`
		ApprovedByName  *string    `json:"approved_by_name"`
		TicketNumber    *string    `json:"ticket_number"`
	}

	wos := []WoResponse{}
	for rows.Next() {
		var w WoResponse
		var actCost, estCost sql.NullFloat64
		var appBy, cbID sql.NullInt64
		var appAt sql.NullTime
		var startDate, compDate, notes, beforeP, docFile, cat, sType, wsName, wsAddr, mechName, repDate sql.NullString
		var nopol, merk, model, cbName, abName, tkNum sql.NullString

		err := rows.Scan(
			&w.ID, &w.WoNumber, &w.VehicleID, &sType, &cat, &w.Description, &wsName, &wsAddr, &mechName, &repDate, &w.KmAtService, &estCost, &actCost, &w.Status, &cbID, &appBy, &appAt, &startDate, &compDate, &beforeP, &docFile, &notes, &w.CreatedAt,
			&nopol, &merk, &model, &cbName, &abName, &tkNum,
		)
		if err == nil {
			if sType.Valid {
				w.ServiceType = &sType.String
			}
			if cat.Valid {
				w.Category = &cat.String
			}
			if wsName.Valid {
				w.WorkshopName = &wsName.String
			}
			if wsAddr.Valid {
				w.WorkshopAddress = &wsAddr.String
			}
			if mechName.Valid {
				w.MechanicName = &mechName.String
			}
			if repDate.Valid {
				w.ReportedDate = &repDate.String
			}
			if estCost.Valid {
				w.EstimatedCost = estCost.Float64
			}
			if actCost.Valid {
				w.ActualCost = actCost.Float64
			}
			if cbID.Valid {
				w.CreatedBy = int(cbID.Int64)
			}
			if appBy.Valid {
				val := int(appBy.Int64)
				w.ApprovedBy = &val
			}
			if appAt.Valid {
				w.ApprovedAt = &appAt.Time
			}
			if startDate.Valid {
				w.StartDate = &startDate.String
			}
			if compDate.Valid {
				w.EndDate = &compDate.String
			}
			if beforeP.Valid {
				w.BeforePhoto = &beforeP.String
			}
			if docFile.Valid {
				w.DocumentFile = &docFile.String
			}
			if notes.Valid {
				w.Notes = &notes.String
			}

			if nopol.Valid {
				w.Nopol = &nopol.String
			}
			if merk.Valid {
				w.Merk = &merk.String
			}
			if model.Valid {
				w.Model = &model.String
			}
			if cbName.Valid {
				w.CreatorName = &cbName.String
			}
			if abName.Valid {
				w.ApproverName = &abName.String
			}
			if tkNum.Valid {
				w.TicketNumber = &tkNum.String
			}

			wos = append(wos, w)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": wos})
}

// GET /api/services/work-orders/driver/active
func GetActiveDriverWorkOrder(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var driverID int
	err := config.DB.QueryRow("SELECT id FROM drivers WHERE user_id = ?", user.ID).Scan(&driverID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Driver not found"})
		return
	}

	query := `SELECT wo.id, wo.wo_number, wo.vehicle_id, wo.service_type, wo.category, wo.description, wo.status,
	                 v.nopol, v.merk, v.model
	          FROM work_orders wo 
	          JOIN vehicles v ON wo.vehicle_id = v.id 
	          JOIN driver_assignments da ON v.id = da.vehicle_id 
	          WHERE da.driver_id = ? AND da.status = 'active' AND wo.status IN ('approved', 'in_progress')
	          ORDER BY wo.created_at DESC LIMIT 1`

	row := config.DB.QueryRow(query, driverID)

	type ShortWO struct {
		ID          int     `json:"id"`
		WoNumber    string  `json:"wo_number"`
		VehicleID   int     `json:"vehicle_id"`
		ServiceType *string `json:"service_type"`
		Category    *string `json:"category"`
		Description string  `json:"description"`
		Status      string  `json:"status"`
		Nopol       string  `json:"nopol"`
		Merk        string  `json:"merk"`
		Model       *string `json:"model"`
	}

	var w ShortWO
	var sType, cat, model sql.NullString
	err = row.Scan(&w.ID, &w.WoNumber, &w.VehicleID, &sType, &cat, &w.Description, &w.Status, &w.Nopol, &w.Merk, &model)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": nil})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	if sType.Valid {
		w.ServiceType = &sType.String
	}
	if cat.Valid {
		w.Category = &cat.String
	}
	if model.Valid {
		w.Model = &model.String
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": w})
}

// GET /api/services/work-orders/:id
func GetWorkOrderByID(c *gin.Context) {
	woID := c.Param("id")

	query := `SELECT wo.id, wo.wo_number, wo.vehicle_id, wo.service_type, wo.category, wo.description, wo.workshop_name, wo.workshop_address, wo.mechanic_name, wo.reported_date, wo.km_at_service, wo.estimated_cost, wo.actual_cost, wo.status, wo.created_by, wo.approved_by, wo.approved_at, wo.start_date, wo.completed_date, wo.before_photo, wo.document_file, wo.notes, wo.created_at,
	                 v.nopol, v.merk, v.model, st.ticket_number
	          FROM work_orders wo 
	          JOIN vehicles v ON wo.vehicle_id = v.id 
	          LEFT JOIN service_tickets st ON wo.ticket_id = st.id
	          WHERE wo.id = ?`

	row := config.DB.QueryRow(query, woID)

	type FullWO struct {
		models.WorkOrder
		Category        *string `json:"category"`
		ServiceType     *string `json:"service_type"`
		WorkshopName    *string `json:"workshop_name"`
		WorkshopAddress *string `json:"workshop_address"`
		MechanicName    *string `json:"mechanic_name"`
		ReportedDate    *string `json:"reported_date"`
		BeforePhoto     *string `json:"before_photo"`
		DocumentFile    *string `json:"document_file"`
		TicketNumber    *string `json:"ticket_number"`
		Checkpoints     []gin.H `json:"checkpoints"`
	}

	var w FullWO
	var actCost, estCost sql.NullFloat64
	var appBy, cbID sql.NullInt64
	var appAt sql.NullTime
	var startDate, compDate, notes, beforeP, docFile, cat, sType, wsName, wsAddr, mechName, repDate sql.NullString
	var nopol, merk, model, tkNum sql.NullString

	err := row.Scan(
		&w.ID, &w.WoNumber, &w.VehicleID, &sType, &cat, &w.Description, &wsName, &wsAddr, &mechName, &repDate, &w.KmAtService, &estCost, &actCost, &w.Status, &cbID, &appBy, &appAt, &startDate, &compDate, &beforeP, &docFile, &notes, &w.CreatedAt,
		&nopol, &merk, &model, &tkNum,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "WO not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	if sType.Valid {
		w.ServiceType = &sType.String
	}
	if cat.Valid {
		w.Category = &cat.String
	}
	if wsName.Valid {
		w.WorkshopName = &wsName.String
	}
	if wsAddr.Valid {
		w.WorkshopAddress = &wsAddr.String
	}
	if mechName.Valid {
		w.MechanicName = &mechName.String
	}
	if repDate.Valid {
		w.ReportedDate = &repDate.String
	}
	if estCost.Valid {
		w.EstimatedCost = estCost.Float64
	}
	if actCost.Valid {
		w.ActualCost = actCost.Float64
	}
	if cbID.Valid {
		w.CreatedBy = int(cbID.Int64)
	}
	if appBy.Valid {
		val := int(appBy.Int64)
		w.ApprovedBy = &val
	}
	if appAt.Valid {
		w.ApprovedAt = &appAt.Time
	}
	if startDate.Valid {
		w.StartDate = &startDate.String
	}
	if compDate.Valid {
		w.EndDate = &compDate.String
	}
	if beforeP.Valid {
		w.BeforePhoto = &beforeP.String
	}
	if docFile.Valid {
		w.DocumentFile = &docFile.String
	}
	if notes.Valid {
		w.Notes = &notes.String
	}

	if nopol.Valid {
		w.Nopol = &nopol.String
	}
	if merk.Valid {
		w.Merk = &merk.String
	}
	if model.Valid {
		w.Model = &model.String
	}
	if tkNum.Valid {
		w.TicketNumber = &tkNum.String
	}

	// Fetch Checkpoints
	cpRows, err := config.DB.Query("SELECT id, work_order_id, type, km_reading, latitude, longitude, address, photo_km, photo_activity, photo_invoice, created_at FROM service_order_checkpoints WHERE work_order_id = ? ORDER BY id ASC", woID)
	w.Checkpoints = []gin.H{}
	if err == nil {
		defer cpRows.Close()
		for cpRows.Next() {
			var id, woIDVal, km sql.NullInt64
			var cType, addr, pKm, pAct, pInv sql.NullString
			var lat, lng sql.NullFloat64
			var created time.Time
			if err := cpRows.Scan(&id, &woIDVal, &cType, &km, &lat, &lng, &addr, &pKm, &pAct, &pInv, &created); err == nil {
				w.Checkpoints = append(w.Checkpoints, gin.H{
					"id":             id.Int64,
					"work_order_id":  woIDVal.Int64,
					"type":           cType.String,
					"km_reading":     km.Int64,
					"latitude":       lat.Float64,
					"longitude":      lng.Float64,
					"address":        addr.String,
					"photo_km":       pKm.String,
					"photo_activity": pAct.String,
					"photo_invoice":  pInv.String,
					"created_at":     created,
				})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": w})
}

// POST /api/services/work-orders
func CreateWorkOrder(c *gin.Context) {
	ticketIDStr := c.PostForm("ticket_id")
	vehicleIDStr := c.PostForm("vehicle_id")
	serviceType := c.PostForm("service_type")
	category := c.PostForm("category")
	description := c.PostForm("description")
	workshopName := c.PostForm("workshop_name")
	workshopAddress := c.PostForm("workshop_address")
	mechanicName := c.PostForm("mechanic_name")
	reportedDate := c.PostForm("reported_date")
	kmAtServiceStr := c.PostForm("km_at_service")
	estimatedCostStr := c.PostForm("estimated_cost")
	priority := c.PostForm("priority")
	notes := c.PostForm("notes")

	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var ticketID *int
	if ticketIDStr != "" {
		if id, err := strconv.Atoi(ticketIDStr); err == nil {
			ticketID = &id
		}
	}

	var vehicleID *int
	if vehicleIDStr != "" {
		if id, err := strconv.Atoi(vehicleIDStr); err == nil {
			vehicleID = &id
		}
	}

	var targetVehicleID int
	if vehicleID != nil {
		targetVehicleID = *vehicleID
	} else if ticketID != nil {
		_ = config.DB.QueryRow("SELECT vehicle_id FROM service_tickets WHERE id = ?", *ticketID).Scan(&targetVehicleID)
	}

	if targetVehicleID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Vehicle ID is required"})
		return
	}

	estimatedCost := 0.0
	if estimatedCostStr != "" {
		if val, err := strconv.ParseFloat(estimatedCostStr, 64); err == nil {
			estimatedCost = val
		}
	}

	kmAtService := 0
	if kmAtServiceStr != "" {
		if val, err := strconv.Atoi(kmAtServiceStr); err == nil {
			kmAtService = val
		}
	}

	if serviceType == "" {
		serviceType = "corrective"
	}
	if category == "" {
		category = "Perbaikan Umum"
	}
	if priority == "" {
		priority = "medium"
	}

	var beforePhoto, documentFile *string

	if file, err := c.FormFile("before_photo"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "services"); err == nil {
			beforePhoto = &path
		}
	}
	if file, err := c.FormFile("document_file"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "services"); err == nil {
			documentFile = &path
		}
	}

	woNumber, err := generateWONumber(targetVehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal generate nomor WO"})
		return
	}

	repDate := reportedDate
	if repDate == "" {
		repDate = time.Now().Format("2006-01-02")
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	res, err := tx.Exec(
		`INSERT INTO work_orders (ticket_id, wo_number, vehicle_id, service_type, category, description, workshop_name, workshop_address, mechanic_name, reported_date, km_at_service, estimated_cost, priority, status, before_photo, document_file, notes, created_by)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'approved',?,?,?,?)`,
		ticketID, woNumber, targetVehicleID, serviceType, category, description, workshopName, workshopAddress, mechanicName, repDate, kmAtService, estimatedCost, priority, beforePhoto, documentFile, notes, user.ID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menyimpan WO: " + err.Error()})
		return
	}

	// Update vehicle status
	_, _ = tx.Exec("UPDATE vehicles SET status = 'maintenance' WHERE id = ?", targetVehicleID)

	// Update ticket status
	if ticketID != nil {
		_, _ = tx.Exec("UPDATE service_tickets SET status = 'approved' WHERE id = ?", *ticketID)
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	woID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": woID, "wo_number": woNumber}})
}

// POST /api/services/work-orders/:id/checkpoints
func AddWorkOrderCheckpoint(c *gin.Context) {
	woID := c.Param("id")

	cType := c.PostForm("type")
	kmReadingStr := c.PostForm("km_reading")
	latitudeStr := c.PostForm("latitude")
	longitudeStr := c.PostForm("longitude")
	address := c.PostForm("address")
	actualCostStr := c.PostForm("actual_cost")

	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	kmReading, err := strconv.Atoi(kmReadingStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid km_reading"})
		return
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

	var photoKm, photoActivity, photoInvoice *string
	form, err := c.MultipartForm()
	if err == nil {
		if files, ok := form.File["photo_km"]; ok && len(files) > 0 {
			if path, err := middleware.SaveUploadedFile(c, files[0], "services"); err == nil {
				photoKm = &path
			}
		}
		if files, ok := form.File["photo_activity"]; ok && len(files) > 0 {
			if path, err := middleware.SaveUploadedFile(c, files[0], "services"); err == nil {
				photoActivity = &path
			}
		}
		if files, ok := form.File["photo_invoice"]; ok && len(files) > 0 {
			if path, err := middleware.SaveUploadedFile(c, files[0], "services"); err == nil {
				photoInvoice = &path
			}
		}
	}

	if photoKm == nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Foto KM wajib dilampirkan"})
		return
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(
		`INSERT INTO service_order_checkpoints (work_order_id, type, km_reading, latitude, longitude, address, photo_km, photo_activity, photo_invoice)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		woID, cType, kmReading, lat, lng, address, photoKm, photoActivity, photoInvoice,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menyimpan checkpoint: " + err.Error()})
		return
	}

	if cType == "start_to_workshop" {
		_, _ = tx.Exec("UPDATE work_orders SET status = 'in_progress', started_date = CURDATE() WHERE id = ?", woID)
	} else if cType == "return_to_office" {
		var vehicleID int
		var ticketID sql.NullInt64
		_ = tx.QueryRow("SELECT vehicle_id, ticket_id FROM work_orders WHERE id = ?", woID).Scan(&vehicleID, &ticketID)

		var actualCost sql.NullFloat64
		if actualCostStr != "" {
			if val, err := strconv.ParseFloat(actualCostStr, 64); err == nil {
				actualCost = sql.NullFloat64{Float64: val, Valid: true}
			}
		}

		_, _ = tx.Exec(
			`UPDATE work_orders 
			 SET status = 'completed', 
			     completed_date = CURDATE(), 
			     actual_cost = COALESCE(?, estimated_cost) 
			 WHERE id = ?`,
			actualCost, woID,
		)

		// Reset vehicle status back to available
		_, _ = tx.Exec("UPDATE vehicles SET status = 'available' WHERE id = ?", vehicleID)

		// Update original ticket
		if ticketID.Valid {
			_, _ = tx.Exec("UPDATE service_tickets SET status = 'completed' WHERE id = ?", ticketID.Int64)
		}

		// Update routine services for this vehicle
		_ = updateLinkedRoutineService(tx, nil, vehicleID, kmReading, time.Now().Format("2006-01-02"))
	}

	// Update Odometer
	var vehicleID int
	_ = tx.QueryRow("SELECT vehicle_id FROM work_orders WHERE id = ?", woID).Scan(&vehicleID)
	if vehicleID > 0 {
		var prevKm int
		_ = tx.QueryRow("SELECT current_km FROM vehicles WHERE id = ?", vehicleID).Scan(&prevKm)

		_, _ = tx.Exec("UPDATE vehicles SET current_km = ? WHERE id = ? AND ? > current_km", kmReading, vehicleID, kmReading)

		labels := map[string]string{
			"start_to_workshop":  "Mulai Menuju Bengkel (WO)",
			"arrive_at_workshop": "Sampai di Bengkel (WO)",
			"return_to_office":   "Sampai di Kantor (WO)",
		}
		stepLabel, ok := labels[cType]
		if !ok {
			stepLabel = "Checkpoint " + cType + " (WO)"
		}

		_, _ = tx.Exec(
			`INSERT INTO vehicle_km_logs (vehicle_id, km_reading, previous_km, recorded_date, recorded_by, photo, source, notes) 
			 VALUES (?, ?, ?, NOW(), ?, ?, 'service', ?)`,
			vehicleID, kmReading, prevKm, user.ID, photoKm, stepLabel,
		)
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Checkpoint registered successfully"})
}

// PUT /api/services/work-orders/:id/status (manual override)
func UpdateWorkOrderStatus(c *gin.Context) {
	woID := c.Param("id")

	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var input struct {
		Status        string   `json:"status" binding:"required"`
		ActualCost    *float64 `json:"actual_cost"`
		CompletedDate *string  `json:"completed_date"`
		Notes         *string  `json:"notes"`
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

	query := "UPDATE work_orders SET status=?"
	params := []interface{}{input.Status}

	if input.Status == "approved" {
		query += ", approved_by=?, approved_at=NOW()"
		params = append(params, user.ID)
	}
	if input.ActualCost != nil {
		query += ", actual_cost=?"
		params = append(params, *input.ActualCost)
	}
	if input.CompletedDate != nil {
		query += ", completed_date=?"
		params = append(params, *input.CompletedDate)
	}
	if input.Notes != nil {
		query += ", notes=?"
		params = append(params, *input.Notes)
	}

	if input.Status == "completed" || input.Status == "cancelled" {
		if input.Status == "completed" {
			query += ", completed_date=COALESCE(completed_date, CURDATE())"
		}

		var vehicleID int
		var ticketID sql.NullInt64
		var kmAtService int
		err := tx.QueryRow("SELECT vehicle_id, ticket_id, km_at_service FROM work_orders WHERE id=?", woID).Scan(&vehicleID, &ticketID, &kmAtService)
		if err == nil {
			// Reset vehicle status back to available
			_, _ = tx.Exec("UPDATE vehicles SET status='available' WHERE id=? AND status='maintenance'", vehicleID)

			if ticketID.Valid {
				targetTicketStatus := "pending"
				if input.Status == "completed" {
					targetTicketStatus = "completed"
				}
				_, _ = tx.Exec("UPDATE service_tickets SET status = ? WHERE id = ?", targetTicketStatus, ticketID.Int64)
			}

			if input.Status == "completed" {
				if kmAtService == 0 {
					_ = tx.QueryRow("SELECT current_km FROM vehicles WHERE id = ?", vehicleID).Scan(&kmAtService)
				}
				compDate := time.Now().Format("2006-01-02")
				if input.CompletedDate != nil && *input.CompletedDate != "" {
					compDate = *input.CompletedDate
				}
				_ = updateLinkedRoutineService(tx, nil, vehicleID, kmAtService, compDate)
			}
		}
	}

	query += " WHERE id=?"
	params = append(params, woID)

	_, err = tx.Exec(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Status updated"})
}

// ==========================================
// 3. ROUTINE SERVICES
// ==========================================

// GET /api/services/routine
func GetRoutineServices(c *gin.Context) {
	// Sync routine service statuses dynamically based on current vehicle KM and dates
	_, _ = config.DB.Exec(`
		UPDATE routine_services rs
		JOIN vehicles v ON rs.vehicle_id = v.id
		SET rs.status = CASE
			WHEN v.current_km >= rs.next_service_km OR CURDATE() >= rs.next_service_date THEN 'overdue'
			WHEN v.current_km >= (rs.next_service_km - 1000) OR DATEDIFF(rs.next_service_date, CURDATE()) <= 14 THEN 'due_soon'
			ELSE 'on_schedule'
		END
	`)

	rows, err := config.DB.Query(
		`SELECT rs.id, rs.vehicle_id, rs.service_name, rs.interval_km, rs.interval_days, rs.last_service_date, rs.last_service_km, rs.next_service_date, rs.next_service_km, rs.status, rs.notes, rs.created_at,
		        v.nopol, v.merk, v.current_km 
		 FROM routine_services rs 
		 JOIN vehicles v ON rs.vehicle_id = v.id 
		 ORDER BY rs.status DESC, rs.next_service_date`,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}
	defer rows.Close()

	list := []models.RoutineService{}
	for rows.Next() {
		var rs models.RoutineService
		var lastDate, nextDate sql.NullString
		var lastKm, nextKm sql.NullInt64
		var notes, nopol, merk sql.NullString
		var currentKm int

		err := rows.Scan(
			&rs.ID, &rs.VehicleID, &rs.ServiceName, &rs.IntervalKm, &rs.IntervalDays, &lastDate, &lastKm, &nextDate, &nextKm, &rs.Status, &notes, &rs.CreatedAt,
			&nopol, &merk, &currentKm,
		)
		if err == nil {
			if lastDate.Valid {
				rs.LastServiceDate = &lastDate.String
			}
			if nextDate.Valid {
				rs.NextServiceDate = &nextDate.String
			}
			if lastKm.Valid {
				val := int(lastKm.Int64)
				rs.LastServiceKm = &val
			}
			if nextKm.Valid {
				val := int(nextKm.Int64)
				rs.NextServiceKm = &val
			}
			if notes.Valid {
				rs.Notes = &notes.String
			}
			if nopol.Valid {
				rs.Nopol = &nopol.String
			}
			list = append(list, rs)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": list})
}

// POST /api/services/routine
func CreateRoutineService(c *gin.Context) {
	var input struct {
		VehicleID       int     `json:"vehicle_id" binding:"required"`
		ServiceName     string  `json:"service_name" binding:"required"`
		IntervalKm      int     `json:"interval_km"`
		IntervalDays    int     `json:"interval_days"`
		LastServiceDate *string `json:"last_service_date"`
		LastServiceKm   *int    `json:"last_service_km"`
		NextServiceDate *string `json:"next_service_date"`
		NextServiceKm   *int    `json:"next_service_km"`
		Notes           *string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	res, err := config.DB.Exec(
		`INSERT INTO routine_services (vehicle_id, service_name, interval_km, interval_days, last_service_date, last_service_km, next_service_date, next_service_km, notes) 
		 VALUES (?,?,?,?,?,?,?,?,?)`,
		input.VehicleID, input.ServiceName, input.IntervalKm, input.IntervalDays, input.LastServiceDate, input.LastServiceKm, input.NextServiceDate, input.NextServiceKm, input.Notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID}})
}

// PUT /api/services/routine/:id
func UpdateRoutineService(c *gin.Context) {
	rsID := c.Param("id")

	var input struct {
		VehicleID       int     `json:"vehicle_id" binding:"required"`
		ServiceName     string  `json:"service_name" binding:"required"`
		IntervalKm      int     `json:"interval_km"`
		IntervalDays    int     `json:"interval_days"`
		LastServiceDate *string `json:"last_service_date"`
		LastServiceKm   *int    `json:"last_service_km"`
		NextServiceDate *string `json:"next_service_date"`
		NextServiceKm   *int    `json:"next_service_km"`
		Notes           *string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	_, err := config.DB.Exec(
		`UPDATE routine_services 
		 SET vehicle_id=?, service_name=?, interval_km=?, interval_days=?, last_service_date=?, last_service_km=?, next_service_date=?, next_service_km=?, notes=? 
		 WHERE id=?`,
		input.VehicleID, input.ServiceName, input.IntervalKm, input.IntervalDays, input.LastServiceDate, input.LastServiceKm, input.NextServiceDate, input.NextServiceKm, input.Notes, rsID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Routine service updated"})
}

// DELETE /api/services/routine/:id
func DeleteRoutineService(c *gin.Context) {
	rsID := c.Param("id")

	_, err := config.DB.Exec("DELETE FROM routine_services WHERE id = ?", rsID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Routine service deleted"})
}

// GET /api/services/history
func GetServicesHistory(c *gin.Context) {
	vehicleID := c.Query("vehicle_id")
	sType := c.Query("type")

	query := `SELECT wo.id, wo.wo_number, wo.vehicle_id, wo.service_type, wo.description, wo.actual_cost, wo.completed_date,
	                 v.nopol, v.merk 
	          FROM work_orders wo 
	          JOIN vehicles v ON wo.vehicle_id = v.id 
	          WHERE wo.status = 'completed'`

	var params []interface{}
	if vehicleID != "" {
		query += " AND wo.vehicle_id = ?"
		params = append(params, vehicleID)
	}
	if sType != "" {
		query += " AND wo.service_type = ?"
		params = append(params, sType)
	}
	query += " ORDER BY wo.completed_date DESC"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	type ShortHistory struct {
		ID            int      `json:"id"`
		WoNumber      string   `json:"wo_number"`
		VehicleID     int      `json:"vehicle_id"`
		ServiceType   *string  `json:"service_type"`
		Description   string   `json:"description"`
		ActualCost    float64  `json:"actual_cost"`
		CompletedDate *string  `json:"completed_date"`
		Nopol         string   `json:"nopol"`
		Merk          string   `json:"merk"`
	}

	list := []ShortHistory{}
	for rows.Next() {
		var h ShortHistory
		var sType, compDate sql.NullString
		var actCost sql.NullFloat64
		err := rows.Scan(&h.ID, &h.WoNumber, &h.VehicleID, &sType, &h.Description, &actCost, &compDate, &h.Nopol, &h.Merk)
		if err == nil {
			if sType.Valid {
				h.ServiceType = &sType.String
			}
			if compDate.Valid {
				h.CompletedDate = &compDate.String
			}
			if actCost.Valid {
				h.ActualCost = actCost.Float64
			}
			list = append(list, h)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": list})
}

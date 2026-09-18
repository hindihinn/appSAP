package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"fleet-management-api/config"
	"fleet-management-api/middleware"

	"github.com/gin-gonic/gin"
)

// Generate RMB number: RMB-YYYYMMDD-XXXX
func generateRMBNumber() (string, error) {
	date := time.Now().Format("20060102")
	var cnt int
	err := config.DB.QueryRow("SELECT COUNT(*) as cnt FROM reimbursements WHERE DATE(created_at) = CURDATE()").Scan(&cnt)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("RMB-%s-%04d", date, cnt+1), nil
}

// GET /api/reimbursements
func GetReimbursements(c *gin.Context) {
	status := c.Query("status")
	driverID := c.Query("driver_id")

	query := `SELECT r.id, r.reimburse_number, r.trip_id, r.driver_id, r.total_amount, r.status, r.notes, r.submitted_at,
	                 r.reviewed_by, r.reviewed_at, r.approved_by, r.approved_at, r.paid_at, r.payee_bank, r.payee_account,
	                 r.payee_name, r.receipt_file, r.created_at,
	                 d.name as driver_name, d.employee_id, t.order_number, t.destination,
	                 rv.name as reviewed_by_name, ap.name as approved_by_name
	          FROM reimbursements r 
	          JOIN drivers d ON r.driver_id=d.id
	          LEFT JOIN trip_orders t ON r.trip_id=t.id
	          LEFT JOIN users rv ON r.reviewed_by=rv.id 
	          LEFT JOIN users ap ON r.approved_by=ap.id 
	          WHERE 1=1`

	var params []interface{}
	if status != "" {
		query += " AND r.status=?"
		params = append(params, status)
	}
	if driverID != "" {
		query += " AND r.driver_id=?"
		params = append(params, driverID)
	}
	query += " ORDER BY r.created_at DESC"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}
	defer rows.Close()

	type ReimburseResponse struct {
		ID              int        `json:"id"`
		ReimburseNumber string     `json:"reimburse_number"`
		TripID          int        `json:"trip_id"`
		DriverID        int        `json:"driver_id"`
		TotalAmount     float64    `json:"total_amount"`
		Status          string     `json:"status"`
		Notes           *string    `json:"notes"`
		SubmittedAt     *time.Time `json:"submitted_at"`
		ReviewedBy      *int       `json:"reviewed_by"`
		ReviewedAt      *time.Time `json:"reviewed_at"`
		ApprovedBy      *int       `json:"approved_by"`
		ApprovedAt      *time.Time `json:"approved_at"`
		PaidAt          *time.Time `json:"paid_at"`
		PayeeBank       *string    `json:"payee_bank"`
		PayeeAccount    *string    `json:"payee_account"`
		PayeeName       *string    `json:"payee_name"`
		ReceiptFile     *string    `json:"receipt_file"`
		CreatedAt       time.Time  `json:"created_at"`
		DriverName      string     `json:"driver_name"`
		EmployeeID      string     `json:"employee_id"`
		OrderNumber     *string    `json:"order_number"`
		Destination     *string    `json:"destination"`
		ReviewedByName  *string    `json:"reviewed_by_name"`
		ApprovedByName  *string    `json:"approved_by_name"`
	}

	list := []ReimburseResponse{}
	for rows.Next() {
		var r ReimburseResponse
		var notes, payeeBank, payeeAcc, payeeName, receiptF, ordNum, dest, revByName, appByName sql.NullString
		var subAt, revAt, appAt, paidAt sql.NullTime
		var revBy, appBy sql.NullInt64

		err := rows.Scan(
			&r.ID, &r.ReimburseNumber, &r.TripID, &r.DriverID, &r.TotalAmount, &r.Status, &notes, &subAt,
			&revBy, &revAt, &appBy, &appAt, &paidAt, &payeeBank, &payeeAcc, &payeeName, &receiptF, &r.CreatedAt,
			&r.DriverName, &r.EmployeeID, &ordNum, &dest, &revByName, &appByName,
		)
		if err == nil {
			if notes.Valid {
				r.Notes = &notes.String
			}
			if subAt.Valid {
				r.SubmittedAt = &subAt.Time
			}
			if revBy.Valid {
				val := int(revBy.Int64)
				r.ReviewedBy = &val
			}
			if revAt.Valid {
				r.ReviewedAt = &revAt.Time
			}
			if appBy.Valid {
				val := int(appBy.Int64)
				r.ApprovedBy = &val
			}
			if appAt.Valid {
				r.ApprovedAt = &appAt.Time
			}
			if paidAt.Valid {
				r.PaidAt = &paidAt.Time
			}
			if payeeBank.Valid {
				r.PayeeBank = &payeeBank.String
			}
			if payeeAcc.Valid {
				r.PayeeAccount = &payeeAcc.String
			}
			if payeeName.Valid {
				r.PayeeName = &payeeName.String
			}
			if receiptF.Valid {
				r.ReceiptFile = &receiptF.String
			}
			if ordNum.Valid {
				r.OrderNumber = &ordNum.String
			}
			if dest.Valid {
				r.Destination = &dest.String
			}
			if revByName.Valid {
				r.ReviewedByName = &revByName.String
			}
			if appByName.Valid {
				r.ApprovedByName = &appByName.String
			}
			list = append(list, r)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": list})
}

// GET /api/reimbursements/:id
func GetReimbursementByID(c *gin.Context) {
	reimbursementID := c.Param("id")

	query := `SELECT r.id, r.reimburse_number, r.trip_id, r.driver_id, r.total_amount, r.status, r.notes, r.submitted_at,
	                 r.reviewed_by, r.reviewed_at, r.approved_by, r.approved_at, r.paid_at, r.payee_bank, r.payee_account,
	                 r.payee_name, r.receipt_file, r.created_at,
	                 d.name as driver_name, t.order_number, t.destination 
	          FROM reimbursements r 
	          JOIN drivers d ON r.driver_id=d.id 
	          LEFT JOIN trip_orders t ON r.trip_id=t.id 
	          WHERE r.id=?`

	row := config.DB.QueryRow(query, reimbursementID)

	type DetailReimburse struct {
		ID              int        `json:"id"`
		ReimburseNumber string     `json:"reimburse_number"`
		TripID          int        `json:"trip_id"`
		DriverID        int        `json:"driver_id"`
		TotalAmount     float64    `json:"total_amount"`
		Status          string     `json:"status"`
		Notes           *string    `json:"notes"`
		SubmittedAt     *time.Time `json:"submitted_at"`
		ReviewedBy      *int       `json:"reviewed_by"`
		ReviewedAt      *time.Time `json:"reviewed_at"`
		ApprovedBy      *int       `json:"approved_by"`
		ApprovedAt      *time.Time `json:"approved_at"`
		PaidAt          *time.Time `json:"paid_at"`
		PayeeBank       *string    `json:"payee_bank"`
		PayeeAccount    *string    `json:"payee_account"`
		PayeeName       *string    `json:"payee_name"`
		ReceiptFile     *string    `json:"receipt_file"`
		CreatedAt       time.Time  `json:"created_at"`
		DriverName      string     `json:"driver_name"`
		OrderNumber     *string    `json:"order_number"`
		Destination     *string    `json:"destination"`
		Items           []gin.H    `json:"items"`
	}

	var r DetailReimburse
	var notes, payeeBank, payeeAcc, payeeName, receiptF, ordNum, dest sql.NullString
	var subAt, revAt, appAt, paidAt sql.NullTime
	var revBy, appBy sql.NullInt64

	err := row.Scan(
		&r.ID, &r.ReimburseNumber, &r.TripID, &r.DriverID, &r.TotalAmount, &r.Status, &notes, &subAt,
		&revBy, &revAt, &appBy, &appAt, &paidAt, &payeeBank, &payeeAcc, &payeeName, &receiptF, &r.CreatedAt,
		&r.DriverName, &ordNum, &dest,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	if notes.Valid {
		r.Notes = &notes.String
	}
	if subAt.Valid {
		r.SubmittedAt = &subAt.Time
	}
	if revBy.Valid {
		val := int(revBy.Int64)
		r.ReviewedBy = &val
	}
	if revAt.Valid {
		r.ReviewedAt = &revAt.Time
	}
	if appBy.Valid {
		val := int(appBy.Int64)
		r.ApprovedBy = &val
	}
	if appAt.Valid {
		r.ApprovedAt = &appAt.Time
	}
	if paidAt.Valid {
		r.PaidAt = &paidAt.Time
	}
	if payeeBank.Valid {
		r.PayeeBank = &payeeBank.String
	}
	if payeeAcc.Valid {
		r.PayeeAccount = &payeeAcc.String
	}
	if payeeName.Valid {
		r.PayeeName = &payeeName.String
	}
	if receiptF.Valid {
		r.ReceiptFile = &receiptF.String
	}
	if ordNum.Valid {
		r.OrderNumber = &ordNum.String
	}
	if dest.Valid {
		r.Destination = &dest.String
	}

	// Fetch items
	rowsIt, err := config.DB.Query("SELECT id, reimbursement_id, type, description, amount, receipt_photo, receipt_date, notes FROM reimbursement_items WHERE reimbursement_id=?", reimbursementID)
	r.Items = []gin.H{}
	if err == nil {
		defer rowsIt.Close()
		for rowsIt.Next() {
			var itemID, rmbID int
			var amount float64
			var iType, desc, photo, notesItem sql.NullString
			var rDate sql.NullTime

			if err := rowsIt.Scan(&itemID, &rmbID, &iType, &desc, &amount, &photo, &rDate, &notesItem); err == nil {
				r.Items = append(r.Items, gin.H{
					"id":               itemID,
					"reimbursement_id": rmbID,
					"type":             iType.String,
					"description":      desc.String,
					"amount":           amount,
					"receipt_photo":    photo.String,
					"receipt_date":     rDate.Time,
					"notes":            notesItem.String,
				})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": r})
}

// POST /api/reimbursements
func CreateReimbursement(c *gin.Context) {
	type ItemInput struct {
		Type        string  `json:"type" binding:"required"`
		Description string  `json:"description"`
		Amount      float64 `json:"amount" binding:"required"`
		ReceiptDate *string `json:"receipt_date"`
		Notes       *string `json:"notes"`
	}

	var input struct {
		TripID   int         `json:"trip_id" binding:"required"`
		DriverID int         `json:"driver_id" binding:"required"`
		Notes    *string     `json:"notes"`
		Items    []ItemInput `json:"items"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	rmbNumber, err := generateRMBNumber()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal generate nomor reimbursement"})
		return
	}

	total := 0.0
	for _, it := range input.Items {
		total += it.Amount
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	res, err := tx.Exec(
		`INSERT INTO reimbursements (reimburse_number, trip_id, driver_id, total_amount, notes) VALUES (?,?,?,?,?)`,
		rmbNumber, input.TripID, input.DriverID, total, input.Notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menyimpan reimbursement: " + err.Error()})
		return
	}

	insertID, _ := res.LastInsertId()

	for _, it := range input.Items {
		var dateVal interface{} = nil
		if it.ReceiptDate != nil && *it.ReceiptDate != "" {
			dateVal = *it.ReceiptDate
		}
		_, err = tx.Exec(
			`INSERT INTO reimbursement_items (reimbursement_id, type, description, amount, receipt_date, notes) VALUES (?,?,?,?,?,?)`,
			insertID, it.Type, it.Description, it.Amount, dateVal, it.Notes,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menyimpan detail item: " + err.Error()})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID, "reimburse_number": rmbNumber}})
}

// POST /api/reimbursements/:id/items
func AddReimbursementItem(c *gin.Context) {
	reimbursementID := c.Param("id")

	iType := c.PostForm("type")
	description := c.PostForm("description")
	amountStr := c.PostForm("amount")
	receiptDate := c.PostForm("receipt_date")
	notes := c.PostForm("notes")

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid amount"})
		return
	}

	var receiptPhoto *string
	if file, err := c.FormFile("receipt_photo"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "reimbursements"); err == nil {
			receiptPhoto = &path
		}
	}

	var dateVal interface{} = nil
	if receiptDate != "" {
		dateVal = receiptDate
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	res, err := tx.Exec(
		`INSERT INTO reimbursement_items (reimbursement_id, type, description, amount, receipt_photo, receipt_date, notes) VALUES (?,?,?,?,?,?,?)`,
		reimbursementID, iType, description, amount, receiptPhoto, dateVal, notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menyimpan item: " + err.Error()})
		return
	}

	// Update total amount on reimbursement
	_, err = tx.Exec("UPDATE reimbursements SET total_amount=(SELECT SUM(amount) FROM reimbursement_items WHERE reimbursement_id=?) WHERE id=?", reimbursementID, reimbursementID)
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

// PUT /api/reimbursements/:id/status
func UpdateReimbursementStatus(c *gin.Context) {
	reimbursementID := c.Param("id")

	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	var input struct {
		Status          string  `json:"status" binding:"required"`
		RejectionReason *string `json:"rejection_reason"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	query := "UPDATE reimbursements SET status=?"
	params := []interface{}{input.Status}

	if input.Status == "submitted" {
		query += ", submitted_at=NOW()"
	}
	if input.Status == "reviewed" {
		query += ", reviewed_by=?, reviewed_at=NOW()"
		params = append(params, user.ID)
	}
	if input.Status == "approved" {
		query += ", approved_by=?, approved_at=NOW()"
		params = append(params, user.ID)
	}
	if input.Status == "paid" {
		query += ", paid_at=NOW()"
	}
	if input.Status == "rejected" {
		query += ", rejection_reason=?"
		params = append(params, input.RejectionReason)
	}

	query += " WHERE id=?"
	params = append(params, reimbursementID)

	_, err := config.DB.Exec(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Status updated"})
}

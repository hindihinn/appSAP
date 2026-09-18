package handlers

import (
	"net/http"
	"time"

	"fleet-management-api/config"
	"fleet-management-api/middleware"
	"fleet-management-api/models"

	"github.com/gin-gonic/gin"
)

// GET /api/notifications
func GetNotifications(c *gin.Context) {
	userVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Akses ditolak"})
		return
	}
	user := userVal.(middleware.UserContext)

	// 1. If user is super_admin, admin_ga, or ga, dynamically generate warnings for expiring documents
	if user.RoleName == "super_admin" || user.RoleName == "admin_ga" || user.RoleName == "ga" {
		generateDriverLegalityNotifications(user.ID)
		generateVehicleLegalityNotifications(user.ID)
	}

	// 2. Fetch notifications for current user from DB
	query := `SELECT id, user_id, title, message, type, module, reference_id, reference_type, is_read, created_at 
	          FROM notifications 
	          WHERE user_id = ? 
	          ORDER BY created_at DESC LIMIT 50`
	rows, err := config.DB.Query(query, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal mengambil data notifikasi"})
		return
	}
	defer rows.Close()

	notifications := []models.Notification{}
	for rows.Next() {
		var n models.Notification
		err := rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Message, &n.Type, &n.Module, &n.ReferenceID, &n.ReferenceType, &n.IsRead, &n.CreatedAt)
		if err != nil {
			continue
		}
		notifications = append(notifications, n)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    notifications,
	})
}

// PUT /api/notifications/:id/read
func MarkNotificationRead(c *gin.Context) {
	userVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Akses ditolak"})
		return
	}
	user := userVal.(middleware.UserContext)

	id := c.Param("id")
	_, err := config.DB.Exec("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", id, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menandai notifikasi dibaca"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Notifikasi berhasil ditandai dibaca",
	})
}

// PUT /api/notifications/read-all
func MarkAllNotificationsRead(c *gin.Context) {
	userVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Akses ditolak"})
		return
	}
	user := userVal.(middleware.UserContext)

	_, err := config.DB.Exec("UPDATE notifications SET is_read = 1 WHERE user_id = ?", user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menandai seluruh notifikasi dibaca"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Seluruh notifikasi berhasil ditandai dibaca",
	})
}

func generateDriverLegalityNotifications(userID int) {
	query := `SELECT dl.id, d.name, dl.type, dl.expiry_date 
	          FROM driver_legality dl
	          JOIN drivers d ON dl.driver_id = d.id`
	rows, err := config.DB.Query(query)
	if err != nil {
		return
	}
	defer rows.Close()

	docTypes := map[string]string{
		"sim_a":            "SIM A",
		"sim_b1":           "SIM B1",
		"sim_b2":           "SIM B2",
		"sim_c":            "SIM C",
		"medical_checkup":  "Medical Checkup",
		"training_cert":    "Sertifikat Training",
	}

	now := time.Now()
	for rows.Next() {
		var id int
		var driverName, docType string
		var expiryDateStr string
		if err := rows.Scan(&id, &driverName, &docType, &expiryDateStr); err != nil {
			continue
		}

		expiryDate, err := time.Parse("2006-01-02", expiryDateStr)
		if err != nil {
			expiryDate, err = time.Parse("2006-01-02 15:04:05", expiryDateStr)
			if err != nil {
				continue
			}
		}

		daysRemaining := int(expiryDate.Sub(now).Hours() / 24)
		if daysRemaining <= 30 {
			var count int
			err := config.DB.QueryRow(`SELECT COUNT(*) FROM notifications 
			                           WHERE user_id = ? AND reference_type = 'driver_legality' AND reference_id = ?`, 
			                           userID, id).Scan(&count)
			if err != nil || count > 0 {
				continue
			}

			title := "Legalitas Driver Segera Kadaluarsa"
			msgType := "warning"
			if daysRemaining < 0 {
				title = "Legalitas Driver Kadaluarsa"
				msgType = "danger"
			}

			docName := docTypes[docType]
			if docName == "" {
				docName = docType
			}

			message := "Dokumen " + docName + " milik driver " + driverName + " akan kadaluarsa pada " + expiryDateStr + "."
			if daysRemaining < 0 {
				message = "Dokumen " + docName + " milik driver " + driverName + " telah kadaluarsa pada " + expiryDateStr + "."
			}

			config.DB.Exec(`INSERT INTO notifications (user_id, title, message, type, module, reference_id, reference_type, is_read) 
			                VALUES (?, ?, ?, ?, 'hr', ?, 'driver_legality', 0)`,
			                userID, title, message, msgType, id)
		}
	}
}

func generateVehicleLegalityNotifications(userID int) {
	query := `SELECT vl.id, v.nopol, v.merk, v.model, vl.type, vl.expiry_date 
	          FROM vehicle_legality vl
	          JOIN vehicles v ON vl.vehicle_id = v.id`
	rows, err := config.DB.Query(query)
	if err != nil {
		return
	}
	defer rows.Close()

	docTypes := map[string]string{
		"stnk":         "STNK (Pajak 1 Tahunan)",
		"pajak_5_year": "Pajak 5 Tahunan",
		"kir":          "KEUR / KIR",
		"siup":         "SIUP",
		"insurance":    "Asuransi",
		"other":        "Lainnya",
	}

	now := time.Now()
	for rows.Next() {
		var id int
		var nopol, merk, model, docType string
		var expiryDateStr string
		if err := rows.Scan(&id, &nopol, &merk, &model, &docType, &expiryDateStr); err != nil {
			continue
		}

		expiryDate, err := time.Parse("2006-01-02", expiryDateStr)
		if err != nil {
			expiryDate, err = time.Parse("2006-01-02 15:04:05", expiryDateStr)
			if err != nil {
				continue
			}
		}

		daysRemaining := int(expiryDate.Sub(now).Hours() / 24)
		if daysRemaining <= 30 {
			var count int
			err := config.DB.QueryRow(`SELECT COUNT(*) FROM notifications 
			                           WHERE user_id = ? AND reference_type = 'vehicle_legality' AND reference_id = ?`, 
			                           userID, id).Scan(&count)
			if err != nil || count > 0 {
				continue
			}

			title := "Legalitas Kendaraan Segera Kadaluarsa"
			msgType := "warning"
			if daysRemaining < 0 {
				title = "Legalitas Kendaraan Kadaluarsa"
				msgType = "danger"
			}

			docName := docTypes[docType]
			if docName == "" {
				docName = docType
			}

			vehName := nopol + " (" + merk + " " + model + ")"
			message := "Dokumen " + docName + " milik kendaraan " + vehName + " akan kadaluarsa pada " + expiryDateStr + "."
			if daysRemaining < 0 {
				message = "Dokumen " + docName + " milik kendaraan " + vehName + " telah kadaluarsa pada " + expiryDateStr + "."
			}

			config.DB.Exec(`INSERT INTO notifications (user_id, title, message, type, module, reference_id, reference_type, is_read) 
			                VALUES (?, ?, ?, ?, 'vehicles', ?, 'vehicle_legality', 0)`,
			                userID, title, message, msgType, id)
		}
	}
}

// Helper to create notification for a specific user ID
func CreateNotificationForUser(userID int, title, message, msgType, module string, refID int, refType string) error {
	query := `INSERT INTO notifications (user_id, title, message, type, module, reference_id, reference_type, is_read) 
	          VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
	_, err := config.DB.Exec(query, userID, title, message, msgType, module, refID, refType)
	return err
}

// Helper to create notifications for all users with specific roles (by their key name)
func CreateNotificationForRoles(roleNames []string, title, message, msgType, module string, refID int, refType string) error {
	query := `SELECT u.id FROM users u 
	          JOIN roles r ON u.role_id = r.id 
	          WHERE r.name IN (`
	var params []interface{}
	for i, name := range roleNames {
		if i > 0 {
			query += ","
		}
		query += "?"
		params = append(params, name)
	}
	query += ")"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var uID int
		if err := rows.Scan(&uID); err == nil {
			CreateNotificationForUser(uID, title, message, msgType, module, refID, refType)
		}
	}
	return nil
}

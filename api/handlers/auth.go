package handlers

import (
	"database/sql"
	"net/http"

	"fleet-management-api/config"
	"fleet-management-api/middleware"
	"fleet-management-api/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// POST /api/auth/login
func Login(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Username dan password wajib diisi"})
		return
	}

	query := `SELECT u.id, u.name, u.username, u.password, u.phone, u.avatar, u.role_id, u.company_id, u.unit_id,
	                 r.name as role_name, r.display_name as role_display_name,
	                 c.name as company_name, un.name as unit_name
	          FROM users u
	          LEFT JOIN roles r ON u.role_id = r.id
	          LEFT JOIN companies c ON u.company_id = c.id
	          LEFT JOIN units un ON u.unit_id = un.id
	          WHERE u.username = ? AND u.is_active = 1`

	row := config.DB.QueryRow(query, input.Username)

	var u models.User
	var companyID, unitID sql.NullInt64
	var companyName, unitName sql.NullString
	var phone, avatar sql.NullString

	err := row.Scan(&u.ID, &u.Name, &u.Username, &u.Password, &phone, &avatar, &u.RoleID, &companyID, &unitID,
		&u.RoleName, &u.RoleDisplayName, &companyName, &unitName)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Username atau password salah"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	// Verify Password
	err = bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(input.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Username atau password salah"})
		return
	}

	// Get Permissions
	rows, err := config.DB.Query(`SELECT p.name FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?`, u.RoleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	u.Permissions = []string{}
	for rows.Next() {
		var permName string
		if err := rows.Scan(&permName); err == nil {
			u.Permissions = append(u.Permissions, permName)
		}
	}

	// Generate Token
	token, err := middleware.GenerateToken(u.ID, u.RoleName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal membuat token"})
		return
	}

	// Update last login
	_, _ = config.DB.Exec("UPDATE users SET last_login = NOW() WHERE id = ?", u.ID)

	// Clean fields
	u.Password = ""
	if phone.Valid {
		u.Phone = &phone.String
	}
	if avatar.Valid {
		u.Avatar = &avatar.String
	}
	if companyID.Valid {
		val := int(companyID.Int64)
		u.CompanyID = &val
	}
	if unitID.Valid {
		val := int(unitID.Int64)
		u.UnitID = &val
	}
	if companyName.Valid {
		u.CompanyName = &companyName.String
	}
	if unitName.Valid {
		u.UnitName = &unitName.String
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user":  u,
			"token": token,
		},
	})
}

// POST /api/auth/register
func Register(c *gin.Context) {
	var input struct {
		Name       string `json:"name" binding:"required"`
		Username   string `json:"username" binding:"required"`
		Password   string `json:"password" binding:"required"`
		Phone      string `json:"phone"`
		RoleID     int    `json:"role_id" binding:"required"`
		CompanyID  *int   `json:"company_id"`
		UnitID     *int   `json:"unit_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	// Check existing username
	var existingID int
	err := config.DB.QueryRow("SELECT id FROM users WHERE username = ?", input.Username).Scan(&existingID)
	if err != sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Username sudah terdaftar"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	// Insert user
	result, err := config.DB.Exec(
		"INSERT INTO users (name, username, password, phone, role_id, company_id, unit_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
		input.Name, input.Username, hashedPassword, input.Phone, input.RoleID, input.CompanyID, input.UnitID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menyimpan user"})
		return
	}

	insertID, _ := result.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"id": insertID,
		},
		"message": "User berhasil dibuat",
	})
}

// GET /api/auth/me
func GetMe(c *gin.Context) {
	userVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Akses ditolak"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    userVal,
	})
}

// PUT /api/auth/fcm-token
func UpdateFcmToken(c *gin.Context) {
	userVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Akses ditolak"})
		return
	}
	user := userVal.(middleware.UserContext)

	var input struct {
		FcmToken string `json:"fcm_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "FCM Token wajib diisi"})
		return
	}

	_, err := config.DB.Exec("UPDATE users SET fcm_token = ? WHERE id = ?", input.FcmToken, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal mengupdate FCM token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "FCM token updated",
	})
}

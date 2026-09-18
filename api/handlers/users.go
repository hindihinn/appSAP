package handlers

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"fleet-management-api/config"
	"fleet-management-api/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// GET /api/users
func GetUsers(c *gin.Context) {
	roleID := c.Query("role_id")
	search := c.Query("search")
	status := c.Query("status")
	userType := c.Query("type")

	query := `SELECT u.id, u.name, u.username, u.phone, u.role_id, u.is_active, u.last_login, u.created_at,
	                 r.name as role_name, c.name as company_name, un.name as unit_name
	          FROM users u
	          LEFT JOIN roles r ON u.role_id = r.id
	          LEFT JOIN companies c ON u.company_id = c.id
	          LEFT JOIN units un ON u.unit_id = un.id
	          WHERE 1=1`

	var params []interface{}

	if roleID != "" {
		query += " AND u.role_id = ?"
		params = append(params, roleID)
	}
	if userType == "web" {
		query += " AND u.role_id IN (SELECT id FROM roles WHERE platform = 'web' OR platform IS NULL)"
	}
	if userType == "mobile" {
		query += " AND u.role_id IN (SELECT id FROM roles WHERE platform = 'mobile')"
	}
	if status == "active" {
		query += " AND u.is_active = 1"
	}
	if status == "inactive" {
		query += " AND u.is_active = 0"
	}
	if search != "" {
		query += " AND (u.name LIKE ? OR u.username LIKE ?)"
		params = append(params, "%"+search+"%", "%"+search+"%")
	}

	query += " ORDER BY u.name"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var u models.User
		var phone, lastLogin sql.NullString
		var compName, unitName sql.NullString
		err := rows.Scan(&u.ID, &u.Name, &u.Username, &phone, &u.RoleID, &u.IsActive, &lastLogin, &u.CreatedAt,
			&u.RoleName, &compName, &unitName)
		if err == nil {
			if phone.Valid {
				u.Phone = &phone.String
			}
			if lastLogin.Valid {
				t, err := timeParse(lastLogin.String)
				if err == nil {
					u.LastLogin = &t
				}
			}
			if compName.Valid {
				u.CompanyName = &compName.String
			}
			if unitName.Valid {
				u.UnitName = &unitName.String
			}
			users = append(users, u)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": users})
}

// GET /api/users/:id
func GetUserByID(c *gin.Context) {
	userID := c.Param("id")

	query := `SELECT u.id, u.name, u.username, u.phone, u.role_id, u.company_id, u.unit_id, u.is_active, u.created_at,
	                 r.name as role_name
	          FROM users u
	          LEFT JOIN roles r ON u.role_id = r.id
	          WHERE u.id = ?`

	row := config.DB.QueryRow(query, userID)

	var u models.User
	var phone sql.NullString
	var compID, unitID sql.NullInt64

	err := row.Scan(&u.ID, &u.Name, &u.Username, &phone, &u.RoleID, &compID, &unitID, &u.IsActive, &u.CreatedAt, &u.RoleName)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User tidak ditemukan"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	if phone.Valid {
		u.Phone = &phone.String
	}
	if compID.Valid {
		val := int(compID.Int64)
		u.CompanyID = &val
	}
	if unitID.Valid {
		val := int(unitID.Int64)
		u.UnitID = &val
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": u})
}

// POST /api/users
func CreateUser(c *gin.Context) {
	var input struct {
		Name       string `json:"name" binding:"required"`
		Username   string `json:"username" binding:"required"`
		Password   string `json:"password"`
		Phone      string `json:"phone"`
		RoleID     int    `json:"role_id" binding:"required"`
		CompanyID  *int   `json:"company_id"`
		UnitID     *int   `json:"unit_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	pwd := "password123"
	if input.Password != "" {
		pwd = input.Password
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(pwd), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	res, err := config.DB.Exec(
		`INSERT INTO users (name, username, password, phone, role_id, company_id, unit_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		input.Name, input.Username, hashedPassword, input.Phone, input.RoleID, input.CompanyID, input.UnitID,
	)

	if err != nil {
		if strings.Contains(err.Error(), "Error 1062") {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Username sudah terdaftar"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    gin.H{"id": insertID},
		"message": "User berhasil ditambahkan",
	})
}

// PUT /api/users/:id
func UpdateUser(c *gin.Context) {
	userID := c.Param("id")

	var input struct {
		Name       string  `json:"name" binding:"required"`
		Username   string  `json:"username" binding:"required"`
		Phone      string  `json:"phone"`
		RoleID     int     `json:"role_id" binding:"required"`
		CompanyID  *int    `json:"company_id"`
		UnitID     *int    `json:"unit_id"`
		IsActive   *int    `json:"is_active"`
		Password   *string `json:"password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	isActive := 1
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	query := `UPDATE users SET name=?, username=?, phone=?, role_id=?, company_id=?, unit_id=?, is_active=?`
	params := []interface{}{input.Name, input.Username, input.Phone, input.RoleID, input.CompanyID, input.UnitID, isActive}

	if input.Password != nil && *input.Password != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(*input.Password), 10)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
			return
		}
		query += ", password=?"
		params = append(params, hashed)
	}

	query += " WHERE id=?"
	params = append(params, userID)

	_, err := config.DB.Exec(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "User berhasil diupdate"})
}

// DELETE /api/users/:id
func DeleteUser(c *gin.Context) {
	userID := c.Param("id")

	var id int
	err := config.DB.QueryRow("SELECT id FROM users WHERE id = ?", userID).Scan(&id)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User tidak ditemukan"})
		return
	}

	_, err = config.DB.Exec("DELETE FROM users WHERE id = ?", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "User berhasil dihapus"})
}

// Helper to parse MySQL timestamps to time.Time
func timeParse(val string) (time.Time, error) {
	// Standard MySQL datetime format is "2006-01-02 15:04:05"
	// Sometimes it might have T and Z depending on formatting
	layouts := []string{
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05Z",
		time.RFC3339,
	}

	var parsed time.Time
	var err error
	for _, layout := range layouts {
		parsed, err = time.Parse(layout, val)
		if err == nil {
			return parsed, nil
		}
	}
	return time.Time{}, err
}

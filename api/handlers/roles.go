package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"fleet-management-api/config"
	"fleet-management-api/models"

	"github.com/gin-gonic/gin"
)

// GET /api/roles
func GetRoles(c *gin.Context) {
	rows, err := config.DB.Query("SELECT id, name, display_name, description, platform, is_system, created_at FROM roles ORDER BY id")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	roles := []models.Role{}
	for rows.Next() {
		var r models.Role
		var desc, plat sql.NullString
		if err := rows.Scan(&r.ID, &r.Name, &r.DisplayName, &desc, &plat, &r.IsSystem, &r.CreatedAt); err == nil {
			if desc.Valid {
				r.Description = &desc.String
			}
			if plat.Valid {
				r.Platform = &plat.String
			}
			roles = append(roles, r)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": roles})
}

// GET /api/roles/permissions
func GetPermissions(c *gin.Context) {
	rows, err := config.DB.Query("SELECT id, name, display_name, module, description, created_at FROM permissions ORDER BY module, name")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	perms := []models.Permission{}
	for rows.Next() {
		var p models.Permission
		var desc sql.NullString
		if err := rows.Scan(&p.ID, &p.Name, &p.DisplayName, &p.Module, &desc, &p.CreatedAt); err == nil {
			if desc.Valid {
				p.Description = &desc.String
			}
			perms = append(perms, p)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": perms})
}

// GET /api/roles/:id/permissions
func GetRolePermissions(c *gin.Context) {
	roleID := c.Param("id")
	rows, err := config.DB.Query(
		`SELECT p.id, p.name, p.display_name, p.module, p.description, p.created_at
		 FROM permissions p
		 JOIN role_permissions rp ON p.id = rp.permission_id
		 WHERE rp.role_id = ?`, roleID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	perms := []models.Permission{}
	for rows.Next() {
		var p models.Permission
		var desc sql.NullString
		if err := rows.Scan(&p.ID, &p.Name, &p.DisplayName, &p.Module, &desc, &p.CreatedAt); err == nil {
			if desc.Valid {
				p.Description = &desc.String
			}
			perms = append(perms, p)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": perms})
}

// POST /api/roles
func CreateRole(c *gin.Context) {
	var input struct {
		Name        string  `json:"name" binding:"required"`
		DisplayName string  `json:"display_name" binding:"required"`
		Description *string `json:"description"`
		Platform    *string `json:"platform"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Nama dan display name wajib diisi"})
		return
	}

	platform := "web"
	if input.Platform != nil {
		platform = *input.Platform
	}

	res, err := config.DB.Exec(
		"INSERT INTO roles (name, display_name, description, platform) VALUES (?, ?, ?, ?)",
		input.Name, input.DisplayName, input.Description, platform,
	)
	if err != nil {
		if strings.Contains(err.Error(), "Error 1062") {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Role sudah ada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    gin.H{"id": insertID},
		"message": "Role berhasil ditambahkan",
	})
}

// PUT /api/roles/:id
func UpdateRole(c *gin.Context) {
	roleID := c.Param("id")

	var input struct {
		DisplayName string  `json:"display_name" binding:"required"`
		Description *string `json:"description"`
		Platform    *string `json:"platform"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	var name string
	var isSystem int
	err := config.DB.QueryRow("SELECT name, is_system FROM roles WHERE id = ?", roleID).Scan(&name, &isSystem)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Role tidak ditemukan"})
		return
	}

	if isSystem == 1 && name == "super_admin" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Tidak bisa edit Super Admin"})
		return
	}

	platform := "web"
	if input.Platform != nil {
		platform = *input.Platform
	}

	_, err = config.DB.Exec(
		"UPDATE roles SET display_name = ?, description = ?, platform = ? WHERE id = ?",
		input.DisplayName, input.Description, platform, roleID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Role berhasil diupdate"})
}

// PUT /api/roles/:id/permissions
func UpdateRolePermissions(c *gin.Context) {
	roleID := c.Param("id")

	var input struct {
		PermissionIDs []int `json:"permission_ids"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	var name string
	var isSystem int
	err := config.DB.QueryRow("SELECT name, is_system FROM roles WHERE id = ?", roleID).Scan(&name, &isSystem)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Role tidak ditemukan"})
		return
	}

	if isSystem == 1 && name == "super_admin" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Tidak bisa edit permission Super Admin"})
		return
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM role_permissions WHERE role_id = ?", roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	if len(input.PermissionIDs) > 0 {
		// Bulk insert
		sqlStr := "INSERT INTO role_permissions (role_id, permission_id) VALUES "
		vals := []interface{}{}
		for _, pid := range input.PermissionIDs {
			sqlStr += "(?, ?),"
			vals = append(vals, roleID, pid)
		}
		sqlStr = sqlStr[0 : len(sqlStr)-1] // Remove trailing comma
		_, err = tx.Exec(sqlStr, vals...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Permissions updated"})
}

// DELETE /api/roles/:id
func DeleteRole(c *gin.Context) {
	roleID := c.Param("id")

	var isSystem int
	err := config.DB.QueryRow("SELECT is_system FROM roles WHERE id = ?", roleID).Scan(&isSystem)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Role tidak ditemukan"})
		return
	}

	if isSystem == 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Tidak bisa hapus role sistem"})
		return
	}

	_, err = config.DB.Exec("DELETE FROM roles WHERE id = ?", roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Role deleted"})
}

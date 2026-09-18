package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"fleet-management-api/config"
	"fleet-management-api/models"

	"github.com/gin-gonic/gin"
)

// ============ COMPANIES ============

// GET /api/organizations/companies
func GetCompanies(c *gin.Context) {
	rows, err := config.DB.Query("SELECT id, name, code, address, phone, email, logo, is_active, created_at FROM companies WHERE is_active = 1 ORDER BY name")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	companies := []models.Company{}
	for rows.Next() {
		var comp models.Company
		var address, phone, email, logo sql.NullString
		err := rows.Scan(&comp.ID, &comp.Name, &comp.Code, &address, &phone, &email, &logo, &comp.IsActive, &comp.CreatedAt)
		if err == nil {
			if address.Valid {
				comp.Address = &address.String
			}
			if phone.Valid {
				comp.Phone = &phone.String
			}
			if email.Valid {
				comp.Email = &email.String
			}
			if logo.Valid {
				comp.Logo = &logo.String
			}
			companies = append(companies, comp)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": companies})
}

// POST /api/organizations/companies
func CreateCompany(c *gin.Context) {
	var input struct {
		Name    string  `json:"name" binding:"required"`
		Code    string  `json:"code" binding:"required"`
		Address *string `json:"address"`
		Phone   *string `json:"phone"`
		Email   *string `json:"email"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	res, err := config.DB.Exec(
		"INSERT INTO companies (name, code, address, phone, email) VALUES (?, ?, ?, ?, ?)",
		input.Name, input.Code, input.Address, input.Phone, input.Email,
	)
	if err != nil {
		if strings.Contains(err.Error(), "Error 1062") {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Kode perusahaan sudah ada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID}})
}

// PUT /api/organizations/companies/:id
func UpdateCompany(c *gin.Context) {
	companyID := c.Param("id")

	var input struct {
		Name     string  `json:"name" binding:"required"`
		Code     string  `json:"code" binding:"required"`
		Address  *string `json:"address"`
		Phone    *string `json:"phone"`
		Email    *string `json:"email"`
		IsActive *int    `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	isActive := 1
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	_, err := config.DB.Exec(
		"UPDATE companies SET name=?, code=?, address=?, phone=?, email=?, is_active=? WHERE id=?",
		input.Name, input.Code, input.Address, input.Phone, input.Email, isActive, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Company updated"})
}

// DELETE /api/organizations/companies/:id
func DeleteCompany(c *gin.Context) {
	companyID := c.Param("id")
	_, err := config.DB.Exec("UPDATE companies SET is_active = 0 WHERE id = ?", companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Company deactivated"})
}

// ============ UNITS ============

// GET /api/organizations/units
func GetUnits(c *gin.Context) {
	companyID := c.Query("company_id")

	query := "SELECT u.id, u.company_id, u.name, u.code, u.description, u.is_active, u.created_at, c.name as company_name FROM units u JOIN companies c ON u.company_id = c.id WHERE u.is_active = 1"
	var params []interface{}

	if companyID != "" {
		query += " AND u.company_id = ?"
		params = append(params, companyID)
	}
	query += " ORDER BY c.name, u.name"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	units := []models.Unit{}
	for rows.Next() {
		var u models.Unit
		var desc sql.NullString
		err := rows.Scan(&u.ID, &u.CompanyID, &u.Name, &u.Code, &desc, &u.IsActive, &u.CreatedAt, &u.CompanyName)
		if err == nil {
			if desc.Valid {
				u.Description = &desc.String
			}
			units = append(units, u)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": units})
}

// POST /api/organizations/units
func CreateUnit(c *gin.Context) {
	var input struct {
		CompanyID   int     `json:"company_id" binding:"required"`
		Name        string  `json:"name" binding:"required"`
		Code        string  `json:"code" binding:"required"`
		Description *string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	res, err := config.DB.Exec(
		"INSERT INTO units (company_id, name, code, description) VALUES (?, ?, ?, ?)",
		input.CompanyID, input.Name, input.Code, input.Description,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID}})
}

// PUT /api/organizations/units/:id
func UpdateUnit(c *gin.Context) {
	unitID := c.Param("id")

	var input struct {
		CompanyID   int     `json:"company_id" binding:"required"`
		Name        string  `json:"name" binding:"required"`
		Code        string  `json:"code" binding:"required"`
		Description *string `json:"description"`
		IsActive    *int    `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	isActive := 1
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	_, err := config.DB.Exec(
		"UPDATE units SET company_id=?, name=?, code=?, description=?, is_active=? WHERE id=?",
		input.CompanyID, input.Name, input.Code, input.Description, isActive, unitID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Unit updated"})
}

// DELETE /api/organizations/units/:id
func DeleteUnit(c *gin.Context) {
	unitID := c.Param("id")
	_, err := config.DB.Exec("UPDATE units SET is_active = 0 WHERE id = ?", unitID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Unit deactivated"})
}


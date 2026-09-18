package handlers

import (
	"net/http"
	"time"

	"fleet-management-api/config"
	"fleet-management-api/models"

	"github.com/gin-gonic/gin"
)

// GET /api/fuels
func GetFuels(c *gin.Context) {
	rows, err := config.DB.Query("SELECT id, name, type, price, active_from, created_at FROM fuels ORDER BY name, active_from DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	fuels := []models.Fuel{}
	for rows.Next() {
		var f models.Fuel
		var activeFrom time.Time
		err := rows.Scan(&f.ID, &f.Name, &f.Type, &f.Price, &activeFrom, &f.CreatedAt)
		if err == nil {
			f.ActiveFrom = activeFrom.Format("2006-01-02")
			fuels = append(fuels, f)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": fuels})
}

// GET /api/fuels/active
func GetActiveFuels(c *gin.Context) {
	query := `
		SELECT f1.id, f1.name, f1.type, f1.price, f1.active_from, f1.created_at 
		FROM fuels f1
		JOIN (
			SELECT name, MAX(active_from) as max_date 
			FROM fuels 
			WHERE active_from <= CURDATE() 
			GROUP BY name
		) f2 ON f1.name = f2.name AND f1.active_from = f2.max_date
		ORDER BY f1.name`

	rows, err := config.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	fuels := []models.Fuel{}
	for rows.Next() {
		var f models.Fuel
		var activeFrom time.Time
		err := rows.Scan(&f.ID, &f.Name, &f.Type, &f.Price, &activeFrom, &f.CreatedAt)
		if err == nil {
			f.ActiveFrom = activeFrom.Format("2006-01-02")
			fuels = append(fuels, f)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": fuels})
}

// POST /api/fuels
func CreateFuel(c *gin.Context) {
	var input struct {
		Name       string  `json:"name" binding:"required"`
		Type       string  `json:"type" binding:"required"`
		Price      float64 `json:"price" binding:"required"`
		ActiveFrom string  `json:"active_from" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Semua field wajib diisi: " + err.Error()})
		return
	}

	activeDate, err := time.Parse("2006-01-02", input.ActiveFrom)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format tanggal active_from tidak valid (harus YYYY-MM-DD)"})
		return
	}

	res, err := config.DB.Exec(
		"INSERT INTO fuels (name, type, price, active_from) VALUES (?, ?, ?, ?)",
		input.Name, input.Type, input.Price, activeDate,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID}, "message": "Bahan Bakar berhasil ditambahkan"})
}

// PUT /api/fuels/:id
func UpdateFuel(c *gin.Context) {
	fuelID := c.Param("id")

	var input struct {
		Name       string  `json:"name" binding:"required"`
		Type       string  `json:"type" binding:"required"`
		Price      float64 `json:"price" binding:"required"`
		ActiveFrom string  `json:"active_from" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Semua field wajib diisi: " + err.Error()})
		return
	}

	activeDate, err := time.Parse("2006-01-02", input.ActiveFrom)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format tanggal active_from tidak valid (harus YYYY-MM-DD)"})
		return
	}

	_, err = config.DB.Exec(
		"UPDATE fuels SET name = ?, type = ?, price = ?, active_from = ? WHERE id = ?",
		input.Name, input.Type, input.Price, activeDate, fuelID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Bahan Bakar berhasil diupdate"})
}

// DELETE /api/fuels/:id
func DeleteFuel(c *gin.Context) {
	fuelID := c.Param("id")

	_, err := config.DB.Exec("DELETE FROM fuels WHERE id = ?", fuelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Bahan Bakar berhasil dihapus"})
}

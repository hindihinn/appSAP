package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"fleet-management-api/config"
	"fleet-management-api/middleware"

	"github.com/gin-gonic/gin"
)

// GET /api/vehicle-km
func GetVehicleKmLogs(c *gin.Context) {
	vehicleID := c.Query("vehicle_id")

	query := `SELECT vk.id, vk.vehicle_id, vk.km_reading, vk.previous_km, vk.recorded_date, vk.recorded_by,
	                 vk.photo, vk.source, vk.trip_id, vk.notes, vk.recorded_at,
	                 v.nopol, v.merk, u.name as recorded_by_name 
	          FROM vehicle_km_logs vk 
	          JOIN vehicles v ON vk.vehicle_id = v.id 
	          LEFT JOIN users u ON vk.recorded_by = u.id 
	          WHERE 1=1`

	var params []interface{}
	if vehicleID != "" {
		query += " AND vk.vehicle_id = ?"
		params = append(params, vehicleID)
	}
	query += " ORDER BY vk.recorded_date DESC, vk.id DESC LIMIT 100"

	rows, err := config.DB.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	type KmLogResponse struct {
		ID             int        `json:"id"`
		VehicleID      int        `json:"vehicle_id"`
		KmReading      int        `json:"km_reading"`
		PreviousKm     int        `json:"previous_km"`
		RecordedDate   time.Time  `json:"recorded_date"`
		RecordedBy     *int       `json:"recorded_by"`
		Photo          *string    `json:"photo"`
		Source         string     `json:"source"`
		TripID         *int       `json:"trip_id"`
		Notes          *string    `json:"notes"`
		RecordedAt     time.Time  `json:"recorded_at"`
		Nopol          string     `json:"nopol"`
		Merk           string     `json:"merk"`
		RecordedByName *string    `json:"recorded_by_name"`
	}

	logs := []KmLogResponse{}
	for rows.Next() {
		var l KmLogResponse
		var recordedBy, tripID sql.NullInt64
		var photo, notes, recordedByName sql.NullString
		err := rows.Scan(&l.ID, &l.VehicleID, &l.KmReading, &l.PreviousKm, &l.RecordedDate, &recordedBy,
			&photo, &l.Source, &tripID, &notes, &l.RecordedAt, &l.Nopol, &l.Merk, &recordedByName)
		if err == nil {
			if recordedBy.Valid {
				val := int(recordedBy.Int64)
				l.RecordedBy = &val
			}
			if tripID.Valid {
				val := int(tripID.Int64)
				l.TripID = &val
			}
			if photo.Valid {
				l.Photo = &photo.String
			}
			if notes.Valid {
				l.Notes = &notes.String
			}
			if recordedByName.Valid {
				l.RecordedByName = &recordedByName.String
			}
			logs = append(logs, l)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": logs})
}

// GET /api/vehicle-km/monitoring
func GetVehicleKmMonitoring(c *gin.Context) {
	query := `SELECT v.id, v.nopol, v.merk, v.model, v.current_km,
	                 (SELECT km_reading FROM vehicle_km_logs WHERE vehicle_id = v.id ORDER BY recorded_date DESC LIMIT 1) as last_km,
	                 (SELECT recorded_date FROM vehicle_km_logs WHERE vehicle_id = v.id ORDER BY recorded_date DESC LIMIT 1) as last_recorded
	          FROM vehicles v 
	          WHERE v.is_active = 1 
	          ORDER BY v.nopol`

	rows, err := config.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
		return
	}
	defer rows.Close()

	type KmMonitoring struct {
		ID           int        `json:"id"`
		Nopol        string     `json:"nopol"`
		Merk         string     `json:"merk"`
		Model        *string    `json:"model"`
		CurrentKm    int        `json:"current_km"`
		LastKm       *int       `json:"last_km"`
		LastRecorded *time.Time `json:"last_recorded"`
	}

	results := []KmMonitoring{}
	for rows.Next() {
		var m KmMonitoring
		var model sql.NullString
		var lastKm sql.NullInt64
		var lastRecorded sql.NullTime

		err := rows.Scan(&m.ID, &m.Nopol, &m.Merk, &model, &m.CurrentKm, &lastKm, &lastRecorded)
		if err == nil {
			if model.Valid {
				m.Model = &model.String
			}
			if lastKm.Valid {
				val := int(lastKm.Int64)
				m.LastKm = &val
			}
			if lastRecorded.Valid {
				m.LastRecorded = &lastRecorded.Time
			}
			results = append(results, m)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": results})
}

// POST /api/vehicle-km
func CreateVehicleKmLog(c *gin.Context) {
	vehicleIDStr := c.PostForm("vehicle_id")
	kmReadingStr := c.PostForm("km_reading")
	recordedDateStr := c.PostForm("recorded_date")
	source := c.PostForm("source")
	tripIDStr := c.PostForm("trip_id")
	notes := c.PostForm("notes")

	userVal, _ := c.Get("user")
	user := userVal.(middleware.UserContext)

	vehicleID, err := strconv.Atoi(vehicleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid vehicle_id"})
		return
	}

	kmReading, err := strconv.Atoi(kmReadingStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid km_reading"})
		return
	}

	var recordedDate time.Time
	if recordedDateStr != "" {
		recordedDate, err = time.Parse("2006-01-02", recordedDateStr)
		if err != nil {
			recordedDate = time.Now()
		}
	} else {
		recordedDate = time.Now()
	}

	if source == "" {
		source = "manual"
	}

	var tripID *int
	if tripIDStr != "" {
		if id, err := strconv.Atoi(tripIDStr); err == nil {
			tripID = &id
		}
	}

	var photo *string
	if file, err := c.FormFile("photo"); err == nil {
		if path, err := middleware.SaveUploadedFile(c, file, "km"); err == nil {
			photo = &path
		}
	}

	// Get current vehicle KM
	var currentKm int
	_ = config.DB.QueryRow("SELECT current_km FROM vehicles WHERE id = ?", vehicleID).Scan(&currentKm)

	res, err := config.DB.Exec(
		`INSERT INTO vehicle_km_logs (vehicle_id, km_reading, previous_km, recorded_date, recorded_by, photo, source, trip_id, notes) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		vehicleID, kmReading, currentKm, recordedDate, user.ID, photo, source, tripID, notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error: " + err.Error()})
		return
	}

	// Update current vehicle mileage if the reading is higher
	_, _ = config.DB.Exec("UPDATE vehicles SET current_km = ? WHERE id = ? AND ? > current_km", kmReading, vehicleID, kmReading)

	insertID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": insertID}})
}

// POST /api/vehicle-km/backfill-trips
func BackfillTripsKm(c *gin.Context) {
	rows, err := config.DB.Query(`
		SELECT tc.id, tc.trip_id, tc.type, tc.km_reading, tc.photo_km, tc.recorded_at,
		       t.vehicle_id, t.driver_id,
		       COALESCE(d.user_id, t.driver_id) as recorder_id
		FROM trip_checkpoints tc
		JOIN trip_orders t ON tc.trip_id = t.id
		LEFT JOIN drivers d ON t.driver_id = d.id
		WHERE tc.km_reading IS NOT NULL AND tc.km_reading > 0 AND t.vehicle_id IS NOT NULL
		ORDER BY t.vehicle_id, tc.recorded_at ASC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error", "detail": err.Error()})
		return
	}
	defer rows.Close()

	labels := map[string]string{
		"departure":        "Mulai Keberangkatan (Dinas)",
		"arrival":          "Sampai di Tujuan (Dinas)",
		"unloading":        "Mulai Bongkar (Dinas)",
		"extend_unloading": "Bongkar Tambahan (Dinas)",
		"return_departure": "Mulai Kepulangan (Dinas)",
		"return_arrival":   "Sampai di Kantor (Dinas)",
		"incident":         "Insiden / Kendala (Dinas)",
	}

	inserted := 0
	skipped := 0

	for rows.Next() {
		var cpID, tripID, vehicleID, driverID int
		var kmReading int
		var cpType string
		var photo sql.NullString
		var recordedAt time.Time
		var recorderID sql.NullInt64

		err := rows.Scan(&cpID, &tripID, &cpType, &kmReading, &photo, &recordedAt, &vehicleID, &driverID, &recorderID)
		if err != nil {
			continue
		}

		// Check if already logged
		var existingID int
		err = config.DB.QueryRow(
			"SELECT id FROM vehicle_km_logs WHERE trip_id = ? AND km_reading = ? AND vehicle_id = ? AND source = 'trip' LIMIT 1",
			tripID, kmReading, vehicleID,
		).Scan(&existingID)

		if err != sql.ErrNoRows {
			skipped++
			continue
		}

		// Get previous KM
		var prevKm int
		_ = config.DB.QueryRow(
			"SELECT km_reading FROM vehicle_km_logs WHERE vehicle_id = ? AND recorded_date < ? ORDER BY recorded_date DESC, id DESC LIMIT 1",
			vehicleID, recordedAt,
		).Scan(&prevKm)

		stepLabel, ok := labels[cpType]
		if !ok {
			stepLabel = "Checkpoint " + cpType + " (Dinas)"
		}

		var recID *int
		if recorderID.Valid {
			val := int(recorderID.Int64)
			recID = &val
		}

		var photoPath *string
		if photo.Valid {
			photoPath = &photo.String
		}

		_, err = config.DB.Exec(
			`INSERT INTO vehicle_km_logs (vehicle_id, km_reading, previous_km, recorded_date, recorded_by, photo, source, trip_id, notes)
			 VALUES (?, ?, ?, ?, ?, ?, 'trip', ?, ?)`,
			vehicleID, kmReading, prevKm, recordedAt, recID, photoPath, tripID, stepLabel,
		)
		if err == nil {
			inserted++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "Backfill selesai. " + strconv.Itoa(inserted) + " entri ditambahkan, " + strconv.Itoa(skipped) + " sudah ada.",
		"inserted": inserted,
		"skipped":  skipped,
	})
}

// POST /api/vehicle-km/backfill-services
func BackfillServicesKm(c *gin.Context) {
	// Check table existence for service_order_checkpoints
	rows, err := config.DB.Query(`
		SELECT soc.id, soc.work_order_id, soc.type, soc.km_reading, soc.photo_km, soc.created_at,
		       wo.vehicle_id, wo.assigned_to as recorder_id
		FROM service_order_checkpoints soc
		JOIN work_orders wo ON soc.work_order_id = wo.id
		WHERE soc.km_reading IS NOT NULL AND soc.km_reading > 0 AND wo.vehicle_id IS NOT NULL
		ORDER BY wo.vehicle_id, soc.created_at ASC
	`)
	// If the table service_order_checkpoints doesn't exist, we can gracefully skip it
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Backfill service selesai. 0 entri ditambahkan (tabel tidak ditemukan).", "inserted": 0, "skipped": 0})
		return
	}
	defer rows.Close()

	labels := map[string]string{
		"start_to_workshop":  "Mulai Menuju Bengkel (WO)",
		"arrive_at_workshop": "Sampai di Bengkel (WO)",
		"return_to_office":   "Sampai di Kantor (WO)",
	}

	inserted := 0
	skipped := 0

	for rows.Next() {
		var id, woID, kmReading, vehicleID int
		var cpType string
		var photo sql.NullString
		var createdAt time.Time
		var recorderID sql.NullInt64

		err := rows.Scan(&id, &woID, &cpType, &kmReading, &photo, &createdAt, &vehicleID, &recorderID)
		if err != nil {
			continue
		}

		var existingID int
		err = config.DB.QueryRow(
			"SELECT id FROM vehicle_km_logs WHERE notes LIKE ? AND km_reading = ? AND vehicle_id = ? AND source = 'service' LIMIT 1",
			"% (WO)%", kmReading, vehicleID,
		).Scan(&existingID)

		if err != sql.ErrNoRows {
			skipped++
			continue
		}

		var prevKm int
		_ = config.DB.QueryRow(
			"SELECT km_reading FROM vehicle_km_logs WHERE vehicle_id = ? AND recorded_date < ? ORDER BY recorded_date DESC, id DESC LIMIT 1",
			vehicleID, createdAt,
		).Scan(&prevKm)

		stepLabel, ok := labels[cpType]
		if !ok {
			stepLabel = "Checkpoint " + cpType + " (WO)"
		}

		var recID *int
		if recorderID.Valid {
			val := int(recorderID.Int64)
			recID = &val
		}

		var photoPath *string
		if photo.Valid {
			photoPath = &photo.String
		}

		_, err = config.DB.Exec(
			`INSERT INTO vehicle_km_logs (vehicle_id, km_reading, previous_km, recorded_date, recorded_by, photo, source, notes)
			 VALUES (?, ?, ?, ?, ?, ?, 'service', ?)`,
			vehicleID, kmReading, prevKm, createdAt, recID, photoPath, stepLabel,
		)
		if err == nil {
			inserted++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "Backfill service selesai. " + strconv.Itoa(inserted) + " entri ditambahkan, " + strconv.Itoa(skipped) + " sudah ada.",
		"inserted": inserted,
		"skipped":  skipped,
	})
}

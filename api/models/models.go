package models

import "time"

type Company struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Code      string    `json:"code"`
	Address   *string   `json:"address,omitempty"`
	Phone     *string   `json:"phone,omitempty"`
	Email     *string   `json:"email,omitempty"`
	Logo      *string   `json:"logo,omitempty"`
	IsActive  int       `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type Unit struct {
	ID          int       `json:"id"`
	CompanyID   int       `json:"company_id"`
	Name        string    `json:"name"`
	Code        string    `json:"code"`
	Description *string   `json:"description,omitempty"`
	IsActive    int       `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	CompanyName string    `json:"company_name,omitempty"`
}



type Role struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	DisplayName string    `json:"display_name"`
	Description *string   `json:"description,omitempty"`
	Platform    *string   `json:"platform,omitempty"`
	IsSystem    int       `json:"is_system"`
	CreatedAt   time.Time `json:"created_at"`
}

type Permission struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	DisplayName string    `json:"display_name"`
	Module      string    `json:"module"`
	Description *string   `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type User struct {
	ID              int        `json:"id"`
	Name            string     `json:"name"`
	Username        string     `json:"username"`
	Password        string     `json:"password,omitempty"`
	Phone           *string    `json:"phone,omitempty"`
	Avatar          *string    `json:"avatar,omitempty"`
	RoleID          int        `json:"role_id"`
	CompanyID       *int       `json:"company_id,omitempty"`
	UnitID          *int       `json:"unit_id,omitempty"`
	IsActive        int        `json:"is_active"`
	FcmToken        *string    `json:"fcm_token,omitempty"`
	LastLogin       *time.Time `json:"last_login,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	RoleName        string     `json:"role_name,omitempty"`
	RoleDisplayName string     `json:"role_display_name,omitempty"`
	CompanyName     *string    `json:"company_name,omitempty"`
	UnitName        *string    `json:"unit_name,omitempty"`
	Permissions     []string   `json:"permissions,omitempty"`
}

type Vehicle struct {
	ID              int      `json:"id"`
	VehicleCode     *string  `json:"vehicle_code,omitempty"`
	UnitID          *int     `json:"unit_id,omitempty"`
	Nopol           string   `json:"nopol"`
	Merk            string   `json:"merk"`
	Model           *string  `json:"model,omitempty"`
	Type            string   `json:"type"`
	Year            *int     `json:"year,omitempty"`
	Color           *string  `json:"color,omitempty"`
	ChassisNumber   *string  `json:"chassis_number,omitempty"`
	EngineNumber    *string  `json:"engine_number,omitempty"`
	CapacityTon     *float64 `json:"capacity_ton,omitempty"`
	FuelType        string   `json:"fuel_type"`
	PhotoFront      *string  `json:"photo_front,omitempty"`
	PhotoBack       *string  `json:"photo_back,omitempty"`
	PhotoLeft       *string  `json:"photo_left,omitempty"`
	PhotoRight      *string  `json:"photo_right,omitempty"`
	CurrentKm       int      `json:"current_km"`
	Status          string   `json:"status"`
	Ownership       string   `json:"ownership"`
	Notes           *string  `json:"notes,omitempty"`
	IsActive        int      `json:"is_active"`
	UnitName        *string  `json:"unit_name,omitempty"`
	CompanyName     *string  `json:"company_name,omitempty"`
	CompanyID       *int     `json:"company_id,omitempty"`
	HasTransactions bool     `json:"has_transactions"`
}

type VehicleLegality struct {
	ID             int       `json:"id"`
	VehicleID      int       `json:"vehicle_id"`
	Type           string    `json:"type"`
	DocumentNumber *string   `json:"document_number,omitempty"`
	IssuedDate     *string   `json:"issued_date,omitempty"` // stored as YYYY-MM-DD
	ExpiryDate     string    `json:"expiry_date"`
	DocumentFile   *string   `json:"document_file,omitempty"`
	ReminderDays   int       `json:"reminder_days"`
	Nopol          *string   `json:"nopol,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type VehicleKmLog struct {
	ID          int       `json:"id"`
	VehicleID   int       `json:"vehicle_id"`
	LogDate     string    `json:"log_date"`
	KmValue     int       `json:"km_value"`
	Source      string    `json:"source"`
	ReferenceID *int      `json:"reference_id,omitempty"`
	Notes       *string   `json:"notes,omitempty"`
	RecordedBy  int       `json:"recorded_by"`
	RecordedAt  time.Time `json:"recorded_at"`
	Nopol       *string   `json:"nopol,omitempty"`
}

type Driver struct {
	ID         int       `json:"id"`
	UserID     int       `json:"user_id"`
	EmployeeID string    `json:"employee_id"`
	SimNumber  string    `json:"sim_number"`
	SimType    string    `json:"sim_type"`
	SimExpiry  string    `json:"sim_expiry"`
	IsActive   int       `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
	Name       string    `json:"name,omitempty"`
	Email      string    `json:"email,omitempty"`
	Phone      string    `json:"phone,omitempty"`
	Status     string    `json:"status,omitempty"`
	Notes      *string   `json:"notes,omitempty"`
}

type DriverLegality struct {
	ID             int       `json:"id"`
	DriverID       int       `json:"driver_id"`
	Type           string    `json:"type"`
	DocumentNumber *string   `json:"document_number,omitempty"`
	IssuedDate     *string   `json:"issued_date,omitempty"`
	ExpiryDate     string    `json:"expiry_date"`
	DocumentFile   *string   `json:"document_file,omitempty"`
	ReminderDays   int       `json:"reminder_days"`
	DriverName     *string   `json:"driver_name,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type DriverAssignment struct {
	ID           int       `json:"id"`
	DriverID     int       `json:"driver_id"`
	VehicleID    int       `json:"vehicle_id"`
	AssignedDate string    `json:"assigned_date"`
	EndDate      *string   `json:"end_date,omitempty"`
	Status       string    `json:"status"`
	Notes        *string   `json:"notes,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	DriverName   *string   `json:"driver_name,omitempty"`
	Nopol        *string   `json:"nopol,omitempty"`
	Merk         *string   `json:"merk,omitempty"`
}

type TripOrder struct {
	ID                 int        `json:"id"`
	OrderNumber        string     `json:"order_number"`
	SpdNumber          *string    `json:"spd_number,omitempty"`
	RequesterID        int        `json:"requester_id"`
	CompanyID          *int       `json:"company_id,omitempty"`
	UnitID             *int       `json:"unit_id,omitempty"`
	ExtendCompanyID    *int       `json:"extend_company_id,omitempty"`
	ExtendUnitID       *int       `json:"extend_unit_id,omitempty"`
	VehicleID          *int       `json:"vehicle_id,omitempty"`
	DriverID           *int       `json:"driver_id,omitempty"`
	AdminID            *int       `json:"admin_id,omitempty"`
	HrgaID             *int       `json:"hrga_id,omitempty"`
	Destination        string     `json:"destination"`
	DestinationAddress *string    `json:"destination_address,omitempty"`
	Purpose            *string    `json:"purpose,omitempty"`
	ItemsDescription   *string    `json:"items_description,omitempty"`
	PlannedDeparture   string     `json:"planned_departure"`
	PlannedReturn      *string    `json:"planned_return,omitempty"`
	ActualDeparture    *string    `json:"actual_departure,omitempty"`
	ActualReturn       *string    `json:"actual_return,omitempty"`
	DepartureKm        *int       `json:"departure_km,omitempty"`
	ArrivalKm          *int       `json:"arrival_km,omitempty"`
	ReturnKm           *int       `json:"return_km,omitempty"`
	TotalKm            *int       `json:"total_distance,omitempty"`
	Status             string     `json:"status"`
	AdminNotes         *string    `json:"admin_notes,omitempty"`
	HrgaNotes          *string    `json:"hrga_notes,omitempty"`
	RejectionReason    *string    `json:"rejection_reason,omitempty"`
	AdminReviewedAt    *time.Time `json:"admin_reviewed_at,omitempty"`
	HrgaApprovedAt     *time.Time `json:"hrga_approved_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`

	// Joins/Extra Info
	Nopol           *string `json:"nopol,omitempty"`
	Merk            *string `json:"merk,omitempty"`
	DriverName      *string `json:"driver_name,omitempty"`
	DriverPhone     *string `json:"driver_phone,omitempty"`
	RequesterName   *string `json:"requester_name,omitempty"`
	AdminName       *string `json:"admin_name,omitempty"`
	HrgaName        *string `json:"hrga_name,omitempty"`
	CompanyName     *string `json:"company_name,omitempty"`
	CompanyCode     *string `json:"company_code,omitempty"`
	UnitName        *string `json:"unit_name,omitempty"`
	UnitCode        *string `json:"unit_code,omitempty"`
	AssignmentCount int     `json:"assignment_count"`
}

type TripAssignment struct {
	ID          int       `json:"id"`
	TripID      int       `json:"trip_id"`
	VehicleID   int       `json:"vehicle_id"`
	DriverID    int       `json:"driver_id"`
	UnitID      *int      `json:"unit_id,omitempty"`
	SequenceNo  int       `json:"sequence_no"`
	AssignedAt  time.Time `json:"assigned_at"`
	Notes       *string   `json:"notes,omitempty"`
	DriverName  *string   `json:"driver_name,omitempty"`
	Nopol       *string   `json:"nopol,omitempty"`
	Merk        *string   `json:"merk,omitempty"`
	UnitName    *string   `json:"unit_name,omitempty"`
	CompanyName *string   `json:"company_name,omitempty"`
}

type TripCheckpoint struct {
	ID               int       `json:"id"`
	TripID           int       `json:"trip_id"`
	Type             string    `json:"type"` // departure, fuel_stop, rest_stop, arrival, unloading, return_departure, return_arrival
	Address          string    `json:"address"`
	ScheduledTime    *string   `json:"scheduled_time,omitempty"`
	ActualTime       *string   `json:"actual_time,omitempty"`
	KmReading        *int      `json:"km_reading,omitempty"`
	Notes            *string   `json:"notes,omitempty"`
	Lat              *float64  `json:"latitude,omitempty"`
	Lng              *float64  `json:"longitude,omitempty"`
	LocationAccuracy *float64  `json:"location_accuracy,omitempty"`
	Photo            *string   `json:"photo,omitempty"`
	PhotoKm          *string   `json:"photo_km,omitempty"`
	PhotoNota        *string   `json:"photo_nota,omitempty"`
	PhotoPump        *string   `json:"photo_pump,omitempty"`
	PhotoActivity    *string   `json:"photo_activity,omitempty"`
	FuelLiters       *float64  `json:"fuel_liters,omitempty"`
	FuelCost         *float64  `json:"fuel_cost,omitempty"`
	SequenceNumber   int       `json:"sequence_number"`
	RecordedAt       time.Time `json:"recorded_at"`
}

type TripEvent struct {
	ID          int       `json:"id"`
	TripID      int       `json:"trip_id"`
	EventType   string    `json:"event_type"` // kerusakan_kendaraan, ban_bocor, kecelakaan, macet_parah, jalan_rusak, cuaca_buruk, kendala_bongkar, lainnya
	Description text      `json:"description"`
	Notes       *string   `json:"notes,omitempty"`
	Lat         *float64  `json:"lat,omitempty"`
	Lng         *float64  `json:"lng,omitempty"`
	Photo       *string   `json:"photo,omitempty"`
	RecordedAt  time.Time `json:"recorded_at"`
}

// Custom type alias since 'text' is not a Go primitive
type text = string

type Fuel struct {
	ID         int       `json:"id"`
	Name       string    `json:"name"` // solar, pertalite, pertamax, dex
	Type       string    `json:"type"`
	Price      float64   `json:"price"`
	ActiveFrom string    `json:"active_from"` // YYYY-MM-DD
	CreatedAt  time.Time `json:"created_at"`
}

type Reimbursement struct {
	ID           int       `json:"id"`
	TripID       int       `json:"trip_id"`
	DriverID     int       `json:"driver_id"`
	TotalAmount  float64   `json:"total_amount"`
	Status       string    `json:"status"` // draft, submitted, reviewed, approved, paid, rejected
	Notes        *string   `json:"notes,omitempty"`
	SubmittedAt  *string   `json:"submitted_at,omitempty"`
	ReviewedBy   *int      `json:"reviewed_by,omitempty"`
	ReviewedAt   *string   `json:"reviewed_at,omitempty"`
	ApprovedBy   *int      `json:"approved_by,omitempty"`
	ApprovedAt   *string   `json:"approved_at,omitempty"`
	PaidAt       *string   `json:"paid_at,omitempty"`
	PayeeBank    *string   `json:"payee_bank,omitempty"`
	PayeeAccount *string   `json:"payee_account,omitempty"`
	PayeeName    *string   `json:"payee_name,omitempty"`
	ReceiptFile  *string   `json:"receipt_file,omitempty"`
	CreatedAt    time.Time `json:"created_at"`

	// Joins
	TripOrderNumber *string `json:"trip_order_number,omitempty"`
	DriverName      *string `json:"driver_name,omitempty"`
	ReviewerName    *string `json:"reviewer_name,omitempty"`
	ApproverName    *string `json:"approver_name,omitempty"`
}

type ReimbursementItem struct {
	ID              int     `json:"id"`
	ReimbursementID int     `json:"reimbursement_id"`
	Type            string  `json:"type"` // bbm, tol, parkir, makan, penginapan, perbaikan, lainnya
	Amount          float64 `json:"amount"`
	Description     *string `json:"description,omitempty"`
	ReceiptFile     *string `json:"receipt_file,omitempty"`
}

type ServiceTicket struct {
	ID               int        `json:"id"`
	TicketNumber     string     `json:"ticket_number"`
	VehicleID        int        `json:"vehicle_id"`
	DriverID         int        `json:"driver_id"`
	DamageType       string     `json:"damage_type"`
	Description      string     `json:"description"`
	Notes            *string    `json:"notes,omitempty"`
	ReportedAt       time.Time  `json:"reported_at"`
	Status           string     `json:"status"` // pending, approved, rejected, resolved
	ApprovedBy       *int       `json:"approved_by,omitempty"`
	ApprovedAt       *time.Time `json:"approved_at,omitempty"`
	RejectionReason  *string    `json:"rejection_reason,omitempty"`
	WorkOrderID      *int       `json:"work_order_id,omitempty"`
	Nopol            *string    `json:"nopol,omitempty"`
	Merk             *string    `json:"merk,omitempty"`
	Model            *string    `json:"model,omitempty"`
	CurrentKm        *int       `json:"current_km,omitempty"`
	DriverName       *string    `json:"driver_name,omitempty"`
	ApproverName     *string    `json:"approver_name,omitempty"`
	WorkOrderNumber  *string    `json:"work_order_number,omitempty"`
	CompanyName      *string    `json:"company_name,omitempty"`
	UnitName         *string    `json:"unit_name,omitempty"`
	LastServiceKm    *int       `json:"last_service_km,omitempty"`
	NextServiceKm    *int       `json:"next_service_km,omitempty"`
	LastServiceDate  *string    `json:"last_service_date,omitempty"`
	NextServiceDate  *string    `json:"next_service_date,omitempty"`
}

type ServiceTicketPhoto struct {
	ID        int    `json:"id"`
	TicketID  int    `json:"ticket_id"`
	PhotoPath string `json:"photo_path"`
}

type WorkOrder struct {
	ID             int        `json:"id"`
	WoNumber       string     `json:"wo_number"`
	VehicleID      int        `json:"vehicle_id"`
	KmAtService    int        `json:"km_at_service,omitempty"`
	Type           string     `json:"type"` // routine, repair, upgrade
	Description    string     `json:"description"`
	EstimatedCost  float64    `json:"estimated_cost"`
	ActualCost     float64    `json:"actual_cost"`
	Status         string     `json:"status"` // draft, pending, approved, in_progress, completed, cancelled
	CreatedBy      int        `json:"created_by"`
	ApprovedBy     *int       `json:"approved_by,omitempty"`
	ApprovedAt     *time.Time `json:"approved_at,omitempty"`
	StartDate      *string    `json:"start_date,omitempty"`
	EndDate        *string    `json:"end_date,omitempty"`
	Notes          *string    `json:"notes,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	Nopol          *string    `json:"nopol,omitempty"`
	Merk           *string    `json:"merk,omitempty"`
	Model          *string    `json:"model,omitempty"`
	CreatorName    *string    `json:"creator_name,omitempty"`
	ApproverName   *string    `json:"approver_name,omitempty"`
	ServiceItems   []string   `json:"service_items,omitempty"` // service items can be fetched as list
}

type WorkOrderPhoto struct {
	ID        int    `json:"id"`
	WoID      int    `json:"wo_id"`
	PhotoPath string `json:"photo_path"`
}

type WorkOrderItem struct {
	ID          int     `json:"id"`
	WoID        int     `json:"wo_id"`
	ItemName    string  `json:"item_name"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	TotalPrice  float64 `json:"total_price"`
	Description *string `json:"description,omitempty"`
}

type RoutineService struct {
	ID              int     `json:"id"`
	VehicleID       int     `json:"vehicle_id"`
	ServiceName     string  `json:"service_name"`
	IntervalKm      int     `json:"interval_km"`
	IntervalDays    int     `json:"interval_days"`
	LastServiceDate *string `json:"last_service_date,omitempty"`
	LastServiceKm   *int    `json:"last_service_km,omitempty"`
	NextServiceDate *string `json:"next_service_date,omitempty"`
	NextServiceKm   *int    `json:"next_service_km,omitempty"`
	Status          string  `json:"status"` // on_schedule, due_soon, overdue
	Notes           *string `json:"notes,omitempty"`
	CreatedAt       time.Time
	Nopol           *string `json:"nopol,omitempty"`
}

type Notification struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	Title         string    `json:"title"`
	Message       string    `json:"message"`
	Type          string    `json:"type"`           // info, warning, success, danger
	Module        string    `json:"module"`         // e.g., trips, services, hr, vehicles
	ReferenceID   int       `json:"reference_id"`   // e.g., trip_id, wo_id, legality_id
	ReferenceType string    `json:"reference_type"` // e.g., "trip", "work_order", "driver_legality", "vehicle_legality"
	IsRead        int       `json:"is_read"`        // 0 or 1
	IsPushed      int       `json:"is_pushed"`
	CreatedAt     time.Time `json:"created_at"`
}

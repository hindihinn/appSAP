package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"fleet-management-api/config"
	"fleet-management-api/handlers"
	"fleet-management-api/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  Warning: No .env file found or failed to load")
	}

	// Initialize Database
	config.InitDB()
	defer config.DB.Close()

	// Set Gin mode
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Global Logger & Recovery middleware
	r.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("[%s] %s %s %d %s %s\n",
			param.TimeStamp.Format(time.RFC3339),
			param.Method,
			param.Path,
			param.StatusCode,
			param.Latency,
			param.ErrorMessage,
		)
	}))
	r.Use(gin.Recovery())

	// CORS Setup
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Serve Static Files
	uploadDir := "./uploads"
	if envUploadDir := os.Getenv("UPLOAD_DIR"); envUploadDir != "" {
		uploadDir = envUploadDir
	}
	r.Static("/uploads", uploadDir)

	// API Routes Group
	api := r.Group("/api")
	{
		// 1. Auth routes
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/login", handlers.Login)
			authGroup.POST("/register", middleware.Auth(), handlers.Register)
			authGroup.GET("/me", middleware.Auth(), handlers.GetMe)
			authGroup.PUT("/fcm-token", middleware.Auth(), handlers.UpdateFcmToken)
		}

		// 2. Organization routes
		org := api.Group("/organizations", middleware.Auth())
		{
			org.GET("/companies", handlers.GetCompanies)
			org.POST("/companies", middleware.CheckPermission("org.manage"), handlers.CreateCompany)
			org.PUT("/companies/:id", middleware.CheckPermission("org.manage"), handlers.UpdateCompany)
			org.DELETE("/companies/:id", middleware.CheckPermission("org.manage"), handlers.DeleteCompany)

			org.GET("/units", handlers.GetUnits)
			org.POST("/units", middleware.CheckPermission("org.manage"), handlers.CreateUnit)
			org.PUT("/units/:id", middleware.CheckPermission("org.manage"), handlers.UpdateUnit)
			org.DELETE("/units/:id", middleware.CheckPermission("org.manage"), handlers.DeleteUnit)

		}

		// 3. Roles routes
		roles := api.Group("/roles", middleware.Auth())
		{
			roles.GET("", handlers.GetRoles)
			roles.GET("/permissions", handlers.GetPermissions)
			roles.GET("/:id/permissions", handlers.GetRolePermissions)
			roles.POST("", middleware.CheckPermission("roles.manage"), handlers.CreateRole)
			roles.PUT("/:id", middleware.CheckPermission("roles.manage"), handlers.UpdateRole)
			roles.PUT("/:id/permissions", middleware.CheckPermission("roles.manage"), handlers.UpdateRolePermissions)
			roles.DELETE("/:id", middleware.CheckPermission("roles.manage"), handlers.DeleteRole)
		}

		// 4. Vehicles routes
		veh := api.Group("/vehicles", middleware.Auth())
		{
			veh.GET("", handlers.GetVehicles)
			veh.GET("/stats/summary", handlers.GetVehiclesSummary)
			veh.GET("/stats/by-date", handlers.GetVehiclesStatsByDate)
			veh.GET("/:id/assigned-driver", handlers.GetVehicleAssignedDriver)
			veh.GET("/:id", handlers.GetVehicleByID)
			veh.POST("", middleware.CheckPermission("vehicles.create"), handlers.CreateVehicle)
			veh.PUT("/:id", middleware.CheckPermission("vehicles.edit"), handlers.UpdateVehicle)
			veh.PUT("/:id/status", middleware.CheckPermission("vehicles.edit"), handlers.UpdateVehicleStatus)
			veh.DELETE("/:id", middleware.CheckPermission("vehicles.delete"), handlers.DeleteVehicle)
		}

		// 5. Fuels routes
		fuels := api.Group("/fuels", middleware.Auth())
		{
			fuels.GET("", handlers.GetFuels)
			fuels.GET("/active", handlers.GetActiveFuels)
			fuels.POST("", middleware.CheckPermission("vehicles.create"), handlers.CreateFuel)
			fuels.PUT("/:id", middleware.CheckPermission("vehicles.edit"), handlers.UpdateFuel)
			fuels.DELETE("/:id", middleware.CheckPermission("vehicles.edit"), handlers.DeleteFuel)
		}

		// 6. Vehicle Legality routes
		vl := api.Group("/vehicle-legality", middleware.Auth())
		{
			vl.GET("", handlers.GetVehicleLegalities)
			vl.GET("/expiring", handlers.GetExpiringVehicleLegalities)
			vl.POST("", middleware.CheckPermission("vehicles.create"), handlers.CreateVehicleLegality)
			vl.PUT("/:id", middleware.CheckPermission("vehicles.edit"), handlers.UpdateVehicleLegality)
			vl.DELETE("/:id", middleware.CheckPermission("vehicles.delete"), handlers.DeleteVehicleLegality)
		}

		// 7. Vehicle Mileage routes
		vkm := api.Group("/vehicle-km", middleware.Auth())
		{
			vkm.GET("", handlers.GetVehicleKmLogs)
			vkm.GET("/monitoring", handlers.GetVehicleKmMonitoring)
			vkm.POST("", handlers.CreateVehicleKmLog)
			vkm.POST("/backfill-trips", handlers.BackfillTripsKm)
			vkm.POST("/backfill-services", handlers.BackfillServicesKm)
		}

		// 8. Drivers routes
		drv := api.Group("/drivers", middleware.Auth())
		{
			drv.GET("", middleware.CheckPermission("drivers.view"), handlers.GetDrivers)
			drv.GET("/available", handlers.GetAvailableDrivers)
			drv.GET("/:id", handlers.GetDriverByID)
			drv.POST("", middleware.CheckPermission("drivers.create"), handlers.CreateDriver)
			drv.PUT("/:id", middleware.CheckPermission("drivers.edit"), handlers.UpdateDriver)
			drv.DELETE("/:id", middleware.CheckPermission("drivers.delete"), handlers.DeleteDriver)
		}

		// 9. Driver Legality routes
		dl := api.Group("/driver-legality", middleware.Auth())
		{
			dl.GET("", handlers.GetDriverLegalities)
			dl.GET("/expiring", handlers.GetExpiringDriverLegalities)
			dl.POST("", middleware.CheckPermission("drivers.create"), handlers.CreateDriverLegality)
			dl.PUT("/:id", middleware.CheckPermission("drivers.edit"), handlers.UpdateDriverLegality)
			dl.DELETE("/:id", middleware.CheckPermission("drivers.delete"), handlers.DeleteDriverLegality)
		}

		// 10. Driver Assignment routes
		da := api.Group("/driver-assignments", middleware.Auth())
		{
			da.GET("", handlers.GetDriverAssignments)
			da.POST("", middleware.CheckPermission("drivers.edit"), handlers.CreateDriverAssignment)
			da.PUT("/:id", middleware.CheckPermission("drivers.edit"), handlers.UpdateDriverAssignment)
		}

		// 11. Trips routes
		trips := api.Group("/trips", middleware.Auth())
		{
			trips.GET("", middleware.CheckPermission("trips.view"), handlers.GetTrips)
			trips.GET("/status/monitoring", handlers.GetTripsMonitoring)
			trips.GET("/:id", handlers.GetTripByID)
			trips.POST("", middleware.CheckPermission("trips.create"), handlers.CreateTrip)
			trips.PUT("/:id/withdraw", handlers.WithdrawTrip)
			trips.PUT("/:id/admin-pre-review", middleware.CheckPermission("trips.approve_admin"), handlers.AdminPreReviewTrip)
			trips.POST("/:id/create-dinas", middleware.CheckPermission("trips.approve_admin"), handlers.CreateDinas)
			trips.GET("/:id/assignments", handlers.GetTripAssignments)
			trips.PUT("/:id/admin-review", middleware.CheckPermission("trips.approve_admin"), handlers.AdminReviewTrip)
			trips.PUT("/:id/hrga-approve", middleware.CheckPermission("trips.approve_hrga"), handlers.HrgaApproveTrip)
			trips.PUT("/:id/hrga-review", middleware.CheckPermission("trips.approve_hrga"), handlers.HrgaReviewTrip)
			trips.PUT("/:id/cancel", middleware.CheckPermission("trips.approve_hrga"), handlers.CancelTrip)
			trips.PUT("/:id/extend", middleware.CheckPermission("trips.approve_hrga", "trips.approve_admin"), handlers.ExtendTrip)
			trips.PUT("/:id/start", handlers.StartTrip)
			trips.PUT("/:id/complete", handlers.CompleteTrip)
			trips.POST("/:id/checkpoints", handlers.AddCheckpoint)
			trips.POST("/:id/events", handlers.AddTripEvent)
		}

		// 12. Services routes (WO, service tickets, routine services)
		services := api.Group("/services", middleware.Auth())
		{
			services.GET("/tickets/active-vehicle", handlers.GetActiveVehicleTicket)
			services.POST("/tickets", handlers.CreateServiceTicket)
			services.GET("/tickets", handlers.GetServiceTickets)
			services.GET("/tickets/:id", handlers.GetServiceTicketByID)
			services.PUT("/tickets/:id/status", middleware.CheckPermission("services.approve"), handlers.UpdateServiceTicketStatus)

			services.GET("/work-orders", middleware.CheckPermission("services.view"), handlers.GetWorkOrders)
			services.GET("/work-orders/driver/active", handlers.GetActiveDriverWorkOrder)
			services.GET("/work-orders/:id", handlers.GetWorkOrderByID)
			services.POST("/work-orders", middleware.CheckPermission("services.create"), handlers.CreateWorkOrder)
			services.POST("/work-orders/:id/checkpoints", handlers.AddWorkOrderCheckpoint)
			services.PUT("/work-orders/:id/status", middleware.CheckPermission("services.approve"), handlers.UpdateWorkOrderStatus)

			services.GET("/routine", handlers.GetRoutineServices)
			services.POST("/routine", middleware.CheckPermission("services.create"), handlers.CreateRoutineService)
			services.PUT("/routine/:id", middleware.CheckPermission("services.create"), handlers.UpdateRoutineService)
			services.DELETE("/routine/:id", middleware.CheckPermission("services.create"), handlers.DeleteRoutineService)

			services.GET("/history", handlers.GetServicesHistory)
		}

		// 13. Reimbursements routes
		reimb := api.Group("/reimbursements", middleware.Auth())
		{
			reimb.GET("", middleware.CheckPermission("reimburse.view"), handlers.GetReimbursements)
			reimb.GET("/:id", handlers.GetReimbursementByID)
			reimb.POST("", middleware.CheckPermission("reimburse.create"), handlers.CreateReimbursement)
			reimb.POST("/:id/items", handlers.AddReimbursementItem)
			reimb.PUT("/:id/status", middleware.CheckPermission("reimburse.approve"), handlers.UpdateReimbursementStatus)
		}

		// 14. Dashboard routes
		api.GET("/dashboard", middleware.Auth(), handlers.GetDashboard)

		// 15. User Management routes
		users := api.Group("/users", middleware.Auth())
		{
			users.GET("", handlers.GetUsers)
			users.GET("/:id", handlers.GetUserByID)
			users.POST("", handlers.CreateUser)
			users.PUT("/:id", handlers.UpdateUser)
			users.DELETE("/:id", handlers.DeleteUser)
		}

		// 16. Notifications routes
		notif := api.Group("/notifications", middleware.Auth())
		{
			notif.GET("", handlers.GetNotifications)
			notif.PUT("/:id/read", handlers.MarkNotificationRead)
			notif.PUT("/read-all", handlers.MarkAllNotificationsRead)
		}

		// Health Check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":    "ok",
				"timestamp": time.Now().Format(time.RFC3339),
			})
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	log.Printf("🚀 Fleet Management API (Go) running on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}

package middleware

import (
	"context"
	"database/sql"
	"net/http"
	"os"
	"strings"
	"time"

	"fleet-management-api/config"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type UserContext struct {
	ID               int      `json:"id"`
	Name             string   `json:"name"`
	Username         string   `json:"username"`
	Phone            string   `json:"phone"`
	RoleID           int      `json:"role_id"`
	CompanyID        *int     `json:"company_id"`
	UnitID           *int     `json:"unit_id"`
	RoleName         string   `json:"role_name"`
	RoleDisplayName  string   `json:"role_display_name"`
	CompanyName      *string  `json:"company_name"`
	UnitName         *string  `json:"unit_name"`
	Permissions      []string `json:"permissions"`
}

func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Token tidak ditemukan"})
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == authHeader { // No "Bearer " prefix found
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Format token tidak valid"})
			c.Abort()
			return
		}

		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Token tidak valid"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Token tidak valid"})
			c.Abort()
			return
		}

		userIDFloat, ok := claims["id"].(float64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "User ID tidak valid"})
			c.Abort()
			return
		}
		userID := int(userIDFloat)

		// Fetch user details
		var u UserContext
		query := `SELECT u.id, u.name, u.username, u.phone, u.role_id, u.company_id, u.unit_id,
		                 r.name as role_name, r.display_name as role_display_name,
		                 c.name as company_name, un.name as unit_name
		          FROM users u
		          LEFT JOIN roles r ON u.role_id = r.id
		          LEFT JOIN companies c ON u.company_id = c.id
		          LEFT JOIN units un ON u.unit_id = un.id
		          WHERE u.id = ? AND u.is_active = 1`

		row := config.DB.QueryRowContext(context.Background(), query, userID)

		var companyID, unitID sql.NullInt64
		var companyName, unitName sql.NullString
		var phone sql.NullString

		err = row.Scan(&u.ID, &u.Name, &u.Username, &phone, &u.RoleID, &companyID, &unitID,
			&u.RoleName, &u.RoleDisplayName, &companyName, &unitName)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "User tidak ditemukan"})
			c.Abort()
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
			c.Abort()
			return
		}

		if phone.Valid {
			u.Phone = phone.String
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

		// Get permissions
		rows, err := config.DB.QueryContext(context.Background(),
			`SELECT p.name FROM permissions p
			 JOIN role_permissions rp ON p.id = rp.permission_id
			 WHERE rp.role_id = ?`, u.RoleID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Server error"})
			c.Abort()
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

		c.Set("user", u)
		c.Next()
	}
}

func CheckPermission(requiredPermissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userVal, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Akses ditolak"})
			c.Abort()
			return
		}

		user := userVal.(UserContext)
		if user.RoleName == "super_admin" {
			c.Next()
			return
		}

		hasPermission := false
		for _, reqPerm := range requiredPermissions {
			for _, userPerm := range user.Permissions {
				if userPerm == reqPerm {
					hasPermission = true
					break
				}
			}
			if hasPermission {
				break
			}
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Akses ditolak"})
			c.Abort()
			return
		}

		c.Next()
	}
}

func GenerateToken(userID int, roleName string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":   userID,
		"role": roleName,
		"exp":  time.Now().Add(time.Hour * 24 * 7).Unix(), // default to 7 days
	})

	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

package shared

import (
	"context"
	"database/sql"
	"log"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// DetermineModule extracts the domain module name from the request path
func DetermineModule(path string) string {
	if strings.HasPrefix(path, "/health") {
		return "health"
	}
	if strings.HasPrefix(path, "/ws") {
		return "chat"
	}

	cleanPath := strings.TrimPrefix(path, "/api/v1")
	cleanPath = strings.Trim(cleanPath, "/")
	if cleanPath == "" {
		return "general"
	}

	parts := strings.Split(cleanPath, "/")
	first := parts[0]
	switch first {
	case "admin":
		return "admin"
	case "auth":
		return "auth"
	case "trips":
		return "trips"
	case "chat", "conversations", "ws":
		return "chat"
	case "destinations", "recommendations", "community":
		return "community"
	case "explore":
		return "explore"
	case "matches":
		return "matching"
	case "notifications":
		return "notification"
	case "moderation":
		return "moderation"
	case "profile", "origins", "users":
		for _, part := range parts[1:] {
			if part == "report" || part == "block" || part == "blocked" {
				return "moderation"
			}
		}
		return "profile"
	default:
		return first
	}
}

// MetricsMiddleware logs request telemetry and audit entries asynchronously
func MetricsMiddleware(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		durationMS := int(time.Since(start).Milliseconds())
		statusCode := c.Writer.Status()
		method := c.Request.Method
		endpoint := c.FullPath()
		if endpoint == "" {
			endpoint = c.Request.URL.Path
		}

		// Extract context metadata
		var userID *string
		if val, exists := c.Get("user_id"); exists {
			if s, ok := val.(string); ok && s != "" {
				userID = &s
			}
		}

		var userEmail *string
		if val, exists := c.Get("user_email"); exists {
			if s, ok := val.(string); ok && s != "" {
				userEmail = &s
			}
		}

		var userRole *string
		if val, exists := c.Get("user_role"); exists {
			if s, ok := val.(string); ok && s != "" {
				userRole = &s
			}
		}

		ipAddress := c.ClientIP()
		userAgent := c.Request.UserAgent()
		module := DetermineModule(endpoint)
		action := method + " " + endpoint

		// Persist audit log entry asynchronously via goroutine
		if db != nil {
			go func(uid, uemail, urole *string, act, mod, ep, meth string, status, dur int, ip, ua string) {
				defer func() {
					if r := recover(); r != nil {
						log.Printf("[MetricsMiddleware] panic recovered while logging audit log: %v", r)
					}
				}()

				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()

				query := `
					INSERT INTO audit_logs (
						user_id, user_email, user_role, action, module,
						endpoint, method, status_code, duration_ms,
						ip_address, user_agent, created_at
					) VALUES (
						$1, $2, $3, $4, $5,
						$6, $7, $8, $9,
						$10, $11, NOW()
					)
				`
				_, err := db.ExecContext(ctx, query, uid, uemail, urole, act, mod, ep, meth, status, dur, ip, ua)
				if err != nil {
					log.Printf("[MetricsMiddleware] failed to insert audit log: %v", err)
				}
			}(userID, userEmail, userRole, action, module, endpoint, method, statusCode, durationMS, ipAddress, userAgent)
		}
	}
}

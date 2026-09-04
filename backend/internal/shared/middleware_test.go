package shared

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestDetermineModule(t *testing.T) {
	tests := []struct {
		path     string
		expected string
	}{
		{"/health", "health"},
		{"/ws/chat", "chat"},
		{"/api/v1/admin/metrics/summary", "admin"},
		{"/api/v1/auth/login", "auth"},
		{"/api/v1/trips/123", "trips"},
		{"/api/v1/destinations/456", "community"},
		{"/api/v1/recommendations/789/vote", "community"},
		{"/api/v1/explore/recommendations", "explore"},
		{"/api/v1/matches/abc", "matching"},
		{"/api/v1/notifications", "notification"},
		{"/api/v1/profile", "profile"},
		{"/api/v1/users/123/report", "moderation"},
		{"/api/v1/users/123/block", "moderation"},
	}

	for _, tt := range tests {
		got := DetermineModule(tt.path)
		if got != tt.expected {
			t.Errorf("DetermineModule(%q) = %q, expected %q", tt.path, got, tt.expected)
		}
	}
}

func TestRequireAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Allowed for admin", func(t *testing.T) {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			c.Set("user_role", "admin")
			c.Next()
		})
		r.Use(RequireAdmin())
		r.GET("/test-admin", func(c *gin.Context) {
			c.Status(http.StatusOK)
		})

		req, _ := http.NewRequest(http.MethodGet, "/test-admin", nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)

		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("Forbidden for regular user", func(t *testing.T) {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			c.Set("user_role", "user")
			c.Next()
		})
		r.Use(RequireAdmin())
		r.GET("/test-admin", func(c *gin.Context) {
			c.Status(http.StatusOK)
		})

		req, _ := http.NewRequest(http.MethodGet, "/test-admin", nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)

		if resp.Code != http.StatusForbidden {
			t.Errorf("expected status 403, got %d", resp.Code)
		}
	})

	t.Run("Forbidden when no role set", func(t *testing.T) {
		r := gin.New()
		r.Use(RequireAdmin())
		r.GET("/test-admin", func(c *gin.Context) {
			c.Status(http.StatusOK)
		})

		req, _ := http.NewRequest(http.MethodGet, "/test-admin", nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)

		if resp.Code != http.StatusForbidden {
			t.Errorf("expected status 403, got %d", resp.Code)
		}
	})
}

func TestGenerateTokensAndAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	adminToken, _, _, err := GenerateTokens("u-1", "admin@felag.com", "admin")
	if err != nil {
		t.Fatalf("failed to generate admin token: %v", err)
	}

	userToken, _, _, err := GenerateTokens("u-2", "user@felag.com", "user")
	if err != nil {
		t.Fatalf("failed to generate user token: %v", err)
	}

	r := gin.New()
	r.Use(RequireAuth())
	r.GET("/profile", func(c *gin.Context) {
		uid, _ := c.Get("user_id")
		role, _ := c.Get("user_role")
		c.JSON(http.StatusOK, gin.H{
			"user_id": uid,
			"role":    role,
		})
	})

	// 1. Unauthenticated
	req1, _ := http.NewRequest(http.MethodGet, "/profile", nil)
	resp1 := httptest.NewRecorder()
	r.ServeHTTP(resp1, req1)
	if resp1.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for unauthenticated request, got %d", resp1.Code)
	}

	// 2. User token
	req2, _ := http.NewRequest(http.MethodGet, "/profile", nil)
	req2.Header.Set("Authorization", "Bearer "+userToken)
	resp2 := httptest.NewRecorder()
	r.ServeHTTP(resp2, req2)
	if resp2.Code != http.StatusOK {
		t.Errorf("expected 200 for user token, got %d", resp2.Code)
	}

	// 3. Admin token
	req3, _ := http.NewRequest(http.MethodGet, "/profile", nil)
	req3.Header.Set("Authorization", "Bearer "+adminToken)
	resp3 := httptest.NewRecorder()
	r.ServeHTTP(resp3, req3)
	if resp3.Code != http.StatusOK {
		t.Errorf("expected 200 for admin token, got %d", resp3.Code)
	}
}

func TestMetricsMiddleware_NoPanic(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(MetricsMiddleware(nil)) // nil db should not panic
	r.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	req, _ := http.NewRequest(http.MethodGet, "/ping", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.Code)
	}
}

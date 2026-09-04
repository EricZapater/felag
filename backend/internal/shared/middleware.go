package shared

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role,omitempty"`
	jwt.RegisteredClaims
}

func GetJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "felag_development_jwt_secret_key"
	}
	return []byte(secret)
}

func GenerateTokens(userID, email string, userRole ...string) (accessToken string, refreshToken string, expiresIn int64, err error) {
	secret := GetJWTSecret()
	expiresIn = 3600 // 1 hour

	role := "user"
	if len(userRole) > 0 && userRole[0] != "" {
		role = userRole[0]
	}

	// Access Token
	accessClaims := JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	accTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessToken, err = accTokenObj.SignedString(secret)
	if err != nil {
		return "", "", 0, fmt.Errorf("error signing access token: %w", err)
	}

	// Refresh Token (30 days)
	refreshClaims := JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	refTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshToken, err = refTokenObj.SignedString(secret)
	if err != nil {
		return "", "", 0, fmt.Errorf("error signing refresh token: %w", err)
	}

	return accessToken, refreshToken, expiresIn, nil
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Missing Authorization header")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid Authorization header format")
			c.Abort()
			return
		}

		tokenStr := parts[1]
		claims := &JWTClaims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return GetJWTSecret(), nil
		})

		if err != nil || !token.Valid {
			ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid or expired token")
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		role := claims.Role
		if role == "" {
			role = "user"
		}
		c.Set("user_role", role)
		c.Next()
	}
}

// RequireAuth is an alias for AuthMiddleware
func RequireAuth() gin.HandlerFunc {
	return AuthMiddleware()
}

// RequireAdmin verifies that the authenticated user has the 'admin' role
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("user_role")
		if !exists {
			ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Forbidden: admin access required")
			c.Abort()
			return
		}
		roleStr, ok := roleVal.(string)
		if !ok || roleStr != "admin" {
			ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Forbidden: admin access required")
			c.Abort()
			return
		}
		c.Next()
	}
}

func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenStr := parts[1]
				claims := &JWTClaims{}
				token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
					if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
						return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
					}
					return GetJWTSecret(), nil
				})
				if err == nil && token.Valid {
					c.Set("user_id", claims.UserID)
					c.Set("user_email", claims.Email)
					role := claims.Role
					if role == "" {
						role = "user"
					}
					c.Set("user_role", role)
				}
			}
		}
		c.Next()
	}
}

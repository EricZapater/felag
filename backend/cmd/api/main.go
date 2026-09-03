package main

import (
	"log"
	"net/http"
	"os"

	"felag/backend/internal/auth"
	"felag/backend/internal/db"
	"felag/backend/internal/profile"
	"felag/backend/internal/shared"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func main() {
	// Carregar variables d'entorn des de .env si existeix
	shared.LoadEnv()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	database, err := db.InitDB()
	if err != nil {
		log.Printf("Warning: Failed to connect to DB: %v", err)
	}

	r := gin.Default()
	r.Use(CORSMiddleware())

	// Static route for uploaded avatars
	r.Static("/static/avatars", "./uploads/avatars")

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	})

	// Setup Repositories and Services
	authRepo := auth.NewRepository(database)
	authService := auth.NewService(authRepo)
	authHandler := auth.NewHandler(authService)

	profileRepo := profile.NewRepository(database)
	profileService := profile.NewService(profileRepo)
	profileHandler := profile.NewHandler(profileService)

	// API Routes (matching OpenAPI specs)
	v1 := r.Group("/api/v1")
	{
		// Auth public routes
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/register", authHandler.Register)
			authGroup.POST("/login", authHandler.Login)
			authGroup.POST("/refresh", authHandler.Refresh)
		}

		// Origins public routes
		originsGroup := v1.Group("/origins")
		{
			originsGroup.GET("/countries", profileHandler.GetCountries)
			originsGroup.GET("/countries/:country_id/regions", profileHandler.GetRegionsByCountry)
			originsGroup.GET("/regions/:region_id/towns", profileHandler.GetTownsByRegion)
		}

		// Protected routes
		protected := v1.Group("")
		protected.Use(shared.AuthMiddleware())
		{
			protected.POST("/auth/logout", authHandler.Logout)
			protected.GET("/auth/me", authHandler.GetCurrentUser)

			protected.GET("/profile", profileHandler.GetProfile)
			protected.PUT("/profile", profileHandler.UpdateProfile)
			protected.POST("/profile/avatar", profileHandler.UploadAvatar)
			protected.PUT("/profile/origin", profileHandler.UpdateOrigin)
		}
	}

	log.Printf("Starting FELAG Backend API on port %s...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

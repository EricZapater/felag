package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"felag/backend/internal/admin"
	"felag/backend/internal/auth"
	"felag/backend/internal/chat"
	"felag/backend/internal/community"
	"felag/backend/internal/db"
	"felag/backend/internal/explore"
	"felag/backend/internal/matching"
	"felag/backend/internal/moderation"
	"felag/backend/internal/notification"
	"felag/backend/internal/posttrip"
	"felag/backend/internal/profile"
	"felag/backend/internal/shared"
	"felag/backend/internal/trip"

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

	serverStartTime := time.Now()

	database, err := db.InitDB()
	if err != nil {
		log.Printf("Warning: Failed to connect to DB: %v", err)
	}

	r := gin.Default()
	r.Use(CORSMiddleware())
	r.Use(shared.MetricsMiddleware(database))

	// Static route for uploaded avatars
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	avatarDir := filepath.Join(uploadDir, "avatars")
	_ = os.MkdirAll(avatarDir, 0755)
	r.Static("/static/avatars", avatarDir)

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

	moderationRepo := moderation.NewRepository(database)
	moderationService := moderation.NewService(moderationRepo)
	moderationHandler := moderation.NewHandler(moderationService)

	profileRepo := profile.NewRepository(database)
	profileService := profile.NewService(profileRepo)
	profileService.SetModerationService(moderationService)
	profileHandler := profile.NewHandler(profileService)

	notificationRepo := notification.NewRepository(database)
	notificationService := notification.NewService(notificationRepo)
	notificationHandler := notification.NewHandler(notificationService)

	matchingRepo := matching.NewRepository(database)
	matchingService := matching.NewService(matchingRepo)
	matchingHandler := matching.NewHandler(matchingService)

	// Worker asíncron per processar matching i notificacions en segon pla
	matchingWorker := matching.NewWorker(matchingService, notificationService, 100)
	matchingWorker.Start()
	defer matchingWorker.Stop()

	tripRepo := trip.NewRepository(database)
	tripService := trip.NewService(tripRepo)
	tripService.SetEventListener(matchingWorker)
	tripHandler := trip.NewHandler(tripService)

	chatHub := chat.NewHub()
	chatRepo := chat.NewRepository(database)
	chatService := chat.NewService(chatRepo, chatHub)
	chatService.SetModerationService(moderationService)
	chatService.SetNotificationService(notificationService)
	chatHandler := chat.NewHandler(chatService)

	communityRepo := community.NewRepository(database)
	communityService := community.NewService(communityRepo)
	communityHandler := community.NewHandler(communityService)

	posttripRepo := posttrip.NewRepository(database)
	posttripService := posttrip.NewService(posttripRepo)
	posttripService.SetChatService(chatService)
	posttripHandler := posttrip.NewHandler(posttripService)

	exploreRepo := explore.NewRepository(database)
	exploreService := explore.NewService(exploreRepo)
	exploreHandler := explore.NewHandler(exploreService)

	adminRepo := admin.NewRepository(database)
	adminService := admin.NewService(adminRepo, database, chatHub, serverStartTime)
	adminHandler := admin.NewHandler(adminService)

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
			originsGroup.GET("/towns", profileHandler.SearchTowns)
		}

		// Geo public routes
		geoGroup := v1.Group("/geo")
		{
			geoGroup.GET("/towns", profileHandler.SearchTowns)
		}

		// Destinations public / optional auth routes
		destinationsGroup := v1.Group("/destinations")
		destinationsGroup.Use(shared.OptionalAuthMiddleware())
		{
			destinationsGroup.GET("", communityHandler.SearchDestinations)
			destinationsGroup.GET("/:id", communityHandler.GetDestinationDetail)
			destinationsGroup.GET("/:id/recommendations", communityHandler.ListRecommendations)
		}

		// Recommendation public routes
		v1.GET("/recommendations/:id/comments", communityHandler.ListComments)

		// WebSocket route for real-time chat (handles auth token via query param or header)
		v1.GET("/ws/chat", chatHandler.HandleWebSocket)

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

			// Public profile route
			protected.GET("/users/:user_id/public-profile", profileHandler.GetPublicProfile)

			// Moderation routes (blocking & reporting)
			protected.POST("/users/:user_id/block", moderationHandler.BlockUser)
			protected.DELETE("/users/:user_id/block", moderationHandler.UnblockUser)
			protected.GET("/users/blocked", moderationHandler.ListBlockedUsers)
			protected.POST("/users/:user_id/report", moderationHandler.ReportUser)

			// Chat & Conversations routes
			protected.GET("/conversations", chatHandler.ListConversations)
			protected.POST("/conversations", chatHandler.CreateOrGetConversation)
			protected.GET("/conversations/:id/messages", chatHandler.GetConversationMessages)
			protected.POST("/conversations/:id/messages", chatHandler.SendMessage)
			protected.PUT("/conversations/:id/read", chatHandler.MarkConversationAsRead)

			// Trips routes
			tripGroup := protected.Group("/trips")
			{
				tripGroup.GET("/active-hub", posttripHandler.GetActiveTripHub)
				tripGroup.GET("", tripHandler.ListTrips)
				tripGroup.POST("", tripHandler.CreateTrip)
				tripGroup.GET("/:trip_id", tripHandler.GetTripByID)
				tripGroup.PUT("/:trip_id", tripHandler.UpdateTrip)
				tripGroup.DELETE("/:trip_id", tripHandler.DeleteTrip)
				tripGroup.GET("/:trip_id/matches", matchingHandler.GetTripMatches)
				tripGroup.PUT("/:trip_id/photo-sharing", tripHandler.UpdatePhotoSharingMode)
				tripGroup.GET("/:trip_id/companions", tripHandler.ListTripCompanions)
				tripGroup.POST("/:trip_id/companions", tripHandler.AddTripCompanion)
				tripGroup.DELETE("/:trip_id/companions/:user_id", tripHandler.RemoveTripCompanion)

				// Post-Trip & Photos & Celebration & Wrapup
				tripGroup.GET("/:trip_id/photos", posttripHandler.ListPhotos)
				tripGroup.POST("/:trip_id/photos", posttripHandler.AddPhoto)
				tripGroup.PUT("/:trip_id/photos/:photo_id/feature", posttripHandler.TogglePhotoFeatured)
				tripGroup.DELETE("/:trip_id/photos/:photo_id", posttripHandler.DeletePhoto)
				tripGroup.GET("/:trip_id/celebration-cards", posttripHandler.ListCelebrationCards)
				tripGroup.POST("/:trip_id/celebration-cards", posttripHandler.CreateCelebrationCard)
				tripGroup.GET("/:trip_id/wrapup-status", posttripHandler.GetWrapupStatus)
				tripGroup.POST("/:trip_id/feedback", posttripHandler.SubmitFeedback)
				tripGroup.GET("/:trip_id/stories-card-data", posttripHandler.GetStoriesCardData)
			}

			// Users search route
			protected.GET("/users/search", tripHandler.SearchUsers)

			// Explore routes
			protected.GET("/explore/recommendations", exploreHandler.GetRecommendations)

			// Matches routes
			protected.GET("/matches/:match_id", matchingHandler.GetMatchByID)

			// Notifications routes
			notificationsGroup := protected.Group("/notifications")
			{
				notificationsGroup.POST("/push-token", notificationHandler.RegisterPushToken)
				notificationsGroup.DELETE("/push-token", notificationHandler.UnregisterPushToken)
				notificationsGroup.GET("", notificationHandler.ListNotifications)
				notificationsGroup.PUT("/:notification_id/read", notificationHandler.MarkNotificationAsRead)
				notificationsGroup.PUT("/read-all", notificationHandler.MarkAllNotificationsAsRead)
			}

			// Community protected routes
			protected.POST("/destinations/:id/recommendations", communityHandler.CreateRecommendation)
			protected.POST("/recommendations/:id/vote", communityHandler.ToggleVote)
			protected.POST("/recommendations/:id/comments", communityHandler.CreateComment)
			protected.GET("/destinations/:id/live-feed", communityHandler.GetLiveFeed)
			protected.POST("/destinations/:id/live-feed", communityHandler.CreateLiveMoment)
			protected.POST("/community/report", communityHandler.CreateReport)

			// Admin routes (requires role 'admin')
			adminGroup := protected.Group("/admin")
			adminGroup.Use(shared.RequireAdmin())
			{
				adminGroup.GET("/metrics/summary", adminHandler.GetSummary)
				adminGroup.GET("/metrics/api-latency", adminHandler.GetApiLatencyMetrics)
				adminGroup.GET("/metrics/audit-logs", adminHandler.GetAuditLogs)
				adminGroup.GET("/metrics/audit-logs/export", adminHandler.ExportAuditLogs)
				adminGroup.GET("/moderation/reports", adminHandler.GetModerationReports)
				adminGroup.PUT("/moderation/reports/:id/resolve", adminHandler.ResolveReport)
			}
		}
	}

	log.Printf("Starting FELAG Backend API on port %s...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

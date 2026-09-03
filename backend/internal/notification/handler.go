package notification

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"

	"felag/backend/internal/shared"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterPushToken(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	var req PushTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Token de notificació requerit.")
		return
	}

	if err := h.service.RegisterToken(userIDVal.(string), req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Token registrat amb èxit",
	})
}

func (h *Handler) UnregisterPushToken(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	var req PushTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Token de notificació requerit.")
		return
	}

	if err := h.service.UnregisterToken(userIDVal.(string), req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Token desregistrat amb èxit",
	})
}

func (h *Handler) ListNotifications(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	notifications, err := h.service.ListNotifications(userIDVal.(string), limit)
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, notifications)
}

func (h *Handler) MarkNotificationAsRead(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	notificationID := c.Param("notification_id")
	if err := h.service.MarkAsRead(notificationID, userIDVal.(string)); err != nil {
		if errors.Is(err, sql.ErrNoRows) || errors.Is(err, ErrNotificationNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Notificació no trobada.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Notificació marcada com a llegida",
	})
}

func (h *Handler) MarkAllNotificationsAsRead(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	if err := h.service.MarkAllAsRead(userIDVal.(string)); err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Totes les notificacions marcades com a llegides",
	})
}

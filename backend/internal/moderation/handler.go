package moderation

import (
	"errors"
	"net/http"

	"felag/backend/internal/shared"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) BlockUser(c *gin.Context) {
	currentUserID, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	targetUserID := c.Param("user_id")
	if targetUserID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_USER_ID", "L'identificador d'usuari és obligatori.")
		return
	}

	err := h.service.BlockUser(currentUserID.(string), targetUserID)
	if err != nil {
		if errors.Is(err, ErrSelfBlock) {
			shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "No et pots bloquejar a tu mateix.")
			return
		}
		if errors.Is(err, ErrUserNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Usuari no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Usuari bloquejat amb èxit",
	})
}

func (h *Handler) UnblockUser(c *gin.Context) {
	currentUserID, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	targetUserID := c.Param("user_id")
	if targetUserID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_USER_ID", "L'identificador d'usuari és obligatori.")
		return
	}

	err := h.service.UnblockUser(currentUserID.(string), targetUserID)
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Usuari desbloquejat amb èxit",
	})
}

func (h *Handler) ListBlockedUsers(c *gin.Context) {
	currentUserID, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	users, err := h.service.ListBlockedUsers(currentUserID.(string))
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, users)
}

func (h *Handler) ReportUser(c *gin.Context) {
	currentUserID, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	targetUserID := c.Param("user_id")
	if targetUserID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_USER_ID", "L'identificador d'usuari és obligatori.")
		return
	}

	var req ReportUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Dades invàlides: motiu i detalls són obligatoris.")
		return
	}

	err := h.service.ReportUser(currentUserID.(string), targetUserID, req)
	if err != nil {
		if errors.Is(err, ErrSelfReport) {
			shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "No et pots denunciar a tu mateix.")
			return
		}
		if errors.Is(err, ErrInvalidReportReason) || errors.Is(err, ErrInvalidDetails) {
			shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
			return
		}
		if errors.Is(err, ErrUserNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Usuari no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusCreated, SuccessResponse{
		Success: true,
		Message: "Denúncia registrada per a moderació",
	})
}

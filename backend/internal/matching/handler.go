package matching

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

func (h *Handler) GetTripMatches(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	tripID := c.Param("trip_id")
	matches, err := h.service.GetTripMatches(tripID, userIDVal.(string))
	if err != nil {
		if errors.Is(err, ErrMatchNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Viatge o coincidències no trobades.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, matches)
}

func (h *Handler) GetMatchByID(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	matchID := c.Param("match_id")
	match, err := h.service.GetMatchByID(matchID, userIDVal.(string))
	if err != nil {
		if errors.Is(err, ErrMatchNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Coincidència no trobada.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, match)
}

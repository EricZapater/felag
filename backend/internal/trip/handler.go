package trip

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

func (h *Handler) ListTrips(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	filter := c.Query("filter")
	trips, err := h.service.ListMyTrips(userIDVal.(string), filter)
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, trips)
}

func (h *Handler) CreateTrip(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	var req CreateTripRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	createdTrip, err := h.service.CreateTrip(userIDVal.(string), req)
	if err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	c.JSON(http.StatusCreated, createdTrip)
}

func (h *Handler) GetTripByID(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	tripID := c.Param("trip_id")
	if tripID == "" {
		tripID = c.Param("id")
	}
	trip, err := h.service.GetTripByID(tripID, userIDVal.(string))
	if err != nil {
		if errors.Is(err, ErrTripNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Viatge no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, trip)
}

func (h *Handler) UpdateTrip(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	tripID := c.Param("trip_id")
	if tripID == "" {
		tripID = c.Param("id")
	}

	var req UpdateTripRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	updatedTrip, err := h.service.UpdateTrip(tripID, userIDVal.(string), req)
	if err != nil {
		if errors.Is(err, ErrTripNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Viatge no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	c.JSON(http.StatusOK, updatedTrip)
}

func (h *Handler) DeleteTrip(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	tripID := c.Param("trip_id")
	if tripID == "" {
		tripID = c.Param("id")
	}
	if err := h.service.DeleteTrip(tripID, userIDVal.(string)); err != nil {
		if errors.Is(err, ErrTripNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Viatge no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) UpdatePhotoSharingMode(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	tripID := c.Param("trip_id")
	if tripID == "" {
		tripID = c.Param("id")
	}

	var req UpdatePhotoSharingModeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	if err := h.service.UpdatePhotoSharingMode(tripID, userIDVal.(string), req.PhotoSharingMode); err != nil {
		if errors.Is(err, ErrTripNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Viatge no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Mode de compartició de fotos actualitzat correctament",
	})
}

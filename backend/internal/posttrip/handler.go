package posttrip

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

func getTripID(c *gin.Context) string {
	id := c.Param("id")
	if id == "" {
		id = c.Param("trip_id")
	}
	return id
}

func (h *Handler) GetActiveTripHub(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}
	userID := userIDVal.(string)

	resp, err := h.service.GetActiveTripHub(userID)
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) ListPhotos(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}
	userID := userIDVal.(string)

	tripID := getTripID(c)
	if tripID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de viatge obligatori.")
		return
	}

	photos, err := h.service.ListPhotos(userID, tripID)
	if err != nil {
		if errors.Is(err, ErrTripNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Viatge no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, photos)
}

func (h *Handler) AddPhoto(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}
	userID := userIDVal.(string)

	tripID := getTripID(c)
	if tripID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de viatge obligatori.")
		return
	}

	var req AddTripPhotoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	photo, err := h.service.AddPhoto(userID, tripID, req)
	if err != nil {
		if errors.Is(err, ErrTripNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Viatge no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	c.JSON(http.StatusCreated, photo)
}

func (h *Handler) TogglePhotoFeatured(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}
	userID := userIDVal.(string)

	tripID := getTripID(c)
	photoID := c.Param("photo_id")
	if tripID == "" || photoID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificadors obligatoris.")
		return
	}

	photo, err := h.service.TogglePhotoFeatured(userID, tripID, photoID)
	if err != nil {
		if errors.Is(err, ErrTripNotFound) || errors.Is(err, ErrPhotoNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Element no trobat.")
			return
		}
		if errors.Is(err, ErrForbidden) {
			shared.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "No tens permís per modificar aquesta foto.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, photo)
}

func (h *Handler) DeletePhoto(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}
	userID := userIDVal.(string)

	tripID := getTripID(c)
	photoID := c.Param("photo_id")
	if tripID == "" || photoID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificadors obligatoris.")
		return
	}

	err := h.service.DeletePhoto(userID, tripID, photoID)
	if err != nil {
		if errors.Is(err, ErrTripNotFound) || errors.Is(err, ErrPhotoNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Element no trobat.")
			return
		}
		if errors.Is(err, ErrForbidden) {
			shared.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "No tens permís per eliminar aquesta foto.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	msg := "Foto eliminada correctament"
	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: &msg,
	})
}

func (h *Handler) ListCelebrationCards(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}
	userID := userIDVal.(string)

	tripID := getTripID(c)
	if tripID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de viatge obligatori.")
		return
	}

	cards, err := h.service.ListCelebrationCards(userID, tripID)
	if err != nil {
		if errors.Is(err, ErrTripNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Viatge no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, cards)
}

func (h *Handler) CreateCelebrationCard(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}
	userID := userIDVal.(string)

	tripID := getTripID(c)
	if tripID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de viatge obligatori.")
		return
	}

	var req CreateCelebrationCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	card, err := h.service.CreateCelebrationCard(userID, tripID, req)
	if err != nil {
		if errors.Is(err, ErrTripNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Viatge no trobat.")
			return
		}
		if errors.Is(err, ErrSelfCelebration) {
			shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "No pots crear una Celebration Card amb tu mateix.")
			return
		}
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	c.JSON(http.StatusCreated, card)
}

func (h *Handler) GetWrapupStatus(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}
	userID := userIDVal.(string)

	tripID := getTripID(c)
	if tripID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de viatge obligatori.")
		return
	}

	status, err := h.service.GetWrapupStatus(userID, tripID)
	if err != nil {
		if errors.Is(err, ErrTripNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Viatge no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, status)
}

func (h *Handler) SubmitFeedback(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}
	userID := userIDVal.(string)

	tripID := getTripID(c)
	if tripID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de viatge obligatori.")
		return
	}

	var req TripFeedbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	if err := h.service.SubmitFeedback(userID, tripID, req); err != nil {
		if errors.Is(err, ErrTripNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Viatge no trobat.")
			return
		}
		if errors.Is(err, ErrInvalidFeedback) {
			shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_RATING", "La valoració ha de ser entre 1 i 5.")
			return
		}
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	msg := "Feedback enregistrat correctament"
	c.JSON(http.StatusCreated, SuccessResponse{
		Success: true,
		Message: &msg,
	})
}

func (h *Handler) GetStoriesCardData(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}
	userID := userIDVal.(string)

	tripID := getTripID(c)
	if tripID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de viatge obligatori.")
		return
	}

	data, err := h.service.GetStoriesCardData(userID, tripID)
	if err != nil {
		if errors.Is(err, ErrTripNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Viatge no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, data)
}

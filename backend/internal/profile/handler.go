package profile

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

func (h *Handler) GetProfile(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	p, err := h.service.GetProfile(userIDVal.(string))
	if err != nil {
		if errors.Is(err, ErrProfileNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Perfil no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, p)
}

func (h *Handler) UpdateProfile(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	p, err := h.service.UpdateProfile(userIDVal.(string), req)
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, p)
}

func (h *Handler) UploadAvatar(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_FILE", "És necessari incloure un fitxer a la petició.")
		return
	}

	avatarURL, err := h.service.UploadAvatar(userIDVal.(string), fileHeader)
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"avatar_url": avatarURL})
}

func (h *Handler) UpdateOrigin(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	var req UpdateOriginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	p, err := h.service.UpdateOrigin(userIDVal.(string), req.TownID)
	if err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_TOWN", err.Error())
		return
	}

	c.JSON(http.StatusOK, p)
}

func (h *Handler) GetCountries(c *gin.Context) {
	countries, err := h.service.GetCountries()
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	c.JSON(http.StatusOK, countries)
}

func (h *Handler) GetRegionsByCountry(c *gin.Context) {
	countryID := c.Param("country_id")
	regions, err := h.service.GetRegionsByCountry(countryID)
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	c.JSON(http.StatusOK, regions)
}

func (h *Handler) GetTownsByRegion(c *gin.Context) {
	regionID := c.Param("region_id")
	towns, err := h.service.GetTownsByRegion(regionID)
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	c.JSON(http.StatusOK, towns)
}

func (h *Handler) GetPublicProfile(c *gin.Context) {
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

	p, err := h.service.GetPublicProfile(currentUserID.(string), targetUserID)
	if err != nil {
		if errors.Is(err, ErrForbidden) {
			shared.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "No tens permís per veure aquest perfil.")
			return
		}
		if errors.Is(err, ErrProfileNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Perfil no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, p)
}

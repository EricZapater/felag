package places

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	placesGroup := rg.Group("/places")
	{
		placesGroup.GET("/autocomplete", h.Autocomplete)
		placesGroup.GET("/details/:google_place_id", h.GetPlaceDetails)
		placesGroup.POST("/resolve", h.ResolvePlace)
		placesGroup.GET("/local", h.SearchLocalPlaces)
		placesGroup.GET("/id/:id", h.GetPlaceByID)
	}
}

// Autocomplete handles destination autocompletion queries
func (h *Handler) Autocomplete(c *gin.Context) {
	input := c.Query("input")
	if input == "" {
		input = c.Query("q")
	}
	if len(strings.TrimSpace(input)) < 2 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    AutocompleteResponse{Predictions: []AutocompletePrediction{}},
		})
		return
	}

	lang := c.Query("lang")
	if lang == "" {
		lang = c.Query("language")
	}
	country := c.Query("country")
	typesParam := c.Query("types")
	var types []string
	if typesParam != "" {
		for _, t := range strings.Split(typesParam, ",") {
			trimmed := strings.TrimSpace(t)
			if trimmed != "" {
				types = append(types, trimmed)
			}
		}
	}

	predictions, err := h.service.Autocomplete(c.Request.Context(), input, lang, country, types)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "PLACES_AUTOCOMPLETE_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    AutocompleteResponse{Predictions: predictions},
	})
}

// GetPlaceDetails handles fetching and caching place details by Google Place ID
func (h *Handler) GetPlaceDetails(c *gin.Context) {
	googlePlaceID := c.Param("google_place_id")
	if googlePlaceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_PLACE_ID",
				"message": "google_place_id parameter is required",
			},
		})
		return
	}

	lang := c.Query("lang")
	place, err := h.service.ResolvePlace(c.Request.Context(), googlePlaceID, lang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "PLACE_RESOLVE_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    place,
	})
}

// ResolvePlace accepts a POST request to resolve and cache a Google Place ID
func (h *Handler) ResolvePlace(c *gin.Context) {
	var req ResolvePlaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": err.Error(),
			},
		})
		return
	}

	place, err := h.service.ResolvePlace(c.Request.Context(), req.GooglePlaceID, req.Language)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "PLACE_RESOLVE_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    place,
	})
}

// SearchLocalPlaces searches already cached places from the database
func (h *Handler) SearchLocalPlaces(c *gin.Context) {
	query := c.Query("q")
	limitStr := c.DefaultQuery("limit", "10")
	limit, _ := strconv.Atoi(limitStr)

	places, err := h.service.SearchLocalPlaces(c.Request.Context(), query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "LOCAL_SEARCH_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    places,
	})
}

// GetPlaceByID returns a place by its internal database UUID
func (h *Handler) GetPlaceByID(c *gin.Context) {
	id := c.Param("id")
	place, err := h.service.GetPlaceByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
		return
	}
	if place == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "PLACE_NOT_FOUND",
				"message": "place not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    place,
	})
}

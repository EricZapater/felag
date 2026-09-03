package community

import (
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

func (h *Handler) SearchDestinations(c *gin.Context) {
	q := c.Query("q")
	limitStr := c.Query("limit")
	limit := 20
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	destinations, err := h.service.SearchDestinations(q, limit)
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, destinations)
}

func (h *Handler) GetDestinationDetail(c *gin.Context) {
	destID := c.Param("id")
	if destID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de destinació obligatori.")
		return
	}

	var currentUserID string
	if uid, exists := c.Get("user_id"); exists {
		currentUserID, _ = uid.(string)
	}

	detail, err := h.service.GetDestinationDetail(destID, currentUserID)
	if err != nil {
		if errors.Is(err, ErrDestinationNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Destinació no trobada.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, detail)
}

func (h *Handler) ListRecommendations(c *gin.Context) {
	destID := c.Param("id")
	if destID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de destinació obligatori.")
		return
	}

	category := c.Query("category")
	originFilter := c.Query("origin_filter")
	sort := c.Query("sort")

	var currentUserID string
	if uid, exists := c.Get("user_id"); exists {
		currentUserID, _ = uid.(string)
	}

	recs, err := h.service.ListRecommendations(destID, category, originFilter, sort, currentUserID)
	if err != nil {
		if errors.Is(err, ErrDestinationNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Destinació no trobada.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, recs)
}

func (h *Handler) CreateRecommendation(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	destID := c.Param("id")
	if destID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de destinació obligatori.")
		return
	}

	var req CreateRecommendationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	created, err := h.service.CreateRecommendation(destID, userIDVal.(string), req)
	if err != nil {
		if errors.Is(err, ErrDestinationNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Destinació no trobada.")
			return
		}
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	c.JSON(http.StatusCreated, created)
}

func (h *Handler) ToggleVote(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	recID := c.Param("id")
	if recID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de recomanació obligatori.")
		return
	}

	voteResp, err := h.service.ToggleVote(recID, userIDVal.(string))
	if err != nil {
		if errors.Is(err, ErrRecommendationNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Recomanació no trobada.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, voteResp)
}

func (h *Handler) ListComments(c *gin.Context) {
	recID := c.Param("id")
	if recID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de recomanació obligatori.")
		return
	}

	comments, err := h.service.ListComments(recID)
	if err != nil {
		if errors.Is(err, ErrRecommendationNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Recomanació no trobada.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, comments)
}

func (h *Handler) CreateComment(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	recID := c.Param("id")
	if recID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de recomanació obligatori.")
		return
	}

	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	comment, err := h.service.CreateComment(recID, userIDVal.(string), req)
	if err != nil {
		if errors.Is(err, ErrRecommendationNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Recomanació no trobada.")
			return
		}
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	c.JSON(http.StatusCreated, comment)
}

func (h *Handler) GetLiveFeed(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	destID := c.Param("id")
	if destID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de destinació obligatori.")
		return
	}

	feed, err := h.service.GetLiveFeed(destID, userIDVal.(string))
	if err != nil {
		if errors.Is(err, ErrDestinationNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Destinació no trobada.")
			return
		}
		if errors.Is(err, ErrNoActiveTrip) {
			shared.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "L'usuari no té un viatge actiu en aquesta destinació o les restriccions de privadesa apliquen.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, feed)
}

func (h *Handler) CreateLiveMoment(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	destID := c.Param("id")
	if destID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de destinació obligatori.")
		return
	}

	var req CreateLiveMomentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	moment, err := h.service.CreateLiveMoment(destID, userIDVal.(string), req)
	if err != nil {
		if errors.Is(err, ErrDestinationNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Destinació no trobada.")
			return
		}
		if errors.Is(err, ErrNoActiveTrip) {
			shared.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "No està permès publicar fotos sense un viatge actiu a la destinació.")
			return
		}
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	c.JSON(http.StatusCreated, moment)
}

func (h *Handler) CreateReport(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	var req CommunityReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	if err := h.service.CreateReport(userIDVal.(string), req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	c.JSON(http.StatusCreated, SuccessResponse{
		Success: true,
		Message: "Denúncia rebuda correctament.",
	})
}

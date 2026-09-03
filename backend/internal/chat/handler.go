package chat

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"felag/backend/internal/shared"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ListConversations(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	conversations, err := h.service.ListConversations(userIDVal.(string))
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, conversations)
}

func (h *Handler) CreateOrGetConversation(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	var req CreateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "recipient_id és obligatori.")
		return
	}

	conv, err := h.service.CreateOrGetConversation(userIDVal.(string), req)
	if err != nil {
		if errors.Is(err, ErrForbidden) {
			shared.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "No es pot crear conversa amb un usuari bloquejat.")
			return
		}
		if errors.Is(err, ErrSelfConversation) {
			shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "No pots crear una conversa amb tu mateix.")
			return
		}
		if errors.Is(err, ErrUserNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Usuari destinatari no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, conv)
}

func (h *Handler) GetConversationMessages(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	convID := c.Param("id")
	if convID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "id de conversa obligatori.")
		return
	}

	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	messages, err := h.service.GetConversationMessages(userIDVal.(string), convID, limit)
	if err != nil {
		if errors.Is(err, ErrConversationNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Conversa no trobada.")
			return
		}
		if errors.Is(err, ErrForbidden) {
			shared.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "No tens accés a aquesta conversa.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, messages)
}

func (h *Handler) SendMessage(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	convID := c.Param("id")
	if convID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "id de conversa obligatori.")
		return
	}

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "El contingut del missatge no pot estar buit.")
		return
	}

	msg, err := h.service.SendMessage(userIDVal.(string), convID, req)
	if err != nil {
		if errors.Is(err, ErrConversationNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Conversa no trobada.")
			return
		}
		if errors.Is(err, ErrForbidden) {
			shared.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "No tens permís per enviar missatges en aquesta conversa.")
			return
		}
		if errors.Is(err, ErrEmptyMessage) {
			shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "El missatge no pot estar buit.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusCreated, msg)
}

func (h *Handler) MarkConversationAsRead(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Sessió no vàlida.")
		return
	}

	convID := c.Param("id")
	if convID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "id de conversa obligatori.")
		return
	}

	err := h.service.MarkConversationAsRead(userIDVal.(string), convID)
	if err != nil {
		if errors.Is(err, ErrConversationNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Conversa no trobada.")
			return
		}
		if errors.Is(err, ErrForbidden) {
			shared.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "No tens accés a aquesta conversa.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Conversa marcada com a llegida",
	})
}

func (h *Handler) HandleWebSocket(c *gin.Context) {
	var tokenStr string

	// Extract token from query param or header
	if tokenQuery := c.Query("token"); tokenQuery != "" {
		tokenStr = tokenQuery
	} else if authHeader := c.GetHeader("Authorization"); authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			tokenStr = parts[1]
		}
	} else if userIDVal, exists := c.Get("user_id"); exists {
		tokenStr = ""
		_ = userIDVal
	}

	var userID string
	if tokenStr != "" {
		claims := &shared.JWTClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return shared.GetJWTSecret(), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}
		userID = claims.UserID
	} else if userIDVal, exists := c.Get("user_id"); exists {
		userID = userIDVal.(string)
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logError(fmt.Sprintf("Failed to upgrade websocket connection: %v", err))
		return
	}

	client := &Client{
		hub:     h.service.GetHub(),
		conn:    conn,
		send:    make(chan WSOutgoingMessage, 256),
		userID:  userID,
		chatSvc: h.service,
	}

	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}

func logError(msg string) {
	fmt.Printf("[Chat WebSocket Error] %s\n", msg)
}

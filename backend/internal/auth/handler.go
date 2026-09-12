package auth

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

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	resp, err := h.service.Register(req)
	if err != nil {
		if errors.Is(err, ErrUserAlreadyExists) {
			shared.ErrorResponse(c, http.StatusConflict, "USER_ALREADY_EXISTS", "El correu electrònic ja està registrat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusCreated, resp)
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	resp, err := h.service.Login(req)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			shared.ErrorResponse(c, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Email o contrasenya incorrectes.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	resp, err := h.service.Refresh(req.RefreshToken)
	if err != nil {
		shared.ErrorResponse(c, http.StatusUnauthorized, "INVALID_TOKEN", "Token de renovació invàlid o caducat.")
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) Logout(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	if err := h.service.Logout(req.RefreshToken); err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sessió tancada amb èxit"})
}

func (h *Handler) GetCurrentUser(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "No s'ha trobat la sessió.")
		return
	}

	user, err := h.service.GetCurrentUser(userIDVal.(string))
	if err != nil {
		shared.ErrorResponse(c, http.StatusNotFound, "USER_NOT_FOUND", "Usuari no trobat.")
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *Handler) RequestOTP(c *gin.Context) {
	var req OTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	if err := h.service.RequestOTP(req.Email, req.DeviceName, req.Platform); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Codi d'accés enviat correctament al teu correu.",
	})
}

func (h *Handler) VerifyOTP(c *gin.Context) {
	var req OTPVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		shared.ErrorResponse(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}

	resp, err := h.service.VerifyOTP(req.Email, req.Code, req.DeviceID, req.DeviceName, req.Platform, req.PushToken)
	if err != nil {
		if errors.Is(err, ErrInvalidOTP) {
			shared.ErrorResponse(c, http.StatusUnauthorized, "INVALID_OTP", "Codi OTP invàlid o caducat.")
			return
		}
		if errors.Is(err, ErrTooManyAttempts) {
			shared.ErrorResponse(c, http.StatusTooManyRequests, "TOO_MANY_ATTEMPTS", "Massa intents fallits. Sol·licita un nou codi.")
			return
		}
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) ListDevices(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "No s'ha trobat la sessió.")
		return
	}

	devices, err := h.service.ListUserDevices(userIDVal.(string))
	if err != nil {
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, devices)
}

func (h *Handler) RevokeDevice(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		shared.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "No s'ha trobat la sessió.")
		return
	}

	deviceID := c.Param("id")
	if deviceID == "" {
		deviceID = c.Param("device_id")
	}
	if deviceID == "" {
		shared.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Identificador de dispositiu obligatori.")
		return
	}

	if err := h.service.RevokeDevice(userIDVal.(string), deviceID); err != nil {
		if errors.Is(err, ErrDeviceNotFound) {
			shared.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Dispositiu no trobat.")
			return
		}
		shared.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Dispositiu revocat correctament.",
	})
}




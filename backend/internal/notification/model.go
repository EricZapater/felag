package notification

import (
	"encoding/json"
	"time"
)

type PushTokenRequest struct {
	Token      string `json:"token" binding:"required"`
	DeviceType string `json:"device_type,omitempty"`
}

type PushToken struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	Token      string    `json:"token"`
	DeviceType string    `json:"device_type"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Notification struct {
	ID        string                 `json:"id"`
	UserID    string                 `json:"-"`
	Type      string                 `json:"type"`
	Title     string                 `json:"title"`
	Body      string                 `json:"body"`
	Data      map[string]interface{} `json:"data,omitempty"`
	Read      bool                   `json:"read"`
	CreatedAt time.Time              `json:"created_at"`
}

type SuccessResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// ExpoPushMessage represents the payload sent to Expo's Push API
type ExpoPushMessage struct {
	To        string                 `json:"to"`
	Title     string                 `json:"title,omitempty"`
	Body      string                 `json:"body,omitempty"`
	Data      map[string]interface{} `json:"data,omitempty"`
	Sound     string                 `json:"sound,omitempty"`
	ChannelID string                 `json:"channelId,omitempty"`
}

// ExpoPushTicket represents the response from Expo's Push API for a single ticket
type ExpoPushTicket struct {
	Status  string          `json:"status"`
	ID      string          `json:"id,omitempty"`
	Message string          `json:"message,omitempty"`
	Details json.RawMessage `json:"details,omitempty"`
}

type ExpoPushResponse struct {
	Data []ExpoPushTicket `json:"data,omitempty"`
}

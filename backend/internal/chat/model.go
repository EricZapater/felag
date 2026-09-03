package chat

import "time"

type ParticipantUser struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	AvatarURL     *string `json:"avatar_url"`
	OriginSummary *string `json:"origin_summary"`
}

type Conversation struct {
	ID                 string          `json:"id"`
	MatchID            *string         `json:"match_id"`
	OtherParticipant   ParticipantUser `json:"other_participant"`
	LastMessagePreview *string         `json:"last_message_preview"`
	LastMessageAt      time.Time       `json:"last_message_at"`
	UnreadCount        int             `json:"unread_count"`
	CreatedAt          time.Time       `json:"created_at"`
}

type Message struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversation_id"`
	SenderID       string    `json:"sender_id"`
	Content        string    `json:"content"`
	Read           bool      `json:"read"`
	CreatedAt      time.Time `json:"created_at"`
}

type CreateConversationRequest struct {
	RecipientID string  `json:"recipient_id" binding:"required"`
	MatchID     *string `json:"match_id,omitempty"`
}

type SendMessageRequest struct {
	Content string `json:"content" binding:"required,min=1"`
}

type SuccessResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// WebSocket client/server message schemas
type WSIncomingMessage struct {
	Action         string  `json:"action"` // "send_message", "mark_read", "ping"
	ConversationID *string `json:"conversation_id,omitempty"`
	Content        *string `json:"content,omitempty"`
}

type WSOutgoingMessage struct {
	Type  string      `json:"type"`           // "new_message", "messages_read", "pong", "error"
	Data  interface{} `json:"data,omitempty"` // Message, ReadNotification, etc.
	Error *string     `json:"error,omitempty"`
}

type WSReadEvent struct {
	ConversationID string `json:"conversation_id"`
	ReaderID       string `json:"reader_id"`
}

package chat

import (
	"errors"
	"fmt"
	"strings"

	"felag/backend/internal/notification"
	"felag/backend/internal/shared"
)

var (
	ErrConversationNotFound = errors.New("CONVERSATION_NOT_FOUND")
	ErrForbidden            = errors.New("FORBIDDEN")
	ErrSelfConversation     = errors.New("cannot create conversation with yourself")
	ErrEmptyMessage         = errors.New("message content cannot be empty")
	ErrUserNotFound         = errors.New("user not found")
)

type moderationChecker interface {
	IsBlocked(userA, userB string) (bool, error)
}

type notificationSender interface {
	SendNotification(userID string, notifType, title, body string, data map[string]interface{}) (*notification.Notification, error)
}

type Service interface {
	ListConversations(userID string) ([]Conversation, error)
	CreateOrGetConversation(userID string, req CreateConversationRequest) (*Conversation, error)
	GetConversationMessages(userID, conversationID string, limit int) ([]Message, error)
	SendMessage(senderID, conversationID string, req SendMessageRequest) (*Message, error)
	MarkConversationAsRead(userID, conversationID string) error
	SetModerationService(mod moderationChecker)
	SetNotificationService(notif notificationSender)
	GetHub() *Hub
}

type service struct {
	repo          Repository
	hub           *Hub
	moderationSvc moderationChecker
	notifSvc      notificationSender
}

func NewService(repo Repository, hub *Hub) Service {
	if hub == nil {
		hub = NewHub()
	}
	return &service{
		repo: repo,
		hub:  hub,
	}
}

func (s *service) SetModerationService(mod moderationChecker) {
	s.moderationSvc = mod
}

func (s *service) SetNotificationService(notif notificationSender) {
	s.notifSvc = notif
}

func (s *service) GetHub() *Hub {
	return s.hub
}

func (s *service) ListConversations(userID string) ([]Conversation, error) {
	return s.repo.ListConversations(userID)
}

func (s *service) CreateOrGetConversation(userID string, req CreateConversationRequest) (*Conversation, error) {
	recipientID := strings.TrimSpace(req.RecipientID)
	if recipientID == "" {
		return nil, errors.New("recipient_id is required")
	}
	if recipientID == userID {
		return nil, ErrSelfConversation
	}

	exists, err := s.repo.UserExists(recipientID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrUserNotFound
	}

	if s.moderationSvc != nil {
		blocked, err := s.moderationSvc.IsBlocked(userID, recipientID)
		if err != nil {
			return nil, err
		}
		if blocked {
			return nil, ErrForbidden
		}
	}

	// Check existing conversation
	rec, err := s.repo.GetConversationByParticipants(userID, recipientID)
	if err != nil {
		return nil, err
	}

	if rec != nil {
		return s.repo.GetConversationDetailed(rec.ID, userID)
	}

	// Create new
	rec, err = s.repo.CreateConversation(req.MatchID, userID, recipientID)
	if err != nil {
		return nil, err
	}

	return s.repo.GetConversationDetailed(rec.ID, userID)
}

func (s *service) GetConversationMessages(userID, conversationID string, limit int) ([]Message, error) {
	rec, err := s.repo.GetConversationByID(conversationID)
	if err != nil {
		return nil, err
	}
	if rec == nil {
		return nil, ErrConversationNotFound
	}

	if rec.Participant1 != userID && rec.Participant2 != userID {
		return nil, ErrForbidden
	}

	otherID := rec.Participant1
	if otherID == userID {
		otherID = rec.Participant2
	}

	if s.moderationSvc != nil {
		blocked, err := s.moderationSvc.IsBlocked(userID, otherID)
		if err != nil {
			return nil, err
		}
		if blocked {
			return nil, ErrForbidden
		}
	}

	return s.repo.ListMessages(conversationID, limit)
}

func (s *service) SendMessage(senderID, conversationID string, req SendMessageRequest) (*Message, error) {
	content := strings.TrimSpace(req.Content)
	if content == "" {
		return nil, ErrEmptyMessage
	}

	rec, err := s.repo.GetConversationByID(conversationID)
	if err != nil {
		return nil, err
	}
	if rec == nil {
		return nil, ErrConversationNotFound
	}

	if rec.Participant1 != senderID && rec.Participant2 != senderID {
		return nil, ErrForbidden
	}

	recipientID := rec.Participant1
	if recipientID == senderID {
		recipientID = rec.Participant2
	}

	if s.moderationSvc != nil {
		blocked, err := s.moderationSvc.IsBlocked(senderID, recipientID)
		if err != nil {
			return nil, err
		}
		if blocked {
			return nil, ErrForbidden
		}
	}

	// Encrypt message content with AES-256-GCM
	encryptedContent, err := shared.Encrypt(content)
	if err != nil {
		return nil, fmt.Errorf("error encrypting message: %w", err)
	}

	// Preview snippet (up to 100 characters)
	preview := content
	if len(preview) > 100 {
		preview = preview[:100] + "..."
	}

	msg, err := s.repo.CreateMessage(conversationID, senderID, encryptedContent, preview)
	if err != nil {
		return nil, err
	}

	// Send real-time event via WebSocket Hub
	wsMsg := WSOutgoingMessage{
		Type: "new_message",
		Data: msg,
	}
	s.hub.SendToUser(recipientID, wsMsg)
	s.hub.SendToUser(senderID, wsMsg)

	// Send Push Notification if recipient is not connected to WebSocket
	if !s.hub.IsUserOnline(recipientID) && s.notifSvc != nil {
		senderName, err := s.repo.GetUserName(senderID)
		if err != nil || senderName == "" {
			senderName = "Un viatger"
		}

		title := fmt.Sprintf("Missatge de %s", senderName)
		body := preview
		data := map[string]interface{}{
			"conversation_id": conversationID,
			"sender_id":       senderID,
			"message_id":      msg.ID,
		}

		_, _ = s.notifSvc.SendNotification(recipientID, "new_message", title, body, data)
	}

	return msg, nil
}

func (s *service) MarkConversationAsRead(userID, conversationID string) error {
	rec, err := s.repo.GetConversationByID(conversationID)
	if err != nil {
		return err
	}
	if rec == nil {
		return ErrConversationNotFound
	}

	if rec.Participant1 != userID && rec.Participant2 != userID {
		return ErrForbidden
	}

	otherID := rec.Participant1
	if otherID == userID {
		otherID = rec.Participant2
	}

	_, err = s.repo.MarkMessagesAsRead(conversationID, userID)
	if err != nil {
		return err
	}

	// Broadcast read event to other participant via WebSocket
	s.hub.SendToUser(otherID, WSOutgoingMessage{
		Type: "messages_read",
		Data: WSReadEvent{
			ConversationID: conversationID,
			ReaderID:       userID,
		},
	})

	return nil
}

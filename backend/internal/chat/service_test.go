package chat

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"felag/backend/internal/notification"
	"felag/backend/internal/shared"
)

type mockChatRepo struct {
	users         map[string]bool
	userNames     map[string]string
	conversations map[string]*ConversationRecord
	messages      map[string][]Message
}

func newMockChatRepo() *mockChatRepo {
	return &mockChatRepo{
		users: map[string]bool{
			"u1": true,
			"u2": true,
			"u3": true,
		},
		userNames: map[string]string{
			"u1": "Mireia Masnou",
			"u2": "Jordi Vinyals",
			"u3": "Arnau Puig",
		},
		conversations: make(map[string]*ConversationRecord),
		messages:      make(map[string][]Message),
	}
}

func (m *mockChatRepo) UserExists(userID string) (bool, error) {
	return m.users[userID], nil
}

func (m *mockChatRepo) GetUserName(userID string) (string, error) {
	name, ok := m.userNames[userID]
	if !ok {
		return "Unknown", nil
	}
	return name, nil
}

func (m *mockChatRepo) ListConversations(userID string) ([]Conversation, error) {
	var list []Conversation
	for _, rec := range m.conversations {
		if rec.Participant1 == userID || rec.Participant2 == userID {
			otherID := rec.Participant1
			if otherID == userID {
				otherID = rec.Participant2
			}
			conv := Conversation{
				ID:            rec.ID,
				LastMessageAt: rec.LastMessageAt,
				CreatedAt:     rec.CreatedAt,
				OtherParticipant: ParticipantUser{
					ID:   otherID,
					Name: m.userNames[otherID],
				},
				UnreadCount: 0,
			}
			if rec.LastMessagePreview.Valid {
				preview := rec.LastMessagePreview.String
				decrypted, err := shared.Decrypt(preview)
				if err == nil {
					conv.LastMessagePreview = &decrypted
				} else {
					conv.LastMessagePreview = &preview
				}
			}
			list = append(list, conv)
		}
	}
	return list, nil
}

func (m *mockChatRepo) GetConversationByID(conversationID string) (*ConversationRecord, error) {
	rec, ok := m.conversations[conversationID]
	if !ok {
		return nil, nil
	}
	return rec, nil
}

func (m *mockChatRepo) GetConversationByParticipants(p1, p2 string) (*ConversationRecord, error) {
	for _, rec := range m.conversations {
		if (rec.Participant1 == p1 && rec.Participant2 == p2) || (rec.Participant1 == p2 && rec.Participant2 == p1) {
			return rec, nil
		}
	}
	return nil, nil
}

func (m *mockChatRepo) CreateConversation(matchID *string, p1, p2 string) (*ConversationRecord, error) {
	id := fmt.Sprintf("conv-%s-%s", p1, p2)
	rec := &ConversationRecord{
		ID:            id,
		Participant1:  p1,
		Participant2:  p2,
		LastMessageAt: time.Now(),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	m.conversations[id] = rec
	return rec, nil
}

func (m *mockChatRepo) GetConversationDetailed(conversationID, userID string) (*Conversation, error) {
	rec, ok := m.conversations[conversationID]
	if !ok {
		return nil, nil
	}
	otherID := rec.Participant1
	if otherID == userID {
		otherID = rec.Participant2
	}
	conv := &Conversation{
		ID:            rec.ID,
		LastMessageAt: rec.LastMessageAt,
		CreatedAt:     rec.CreatedAt,
		OtherParticipant: ParticipantUser{
			ID:   otherID,
			Name: m.userNames[otherID],
		},
		UnreadCount: 0,
	}
	if rec.LastMessagePreview.Valid {
		p := rec.LastMessagePreview.String
		decrypted, err := shared.Decrypt(p)
		if err == nil {
			conv.LastMessagePreview = &decrypted
		} else {
			conv.LastMessagePreview = &p
		}
	}
	return conv, nil
}

func (m *mockChatRepo) CreateMessage(conversationID, senderID, encryptedContent, preview string) (*Message, error) {
	msg := Message{
		ID:             fmt.Sprintf("msg-%d", len(m.messages[conversationID])+1),
		ConversationID: conversationID,
		SenderID:       senderID,
		Content:        preview,
		Read:           false,
		CreatedAt:      time.Now(),
	}
	m.messages[conversationID] = append(m.messages[conversationID], msg)
	return &msg, nil
}

func (m *mockChatRepo) ListMessages(conversationID string, limit int) ([]Message, error) {
	return m.messages[conversationID], nil
}

func (m *mockChatRepo) MarkMessagesAsRead(conversationID, readerID string) (int64, error) {
	var count int64
	for i := range m.messages[conversationID] {
		if m.messages[conversationID][i].SenderID != readerID && !m.messages[conversationID][i].Read {
			m.messages[conversationID][i].Read = true
			count++
		}
	}
	return count, nil
}

type mockChatModeration struct {
	blockedPairs map[string]bool
}

func (mc *mockChatModeration) IsBlocked(userA, userB string) (bool, error) {
	if mc.blockedPairs[userA+":"+userB] || mc.blockedPairs[userB+":"+userA] {
		return true, nil
	}
	return false, nil
}

type mockNotificationSender struct {
	sentNotifications []struct {
		userID    string
		notifType string
		title     string
		body      string
		data      map[string]interface{}
	}
}

func (mn *mockNotificationSender) SendNotification(userID string, notifType, title, body string, data map[string]interface{}) (*notification.Notification, error) {
	mn.sentNotifications = append(mn.sentNotifications, struct {
		userID    string
		notifType string
		title     string
		body      string
		data      map[string]interface{}
	}{userID, notifType, title, body, data})
	return &notification.Notification{
		ID:     "notif-1",
		UserID: userID,
		Type:   notifType,
		Title:  title,
		Body:   body,
	}, nil
}

func TestChatService_CreateOrGetConversation(t *testing.T) {
	repo := newMockChatRepo()
	mod := &mockChatModeration{blockedPairs: make(map[string]bool)}
	notif := &mockNotificationSender{}
	hub := NewHub()

	svc := NewService(repo, hub)
	svc.SetModerationService(mod)
	svc.SetNotificationService(notif)

	// Self conversation
	_, err := svc.CreateOrGetConversation("u1", CreateConversationRequest{RecipientID: "u1"})
	if !errors.Is(err, ErrSelfConversation) {
		t.Fatalf("expected ErrSelfConversation, got %v", err)
	}

	// Blocked conversation
	mod.blockedPairs["u1:u2"] = true
	_, err = svc.CreateOrGetConversation("u1", CreateConversationRequest{RecipientID: "u2"})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}

	// Valid creation
	mod.blockedPairs["u1:u2"] = false
	conv, err := svc.CreateOrGetConversation("u1", CreateConversationRequest{RecipientID: "u2"})
	if err != nil {
		t.Fatalf("unexpected error creating conversation: %v", err)
	}
	if conv.OtherParticipant.ID != "u2" {
		t.Errorf("expected other participant u2, got %s", conv.OtherParticipant.ID)
	}

	// Idempotent get existing
	conv2, err := svc.CreateOrGetConversation("u1", CreateConversationRequest{RecipientID: "u2"})
	if err != nil {
		t.Fatalf("unexpected error getting existing conversation: %v", err)
	}
	if conv2.ID != conv.ID {
		t.Errorf("expected same conversation id %s, got %s", conv.ID, conv2.ID)
	}
}

func TestChatService_SendMessage_OfflinePush(t *testing.T) {
	repo := newMockChatRepo()
	mod := &mockChatModeration{blockedPairs: make(map[string]bool)}
	notif := &mockNotificationSender{}
	hub := NewHub()

	svc := NewService(repo, hub)
	svc.SetModerationService(mod)
	svc.SetNotificationService(notif)

	conv, err := svc.CreateOrGetConversation("u1", CreateConversationRequest{RecipientID: "u2"})
	if err != nil {
		t.Fatalf("unexpected error creating conv: %v", err)
	}

	// Send message to u2 who is offline (not in hub)
	msg, err := svc.SendMessage("u1", conv.ID, SendMessageRequest{Content: "Hola Jordi! Ens veiem aviat"})
	if err != nil {
		t.Fatalf("unexpected error sending message: %v", err)
	}
	if msg.Content != "Hola Jordi! Ens veiem aviat" {
		t.Errorf("expected plaintext decrypted content, got %s", msg.Content)
	}

	// Verify push notification sent to u2
	if len(notif.sentNotifications) != 1 {
		t.Fatalf("expected 1 push notification for offline user, got %d", len(notif.sentNotifications))
	}
	if notif.sentNotifications[0].userID != "u2" {
		t.Errorf("expected recipient u2, got %s", notif.sentNotifications[0].userID)
	}
	if notif.sentNotifications[0].title != "Missatge de Mireia Masnou" {
		t.Errorf("expected title 'Missatge de Mireia Masnou', got '%s'", notif.sentNotifications[0].title)
	}
}

func TestChatService_MarkConversationAsRead(t *testing.T) {
	repo := newMockChatRepo()
	hub := NewHub()
	svc := NewService(repo, hub)

	conv, _ := svc.CreateOrGetConversation("u1", CreateConversationRequest{RecipientID: "u2"})
	_, _ = svc.SendMessage("u1", conv.ID, SendMessageRequest{Content: "Missatge 1"})

	err := svc.MarkConversationAsRead("u2", conv.ID)
	if err != nil {
		t.Fatalf("unexpected error marking as read: %v", err)
	}

	msgs, _ := svc.GetConversationMessages("u2", conv.ID, 50)
	if len(msgs) != 1 || !msgs[0].Read {
		t.Errorf("expected message to be marked as read: %+v", msgs)
	}
}

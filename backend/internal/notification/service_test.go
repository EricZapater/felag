package notification

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"
)

type mockNotificationRepo struct {
	tokens        map[string]string // token -> userID
	notifications []Notification
}

func (m *mockNotificationRepo) RegisterPushToken(userID, token, deviceType string) error {
	m.tokens[token] = userID
	return nil
}

func (m *mockNotificationRepo) UnregisterPushToken(userID, token string) error {
	delete(m.tokens, token)
	return nil
}

func (m *mockNotificationRepo) GetPushTokensByUserID(userID string) ([]string, error) {
	var list []string
	for tok, u := range m.tokens {
		if u == userID {
			list = append(list, tok)
		}
	}
	return list, nil
}

func (m *mockNotificationRepo) CreateNotification(n *Notification) error {
	n.ID = "notif-test-id"
	n.CreatedAt = time.Now()
	m.notifications = append(m.notifications, *n)
	return nil
}

func (m *mockNotificationRepo) ListNotifications(userID string, limit int) ([]Notification, error) {
	var list []Notification
	for _, n := range m.notifications {
		if n.UserID == userID {
			list = append(list, n)
		}
	}
	return list, nil
}

func (m *mockNotificationRepo) MarkAsRead(notificationID, userID string) error {
	for i, n := range m.notifications {
		if n.ID == notificationID && n.UserID == userID {
			m.notifications[i].Read = true
			return nil
		}
	}
	return sql.ErrNoRows
}

func (m *mockNotificationRepo) MarkAllAsRead(userID string) error {
	for i, n := range m.notifications {
		if n.UserID == userID {
			m.notifications[i].Read = true
		}
	}
	return nil
}

func TestRegisterAndUnregisterToken(t *testing.T) {
	repo := &mockNotificationRepo{tokens: make(map[string]string)}
	svc := NewService(repo)

	// Register token
	err := svc.RegisterToken("user-1", PushTokenRequest{
		Token:      "ExponentPushToken[abc123xyz]",
		DeviceType: "ios",
	})
	if err != nil {
		t.Fatalf("unexpected error registering token: %v", err)
	}

	if repo.tokens["ExponentPushToken[abc123xyz]"] != "user-1" {
		t.Errorf("token not registered correctly")
	}

	// Empty token validation
	err = svc.RegisterToken("user-1", PushTokenRequest{Token: ""})
	if err == nil {
		t.Errorf("expected error registering empty token, got nil")
	}

	// Unregister token
	err = svc.UnregisterToken("user-1", PushTokenRequest{Token: "ExponentPushToken[abc123xyz]"})
	if err != nil {
		t.Fatalf("unexpected error unregistering token: %v", err)
	}

	if _, ok := repo.tokens["ExponentPushToken[abc123xyz]"]; ok {
		t.Errorf("token still exists after unregister")
	}
}

type roundTripperFunc func(req *http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestSendPushNotification(t *testing.T) {
	expoCalled := make(chan bool, 1)

	mockTransport := roundTripperFunc(func(req *http.Request) (*http.Response, error) {
		var messages []ExpoPushMessage
		if err := json.NewDecoder(req.Body).Decode(&messages); err != nil {
			t.Errorf("failed to decode expo request: %v", err)
		}
		if len(messages) != 1 || messages[0].To != "ExponentPushToken[mock-token]" {
			t.Errorf("unexpected expo messages: %+v", messages)
		}

		respBody, _ := json.Marshal(ExpoPushResponse{
			Data: []ExpoPushTicket{
				{Status: "ok", ID: "ticket-123"},
			},
		})

		expoCalled <- true

		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewBuffer(respBody)),
			Header:     make(http.Header),
		}, nil
	})

	repo := &mockNotificationRepo{
		tokens: map[string]string{
			"ExponentPushToken[mock-token]": "user-1",
		},
	}

	httpClient := &http.Client{Transport: mockTransport}
	svc := NewServiceWithClient(repo, httpClient, "https://exp.host/--/api/v2/push/send")

	notif, err := svc.SendNotification(
		"user-1",
		"new_match",
		"Nou FELAGI!",
		"Jordi coincidirà amb tu a Estocolm",
		map[string]interface{}{"trip_id": "trip-1"},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if notif.Title != "Nou FELAGI!" || notif.UserID != "user-1" {
		t.Errorf("unexpected notification: %+v", notif)
	}

	select {
	case <-expoCalled:
		// Expo push called successfully
	case <-time.After(2 * time.Second):
		t.Errorf("timeout waiting for expo push call")
	}
}

func TestNotificationsReadStatus(t *testing.T) {
	repo := &mockNotificationRepo{
		tokens: make(map[string]string),
		notifications: []Notification{
			{ID: "n1", UserID: "u1", Title: "T1", Read: false},
			{ID: "n2", UserID: "u1", Title: "T2", Read: false},
		},
	}
	svc := NewService(repo)

	// Mark single notification as read
	if err := svc.MarkAsRead("n1", "u1"); err != nil {
		t.Fatalf("unexpected error marking as read: %v", err)
	}
	if !repo.notifications[0].Read {
		t.Errorf("expected n1 to be read")
	}
	if repo.notifications[1].Read {
		t.Errorf("expected n2 to remain unread")
	}

	// Mark all as read
	if err := svc.MarkAllAsRead("u1"); err != nil {
		t.Fatalf("unexpected error marking all as read: %v", err)
	}
	if !repo.notifications[1].Read {
		t.Errorf("expected n2 to be read after MarkAllAsRead")
	}
}

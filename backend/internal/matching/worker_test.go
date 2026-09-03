package matching

import (
	"sync"
	"testing"
	"time"

	"felag/backend/internal/notification"
	"felag/backend/internal/shared"
)

type mockMatchingSvc struct {
	calculateFn func(tripID string) ([]MatchNotificationPayload, error)
}

func (m *mockMatchingSvc) GetTripMatches(tripID string, currentUserID string) ([]Match, error) {
	return nil, nil
}

func (m *mockMatchingSvc) GetMatchByID(matchID string, currentUserID string) (*Match, error) {
	return nil, nil
}

func (m *mockMatchingSvc) CalculateMatchesForTrip(tripID string) ([]MatchNotificationPayload, error) {
	if m.calculateFn != nil {
		return m.calculateFn(tripID)
	}
	return nil, nil
}

type mockNotificationSvc struct {
	mu            sync.Mutex
	notifications []notification.Notification
}

func (m *mockNotificationSvc) RegisterToken(userID string, req notification.PushTokenRequest) error {
	return nil
}

func (m *mockNotificationSvc) UnregisterToken(userID string, req notification.PushTokenRequest) error {
	return nil
}

func (m *mockNotificationSvc) ListNotifications(userID string, limit int) ([]notification.Notification, error) {
	return nil, nil
}

func (m *mockNotificationSvc) MarkAsRead(notificationID, userID string) error {
	return nil
}

func (m *mockNotificationSvc) MarkAllAsRead(userID string) error {
	return nil
}

func (m *mockNotificationSvc) SendNotification(userID string, notifType, title, body string, data map[string]interface{}) (*notification.Notification, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	n := notification.Notification{
		ID:     "notif-1",
		UserID: userID,
		Type:   notifType,
		Title:  title,
		Body:   body,
		Data:   data,
	}
	m.notifications = append(m.notifications, n)
	return &n, nil
}

func TestMatchingWorkerEventProcessing(t *testing.T) {
	calcDone := make(chan bool, 1)

	matchingSvc := &mockMatchingSvc{
		calculateFn: func(tripID string) ([]MatchNotificationPayload, error) {
			calcDone <- true
			return []MatchNotificationPayload{
				{
					MatchID:           "m-1",
					TripID:            tripID,
					MatchedTripID:     "trip-2",
					UserID:            "user-1",
					MatchedUserID:     "user-2",
					MatchedUserName:   "Jordi",
					MatchedUserOrigin: "Vic (Catalunya)",
					DestinationName:   "Estocolm",
					OverlapStartDate:  "2026-10-12",
					OverlapEndDate:    "2026-10-16",
				},
			}, nil
		},
	}

	notifSvc := &mockNotificationSvc{}
	worker := NewWorker(matchingSvc, notifSvc, 10)
	worker.Start()
	defer worker.Stop()

	// Emit TripEvent
	worker.OnTripEvent(shared.TripEvent{
		TripID: "trip-1",
		UserID: "user-1",
		Action: "created",
	})

	select {
	case <-calcDone:
		// Calculation triggered
	case <-time.After(2 * time.Second):
		t.Fatalf("timeout waiting for match calculation")
	}

	// Allow a few milliseconds for notification sending
	time.Sleep(50 * time.Millisecond)

	notifSvc.mu.Lock()
	defer notifSvc.mu.Unlock()

	if len(notifSvc.notifications) != 1 {
		t.Fatalf("expected 1 notification sent, got %d", len(notifSvc.notifications))
	}

	sent := notifSvc.notifications[0]
	if sent.UserID != "user-1" || sent.Type != "new_match" {
		t.Errorf("unexpected sent notification: %+v", sent)
	}
}

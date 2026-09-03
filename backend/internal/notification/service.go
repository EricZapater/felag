package notification

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

var (
	ErrNotificationNotFound = errors.New("notificació no trobada")
	ErrInvalidPushToken     = errors.New("token de notificació invàlid")
)

const ExpoPushEndpoint = "https://exp.host/--/api/v2/push/send"

type Service interface {
	RegisterToken(userID string, req PushTokenRequest) error
	UnregisterToken(userID string, req PushTokenRequest) error
	ListNotifications(userID string, limit int) ([]Notification, error)
	MarkAsRead(notificationID, userID string) error
	MarkAllAsRead(userID string) error
	SendNotification(userID string, notifType, title, body string, data map[string]interface{}) (*Notification, error)
}

type service struct {
	repo       Repository
	httpClient *http.Client
	pushURL    string
}

func NewService(repo Repository) Service {
	return &service{
		repo: repo,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		pushURL: ExpoPushEndpoint,
	}
}

// NewServiceWithClient allows injecting custom http client and url (useful for testing)
func NewServiceWithClient(repo Repository, client *http.Client, pushURL string) Service {
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	if pushURL == "" {
		pushURL = ExpoPushEndpoint
	}
	return &service{
		repo:       repo,
		httpClient: client,
		pushURL:    pushURL,
	}
}

func (s *service) RegisterToken(userID string, req PushTokenRequest) error {
	token := strings.TrimSpace(req.Token)
	if token == "" {
		return ErrInvalidPushToken
	}

	deviceType := strings.ToLower(strings.TrimSpace(req.DeviceType))
	if deviceType == "" {
		deviceType = "android"
	}
	if deviceType != "ios" && deviceType != "android" && deviceType != "web" {
		deviceType = "android"
	}

	return s.repo.RegisterPushToken(userID, token, deviceType)
}

func (s *service) UnregisterToken(userID string, req PushTokenRequest) error {
	token := strings.TrimSpace(req.Token)
	if token == "" {
		return ErrInvalidPushToken
	}

	return s.repo.UnregisterPushToken(userID, token)
}

func (s *service) ListNotifications(userID string, limit int) ([]Notification, error) {
	return s.repo.ListNotifications(userID, limit)
}

func (s *service) MarkAsRead(notificationID, userID string) error {
	return s.repo.MarkAsRead(notificationID, userID)
}

func (s *service) MarkAllAsRead(userID string) error {
	return s.repo.MarkAllAsRead(userID)
}

func (s *service) SendNotification(userID string, notifType, title, body string, data map[string]interface{}) (*Notification, error) {
	if notifType == "" {
		notifType = "new_match"
	}

	n := &Notification{
		UserID: userID,
		Type:   notifType,
		Title:  title,
		Body:   body,
		Data:   data,
		Read:   false,
	}

	if err := s.repo.CreateNotification(n); err != nil {
		return nil, fmt.Errorf("error guardant la notificació: %w", err)
	}

	// Dispatch Expo Push in background / async so it doesn't block
	go func() {
		tokens, err := s.repo.GetPushTokensByUserID(userID)
		if err != nil {
			log.Printf("[Notification] Error obtenint push tokens per a usuari %s: %v", userID, err)
			return
		}

		if len(tokens) == 0 {
			return
		}

		messages := make([]ExpoPushMessage, 0, len(tokens))
		for _, tok := range tokens {
			messages = append(messages, ExpoPushMessage{
				To:        tok,
				Title:     title,
				Body:      body,
				Data:      data,
				Sound:     "default",
				ChannelID: "matches",
			})
		}

		if err := s.sendExpoPush(messages); err != nil {
			log.Printf("[Notification] Error enviant push a Expo per a usuari %s: %v", userID, err)
		}
	}()

	return n, nil
}

func (s *service) sendExpoPush(messages []ExpoPushMessage) error {
	if len(messages) == 0 {
		return nil
	}

	payloadBytes, err := json.Marshal(messages)
	if err != nil {
		return fmt.Errorf("error codificant payload expo push: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, s.pushURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("error creant petició expo push: %w", err)
	}

	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Encoding", "gzip, deflate")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("error executant petició expo push: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("resposta no satisfactòria d'Expo push API: status %d", resp.StatusCode)
	}

	return nil
}

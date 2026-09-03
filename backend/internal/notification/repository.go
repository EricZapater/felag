package notification

import (
	"database/sql"
	"encoding/json"
	"fmt"
)

type Repository interface {
	RegisterPushToken(userID, token, deviceType string) error
	UnregisterPushToken(userID, token string) error
	GetPushTokensByUserID(userID string) ([]string, error)
	CreateNotification(n *Notification) error
	ListNotifications(userID string, limit int) ([]Notification, error)
	MarkAsRead(notificationID, userID string) error
	MarkAllAsRead(userID string) error
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) RegisterPushToken(userID, token, deviceType string) error {
	if deviceType == "" {
		deviceType = "android"
	}

	query := `
		INSERT INTO user_push_tokens (user_id, token, device_type, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (token) DO UPDATE
		SET user_id = EXCLUDED.user_id,
		    device_type = EXCLUDED.device_type,
		    updated_at = NOW()
	`
	_, err := r.db.Exec(query, userID, token, deviceType)
	if err != nil {
		return fmt.Errorf("error registering push token: %w", err)
	}
	return nil
}

func (r *repository) UnregisterPushToken(userID, token string) error {
	query := `
		DELETE FROM user_push_tokens
		WHERE user_id = $1 AND token = $2
	`
	_, err := r.db.Exec(query, userID, token)
	if err != nil {
		return fmt.Errorf("error unregistering push token: %w", err)
	}
	return nil
}

func (r *repository) GetPushTokensByUserID(userID string) ([]string, error) {
	query := `
		SELECT token
		FROM user_push_tokens
		WHERE user_id = $1
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("error querying user push tokens: %w", err)
	}
	defer rows.Close()

	var tokens []string
	for rows.Next() {
		var tok string
		if err := rows.Scan(&tok); err != nil {
			return nil, err
		}
		tokens = append(tokens, tok)
	}
	return tokens, nil
}

func (r *repository) CreateNotification(n *Notification) error {
	var dataBytes []byte
	var err error
	if n.Data != nil {
		dataBytes, err = json.Marshal(n.Data)
		if err != nil {
			return fmt.Errorf("error marshaling notification data: %w", err)
		}
	} else {
		dataBytes = []byte("{}")
	}

	query := `
		INSERT INTO notifications (user_id, type, title, body, data, read, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		RETURNING id, created_at
	`
	err = r.db.QueryRow(query, n.UserID, n.Type, n.Title, n.Body, dataBytes, n.Read).Scan(&n.ID, &n.CreatedAt)
	if err != nil {
		return fmt.Errorf("error creating notification: %w", err)
	}
	return nil
}

func (r *repository) ListNotifications(userID string, limit int) ([]Notification, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	query := `
		SELECT id, user_id, type, title, body, data, read, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	rows, err := r.db.Query(query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("error querying notifications: %w", err)
	}
	defer rows.Close()

	notifications := make([]Notification, 0)
	for rows.Next() {
		var n Notification
		var dataRaw []byte
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Body, &dataRaw, &n.Read, &n.CreatedAt); err != nil {
			return nil, fmt.Errorf("error scanning notification: %w", err)
		}

		if len(dataRaw) > 0 {
			var dataMap map[string]interface{}
			if err := json.Unmarshal(dataRaw, &dataMap); err == nil {
				n.Data = dataMap
			}
		}
		notifications = append(notifications, n)
	}

	return notifications, nil
}

func (r *repository) MarkAsRead(notificationID, userID string) error {
	query := `
		UPDATE notifications
		SET read = TRUE
		WHERE id = $1 AND user_id = $2
	`
	res, err := r.db.Exec(query, notificationID, userID)
	if err != nil {
		return fmt.Errorf("error marking notification as read: %w", err)
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *repository) MarkAllAsRead(userID string) error {
	query := `
		UPDATE notifications
		SET read = TRUE
		WHERE user_id = $1 AND read = FALSE
	`
	_, err := r.db.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("error marking all notifications as read: %w", err)
	}
	return nil
}

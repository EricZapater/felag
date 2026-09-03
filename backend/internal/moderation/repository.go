package moderation

import (
	"database/sql"
	"fmt"
)

type Repository interface {
	BlockUser(blockerID, blockedID string) error
	UnblockUser(blockerID, blockedID string) error
	ListBlockedUsers(blockerID string) ([]BlockedUser, error)
	IsBlocked(userA, userB string) (bool, error)
	CreateReport(reporterID, reportedID, reason, details string) error
	UserExists(userID string) (bool, error)
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) UserExists(userID string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`
	err := r.db.QueryRow(query, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("error checking if user exists: %w", err)
	}
	return exists, nil
}

func (r *repository) BlockUser(blockerID, blockedID string) error {
	query := `
		INSERT INTO user_blocks (blocker_id, blocked_id)
		VALUES ($1, $2)
		ON CONFLICT (blocker_id, blocked_id) DO NOTHING
	`
	_, err := r.db.Exec(query, blockerID, blockedID)
	if err != nil {
		return fmt.Errorf("error inserting user block: %w", err)
	}
	return nil
}

func (r *repository) UnblockUser(blockerID, blockedID string) error {
	query := `DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`
	_, err := r.db.Exec(query, blockerID, blockedID)
	if err != nil {
		return fmt.Errorf("error deleting user block: %w", err)
	}
	return nil
}

func (r *repository) ListBlockedUsers(blockerID string) ([]BlockedUser, error) {
	query := `
		SELECT ub.id, ub.blocked_id, u.name, u.avatar_url, ub.created_at
		FROM user_blocks ub
		JOIN users u ON ub.blocked_id = u.id
		WHERE ub.blocker_id = $1
		ORDER BY ub.created_at DESC
	`
	rows, err := r.db.Query(query, blockerID)
	if err != nil {
		return nil, fmt.Errorf("error querying blocked users: %w", err)
	}
	defer rows.Close()

	var blockedUsers []BlockedUser
	for rows.Next() {
		var bu BlockedUser
		var avatar sql.NullString
		if err := rows.Scan(&bu.ID, &bu.UserID, &bu.Name, &avatar, &bu.BlockedAt); err != nil {
			return nil, fmt.Errorf("error scanning blocked user: %w", err)
		}
		if avatar.Valid {
			bu.AvatarURL = &avatar.String
		}
		blockedUsers = append(blockedUsers, bu)
	}
	return blockedUsers, nil
}

func (r *repository) IsBlocked(userA, userB string) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM user_blocks
			WHERE (blocker_id = $1 AND blocked_id = $2)
			   OR (blocker_id = $2 AND blocked_id = $1)
		)
	`
	var blocked bool
	err := r.db.QueryRow(query, userA, userB).Scan(&blocked)
	if err != nil {
		return false, fmt.Errorf("error checking block status: %w", err)
	}
	return blocked, nil
}

func (r *repository) CreateReport(reporterID, reportedID, reason, details string) error {
	query := `
		INSERT INTO user_reports (reporter_id, reported_id, reason, details)
		VALUES ($1, $2, $3, $4)
	`
	_, err := r.db.Exec(query, reporterID, reportedID, reason, details)
	if err != nil {
		return fmt.Errorf("error creating user report: %w", err)
	}
	return nil
}

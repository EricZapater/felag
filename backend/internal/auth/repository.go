package auth

import (
	"database/sql"
	"fmt"
	"time"
)

type Repository interface {
	CreateUser(email, passwordHash, name string) (*User, error)
	GetUserByEmail(email string) (*User, string, error)
	GetUserByID(id string) (*User, error)
	SaveRefreshToken(userID, token string, expiresAt time.Time) error
	IsRefreshTokenValid(token string) (string, error)
	RevokeRefreshToken(token string) error
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateUser(email, passwordHash, name string) (*User, error) {
	query := `
		INSERT INTO users (email, password_hash, name, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING id, email, name, phone_number, avatar_url, bio, town_id, created_at, updated_at
	`
	u := &User{}
	err := r.db.QueryRow(query, email, passwordHash, name).Scan(
		&u.ID, &u.Email, &u.Name, &u.PhoneNumber, &u.AvatarURL, &u.Bio, &u.TownID, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error inserting user: %w", err)
	}
	return u, nil
}

func (r *repository) GetUserByEmail(email string) (*User, string, error) {
	query := `
		SELECT id, email, password_hash, name, phone_number, avatar_url, bio, town_id, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	u := &User{}
	var passwordHash string
	err := r.db.QueryRow(query, email).Scan(
		&u.ID, &u.Email, &passwordHash, &u.Name, &u.PhoneNumber, &u.AvatarURL, &u.Bio, &u.TownID, &u.CreatedAt, &u.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, "", nil
	}
	if err != nil {
		return nil, "", fmt.Errorf("error querying user by email: %w", err)
	}
	return u, passwordHash, nil
}

func (r *repository) GetUserByID(id string) (*User, error) {
	query := `
		SELECT id, email, name, phone_number, avatar_url, bio, town_id, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	u := &User{}
	err := r.db.QueryRow(query, id).Scan(
		&u.ID, &u.Email, &u.Name, &u.PhoneNumber, &u.AvatarURL, &u.Bio, &u.TownID, &u.CreatedAt, &u.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying user by id: %w", err)
	}
	return u, nil
}

func (r *repository) SaveRefreshToken(userID, token string, expiresAt time.Time) error {
	query := `
		INSERT INTO refresh_tokens (user_id, token, expires_at, revoked, created_at)
		VALUES ($1, $2, $3, false, NOW())
	`
	_, err := r.db.Exec(query, userID, token, expiresAt)
	if err != nil {
		return fmt.Errorf("error saving refresh token: %w", err)
	}
	return nil
}

func (r *repository) IsRefreshTokenValid(token string) (string, error) {
	query := `
		SELECT user_id
		FROM refresh_tokens
		WHERE token = $1 AND revoked = false AND expires_at > NOW()
	`
	var userID string
	err := r.db.QueryRow(query, token).Scan(&userID)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("error verifying refresh token: %w", err)
	}
	return userID, nil
}

func (r *repository) RevokeRefreshToken(token string) error {
	query := `
		UPDATE refresh_tokens
		SET revoked = true
		WHERE token = $1
	`
	_, err := r.db.Exec(query, token)
	if err != nil {
		return fmt.Errorf("error revoking refresh token: %w", err)
	}
	return nil
}

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
	SaveOTP(email, otpCodeHash string, expiresAt time.Time) error
	GetLatestValidOTP(email string) (*AuthOTP, error)
	IncrementOTPAttempts(otpID string) error
	MarkOTPUsed(otpID string) error
	UpsertUserDevice(userID, deviceID, deviceName, platform string, pushToken *string) error
	ListUserDevices(userID string) ([]DeviceSummary, error)
	RevokeDevice(userID, deviceID string) error
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateUser(email, passwordHash, name string) (*User, error) {
	query := `
		INSERT INTO users (email, password_hash, name, role, created_at, updated_at)
		VALUES ($1, $2, $3, 'user', NOW(), NOW())
		RETURNING id, email, name, role, phone_number, avatar_url, bio, town_id, created_at, updated_at
	`
	u := &User{}
	err := r.db.QueryRow(query, email, passwordHash, name).Scan(
		&u.ID, &u.Email, &u.Name, &u.Role, &u.PhoneNumber, &u.AvatarURL, &u.Bio, &u.TownID, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error inserting user: %w", err)
	}
	return u, nil
}

func (r *repository) GetUserByEmail(email string) (*User, string, error) {
	query := `
		SELECT id, email, password_hash, name, role, phone_number, avatar_url, bio, town_id, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	u := &User{}
	var passwordHash string
	err := r.db.QueryRow(query, email).Scan(
		&u.ID, &u.Email, &passwordHash, &u.Name, &u.Role, &u.PhoneNumber, &u.AvatarURL, &u.Bio, &u.TownID, &u.CreatedAt, &u.UpdatedAt,
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
		SELECT id, email, name, role, phone_number, avatar_url, bio, town_id, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	u := &User{}
	err := r.db.QueryRow(query, id).Scan(
		&u.ID, &u.Email, &u.Name, &u.Role, &u.PhoneNumber, &u.AvatarURL, &u.Bio, &u.TownID, &u.CreatedAt, &u.UpdatedAt,
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

func (r *repository) SaveOTP(email, otpCodeHash string, expiresAt time.Time) error {
	query := `
		INSERT INTO auth_otps (email, otp_code_hash, expires_at, attempts, used, created_at)
		VALUES ($1, $2, $3, 0, false, NOW())
	`
	_, err := r.db.Exec(query, email, otpCodeHash, expiresAt)
	if err != nil {
		return fmt.Errorf("error saving OTP: %w", err)
	}
	return nil
}

func (r *repository) GetLatestValidOTP(email string) (*AuthOTP, error) {
	query := `
		SELECT id, email, otp_code_hash, expires_at, attempts, used, created_at
		FROM auth_otps
		WHERE email = $1 AND used = false AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`
	var otp AuthOTP
	err := r.db.QueryRow(query, email).Scan(
		&otp.ID, &otp.Email, &otp.OTPCodeHash, &otp.ExpiresAt, &otp.Attempts, &otp.Used, &otp.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying latest OTP: %w", err)
	}
	return &otp, nil
}

func (r *repository) IncrementOTPAttempts(otpID string) error {
	query := `UPDATE auth_otps SET attempts = attempts + 1 WHERE id = $1`
	_, err := r.db.Exec(query, otpID)
	return err
}

func (r *repository) MarkOTPUsed(otpID string) error {
	query := `UPDATE auth_otps SET used = true WHERE id = $1`
	_, err := r.db.Exec(query, otpID)
	return err
}

func (r *repository) UpsertUserDevice(userID, deviceID, deviceName, platform string, pushToken *string) error {
	query := `
		INSERT INTO user_devices (user_id, device_id, device_name, platform, push_token, last_active_at, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		ON CONFLICT (user_id, device_id) DO UPDATE
		SET device_name = EXCLUDED.device_name,
		    platform = EXCLUDED.platform,
		    push_token = COALESCE(EXCLUDED.push_token, user_devices.push_token),
		    last_active_at = NOW()
	`
	_, err := r.db.Exec(query, userID, deviceID, deviceName, platform, pushToken)
	if err != nil {
		return fmt.Errorf("error upserting user device: %w", err)
	}
	return nil
}

func (r *repository) ListUserDevices(userID string) ([]DeviceSummary, error) {
	query := `
		SELECT id, user_id, device_id, device_name, platform, push_token, last_active_at, created_at
		FROM user_devices
		WHERE user_id = $1
		ORDER BY last_active_at DESC
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("error querying user devices: %w", err)
	}
	defer rows.Close()

	var devices []DeviceSummary
	for rows.Next() {
		var d DeviceSummary
		var pt sql.NullString
		if err := rows.Scan(
			&d.ID, &d.UserID, &d.DeviceID, &d.DeviceName, &d.Platform, &pt, &d.LastActiveAt, &d.CreatedAt,
		); err != nil {
			return nil, err
		}
		if pt.Valid && pt.String != "" {
			d.PushToken = &pt.String
		}
		devices = append(devices, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if devices == nil {
		devices = []DeviceSummary{}
	}
	return devices, nil
}

func (r *repository) RevokeDevice(userID, deviceID string) error {
	query := `
		DELETE FROM user_devices
		WHERE user_id = $1 AND (id::text = $2 OR device_id = $2)
	`
	res, err := r.db.Exec(query, userID, deviceID)
	if err != nil {
		return fmt.Errorf("error revoking user device: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}


package auth

import "time"

type User struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	Name        string    `json:"name"`
	Role        string    `json:"role"`
	PhoneNumber *string   `json:"phone_number,omitempty"`
	AvatarURL   *string   `json:"avatar_url,omitempty"`
	Bio         *string   `json:"bio,omitempty"`
	TownID      *string   `json:"town_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type Tokens struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type AuthResponse struct {
	User   User   `json:"user"`
	Tokens Tokens `json:"tokens"`
}

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int64  `json:"expires_in"`
}

type DeviceSummary struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id,omitempty"`
	DeviceID     string    `json:"device_id"`
	DeviceName   string    `json:"device_name"`
	Platform     string    `json:"platform"`
	PushToken    *string   `json:"push_token,omitempty"`
	LastActiveAt time.Time `json:"last_active_at"`
	CreatedAt    time.Time `json:"created_at"`
}

type OTPRequest struct {
	Email      string `json:"email" binding:"required,email"`
	DeviceName string `json:"device_name,omitempty"`
	Platform   string `json:"platform,omitempty"`
}

type OTPVerifyRequest struct {
	Email      string `json:"email" binding:"required,email"`
	Code       string `json:"code" binding:"required,len=6"`
	DeviceID   string `json:"device_id" binding:"required"`
	DeviceName string `json:"device_name,omitempty"`
	Platform   string `json:"platform,omitempty"`
	PushToken  string `json:"push_token,omitempty"`
}

type AuthOTP struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	OTPCodeHash string    `json:"otp_code_hash"`
	ExpiresAt   time.Time `json:"expires_at"`
	Attempts    int       `json:"attempts"`
	Used        bool      `json:"used"`
	CreatedAt   time.Time `json:"created_at"`
}



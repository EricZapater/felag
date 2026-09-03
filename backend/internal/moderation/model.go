package moderation

import "time"

type BlockedUser struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Name      string    `json:"name"`
	AvatarURL *string   `json:"avatar_url"`
	BlockedAt time.Time `json:"blocked_at"`
}

type ReportUserRequest struct {
	Reason  string `json:"reason" binding:"required"`
	Details string `json:"details" binding:"required,min=5"`
}

type SuccessResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

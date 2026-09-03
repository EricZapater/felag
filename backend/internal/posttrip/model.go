package posttrip

import "time"

type ActiveTripHubResponse struct {
	HasActiveTrip         bool    `json:"has_active_trip"`
	TripID                *string `json:"trip_id,omitempty"`
	TripTitle             *string `json:"trip_title,omitempty"`
	DestinationName       *string `json:"destination_name,omitempty"`
	CountryCode           *string `json:"country_code,omitempty"`
	CountryFlag           *string `json:"country_flag,omitempty"`
	CurrentDay            *int    `json:"current_day,omitempty"`
	TotalDays             *int    `json:"total_days,omitempty"`
	IsFinalDayOrPast      *bool   `json:"is_final_day_or_past,omitempty"`
	PhotoSharingMode      *string `json:"photo_sharing_mode,omitempty"`
	PhotosCount           *int    `json:"photos_count,omitempty"`
	CelebrationCardsCount *int    `json:"celebration_cards_count,omitempty"`
	ActiveFelagisCount    *int    `json:"active_felagis_count,omitempty"`
}

type TripPhoto struct {
	ID           string    `json:"id"`
	TripID       string    `json:"trip_id"`
	UserID       string    `json:"user_id"`
	ImageURL     string    `json:"image_url"`
	Caption      *string   `json:"caption,omitempty"`
	IsFeatured   bool      `json:"is_featured"`
	LocationName *string   `json:"location_name,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type AddTripPhotoRequest struct {
	ImageURL     string  `json:"image_url" binding:"required"`
	Caption      *string `json:"caption,omitempty" binding:"omitempty,max=280"`
	IsFeatured   *bool   `json:"is_featured,omitempty"`
	LocationName *string `json:"location_name,omitempty"`
}

type UserOriginSummary struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
	TownName    *string `json:"town_name,omitempty"`
	RegionName  *string `json:"region_name,omitempty"`
	CountryName *string `json:"country_name,omitempty"`
}

type CelebrationCard struct {
	ID           string            `json:"id"`
	TripID       string            `json:"trip_id"`
	User1        UserOriginSummary `json:"user_1"`
	User2        UserOriginSummary `json:"user_2"`
	ImageURL     string            `json:"image_url"`
	Title        string            `json:"title"`
	Headline     string            `json:"headline"`
	Subheadline  *string           `json:"subheadline,omitempty"`
	LocationName string            `json:"location_name"`
	CreatedAt    time.Time         `json:"created_at"`
}

type CreateCelebrationCardRequest struct {
	User2ID      string  `json:"user_2_id" binding:"required"`
	ImageURL     string  `json:"image_url" binding:"required"`
	LocationName string  `json:"location_name" binding:"required"`
	Caption      *string `json:"caption,omitempty"`
}

type WrapupStatus struct {
	IsFinalDayOrPast     bool `json:"is_final_day_or_past"`
	CelebrationCompleted bool `json:"celebration_completed"`
	FeedbackCompleted    bool `json:"feedback_completed"`
	StoriesReady         bool `json:"stories_ready"`
	ProgressPercentage   int  `json:"progress_percentage"`
}

type CommunityTipInput struct {
	Category    string  `json:"category" binding:"required,oneof=food hidden_gem transport practical_tip anecdote"`
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description" binding:"required"`
	ImageURL    *string `json:"image_url,omitempty"`
}

type TripFeedbackRequest struct {
	Rating        int                 `json:"rating" binding:"required,min=1,max=5"`
	Comments      *string             `json:"comments,omitempty"`
	CommunityTips []CommunityTipInput `json:"community_tips,omitempty" binding:"omitempty,dive"`
}

type StoriesCardData struct {
	TripID          string   `json:"trip_id"`
	TripTitle       string   `json:"trip_title"`
	DestinationName *string  `json:"destination_name,omitempty"`
	CountryFlag     *string  `json:"country_flag,omitempty"`
	AuthorName      string   `json:"author_name"`
	AuthorOrigin    *string  `json:"author_origin,omitempty"`
	StartDate       string   `json:"start_date"`
	EndDate         string   `json:"end_date"`
	TotalDays       int      `json:"total_days"`
	StagesCount     int      `json:"stages_count"`
	FelagisMetCount int      `json:"felagis_met_count"`
	FeaturedPhotos  []string `json:"featured_photos"`
}

type SuccessResponse struct {
	Success bool    `json:"success"`
	Message *string `json:"message,omitempty"`
}

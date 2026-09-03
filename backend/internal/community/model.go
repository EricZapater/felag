package community

import "time"

type DestinationSummary struct {
	ID                   string  `json:"id"`
	Name                 string  `json:"name"`
	RegionName           *string `json:"region_name,omitempty"`
	CountryName          *string `json:"country_name,omitempty"`
	CountryCode          *string `json:"country_code,omitempty"`
	Type                 string  `json:"type"` // "town" | "country"
	RecommendationsCount int     `json:"recommendations_count"`
	ActiveFelagisCount   int     `json:"active_felagis_count"`
}

type DestinationDetail struct {
	ID                   string  `json:"id"`
	Name                 string  `json:"name"`
	RegionName           *string `json:"region_name,omitempty"`
	CountryName          string  `json:"country_name"`
	CountryCode          string  `json:"country_code"`
	FlagEmoji            *string `json:"flag_emoji,omitempty"`
	TotalRecommendations int     `json:"total_recommendations"`
	ActiveFelagisCount   int     `json:"active_felagis_count"`
	TotalVisitorsCount   int     `json:"total_visitors_count"`
	UserIsTravellingNow  bool    `json:"user_is_travelling_now"`
	UserPhotoSharingMode string  `json:"user_photo_sharing_mode,omitempty"`
}

type AuthorSummary struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
	TownName    *string `json:"town_name,omitempty"`
	RegionName  *string `json:"region_name,omitempty"`
	CountryName *string `json:"country_name,omitempty"`
}

type Recommendation struct {
	ID               string        `json:"id"`
	DestinationID    string        `json:"destination_id"`
	Category         string        `json:"category"` // food, hidden_gem, transport, practical_tip, anecdote
	Title            string        `json:"title"`
	Description      string        `json:"description"`
	ImageURL         *string       `json:"image_url,omitempty"`
	LocationName     *string       `json:"location_name,omitempty"`
	UsefulVotesCount int           `json:"useful_votes_count"`
	UserHasVoted     bool          `json:"user_has_voted"`
	CommentsCount    int           `json:"comments_count"`
	Author           AuthorSummary `json:"author"`
	CreatedAt        time.Time     `json:"created_at"`
}

type CreateRecommendationRequest struct {
	Category     string  `json:"category" binding:"required,oneof=food hidden_gem transport practical_tip anecdote"`
	Title        string  `json:"title" binding:"required,max=120"`
	Description  string  `json:"description" binding:"required,max=2000"`
	ImageURL     *string `json:"image_url,omitempty"`
	LocationName *string `json:"location_name,omitempty"`
}

type VoteResponse struct {
	Voted            bool `json:"voted"`
	UsefulVotesCount int  `json:"useful_votes_count"`
}

type Comment struct {
	ID        string        `json:"id"`
	Content   string        `json:"content"`
	Author    AuthorSummary `json:"author"`
	CreatedAt time.Time     `json:"created_at"`
}

type CreateCommentRequest struct {
	Content string `json:"content" binding:"required,max=500"`
}

type LiveMoment struct {
	ID        string        `json:"id"`
	ImageURL  string        `json:"image_url"`
	Caption   *string       `json:"caption,omitempty"`
	Author    AuthorSummary `json:"author"`
	CreatedAt time.Time     `json:"created_at"`
}

type LiveFeedResponse struct {
	ActiveFelagisCount int          `json:"active_felagis_count"`
	Moments            []LiveMoment `json:"moments"`
}

type CreateLiveMomentRequest struct {
	ImageURL string  `json:"image_url" binding:"required"`
	Caption  *string `json:"caption,omitempty" binding:"omitempty,max=280"`
}

type CommunityReportRequest struct {
	TargetType string  `json:"target_type" binding:"required,oneof=recommendation comment live_moment"`
	TargetID   string  `json:"target_id" binding:"required"`
	Reason     string  `json:"reason" binding:"required,oneof=spam inappropriate_content false_information harassment other"`
	Details    *string `json:"details,omitempty"`
}

type SuccessResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

type DestinationInfo struct {
	IsTown      bool
	TownID      string
	TownName    string
	RegionID    string
	RegionName  string
	CountryCode string
	CountryName string
}

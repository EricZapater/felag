package trip

import "time"

type TripStage struct {
	ID              string  `json:"id"`
	TripID          string  `json:"trip_id"`
	StageOrder      int     `json:"stage_order"`
	DestinationName string  `json:"destination_name"`
	CountryCode     *string `json:"country_code,omitempty"`
	TownID          *string `json:"town_id,omitempty"`
	RegionID        *string `json:"region_id,omitempty"`
	StartDate       string  `json:"start_date"`
	EndDate         string  `json:"end_date"`
	Notes           *string `json:"notes,omitempty"`
}

type TripStageInput struct {
	StageOrder      int     `json:"stage_order" binding:"required"`
	DestinationName string  `json:"destination_name" binding:"required"`
	CountryCode     *string `json:"country_code,omitempty"`
	TownID          *string `json:"town_id,omitempty"`
	RegionID        *string `json:"region_id,omitempty"`
	StartDate       string  `json:"start_date" binding:"required"`
	EndDate         string  `json:"end_date" binding:"required"`
	Notes           *string `json:"notes,omitempty"`
}

type Trip struct {
	ID               string      `json:"id"`
	UserID           string      `json:"user_id"`
	Title            string      `json:"title"`
	Description      *string     `json:"description,omitempty"`
	StartDate        string      `json:"start_date"`
	EndDate          string      `json:"end_date"`
	Visibility       string      `json:"visibility"`
	Status           string      `json:"status"`
	PhotoSharingMode string      `json:"photo_sharing_mode"`
	Stages           []TripStage `json:"stages"`
	CreatedAt        time.Time   `json:"created_at"`
	UpdatedAt        time.Time   `json:"updated_at"`
}

type CreateTripRequest struct {
	Title            string           `json:"title" binding:"required"`
	Description      *string          `json:"description,omitempty"`
	StartDate        string           `json:"start_date" binding:"required"`
	EndDate          string           `json:"end_date" binding:"required"`
	Visibility       string           `json:"visibility" binding:"required,oneof=public contacts_only private"`
	PhotoSharingMode *string          `json:"photo_sharing_mode,omitempty" binding:"omitempty,oneof=all_felagis close_origin none"`
	Stages           []TripStageInput `json:"stages" binding:"required,min=1,dive"`
}

type UpdateTripRequest struct {
	Title            *string           `json:"title,omitempty"`
	Description      *string           `json:"description,omitempty"`
	StartDate        *string           `json:"start_date,omitempty"`
	EndDate          *string           `json:"end_date,omitempty"`
	Visibility       *string           `json:"visibility,omitempty" binding:"omitempty,oneof=public contacts_only private"`
	PhotoSharingMode *string           `json:"photo_sharing_mode,omitempty" binding:"omitempty,oneof=all_felagis close_origin none"`
	Stages           *[]TripStageInput `json:"stages,omitempty" binding:"omitempty,dive"`
}

type UpdatePhotoSharingModeRequest struct {
	PhotoSharingMode string `json:"photo_sharing_mode" binding:"required,oneof=all_felagis close_origin none"`
}

package matching

import "time"

type FelagiUser struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	AvatarURL     *string `json:"avatar_url"`
	OriginSummary *string `json:"origin_summary"`
}

type Match struct {
	ID               string     `json:"id"`
	TripID           string     `json:"trip_id"`
	MatchedTripID    string     `json:"matched_trip_id"`
	MatchedUser      FelagiUser `json:"matched_user"`
	DestinationName  string     `json:"destination_name"`
	OverlapStartDate string     `json:"overlap_start_date"`
	OverlapEndDate   string     `json:"overlap_end_date"`
	AffinityLevel    string     `json:"affinity_level"` // "town", "region", "country"
	AffinityScore    int        `json:"affinity_score"` // 100, 75, 50
	Explanation      string     `json:"explanation"`
	CreatedAt        time.Time  `json:"created_at"`
	Status           string     `json:"status,omitempty"`
}

type UserOriginInfo struct {
	UserID      string
	UserName    string
	AvatarURL   *string
	TownID      *string
	TownName    *string
	RegionID    *string
	RegionName  *string
	CountryID   *string
	CountryName *string
}

type TripStageRecord struct {
	TripID          string
	UserID          string
	DestinationName string
	StartDate       string
	EndDate         string
	Visibility      string
}

type MatchRecord struct {
	ID               string
	TripID           string
	MatchedTripID    string
	UserID           string
	MatchedUserID    string
	DestinationName  string
	OverlapStartDate string
	OverlapEndDate   string
	AffinityLevel    string
	AffinityScore    int
	Explanation      string
	Status           string
	CreatedAt        time.Time
	IsNew            bool
}

type MatchNotificationPayload struct {
	MatchID           string
	TripID            string
	MatchedTripID     string
	UserID            string
	MatchedUserID     string
	MatchedUserName   string
	MatchedUserOrigin string
	DestinationName   string
	OverlapStartDate  string
	OverlapEndDate    string
}

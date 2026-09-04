package profile

type Country struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Code string `json:"code"`
}

type Region struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CountryID string `json:"country_id"`
}

type Town struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	RegionID string `json:"region_id"`
}

type OriginHierarchy struct {
	Country Country `json:"country"`
	Region  Region  `json:"region"`
	Town    Town    `json:"town"`
}

type Profile struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Email       string           `json:"email"`
	PhoneNumber *string          `json:"phone_number,omitempty"`
	AvatarURL   *string          `json:"avatar_url,omitempty"`
	Bio         *string          `json:"bio,omitempty"`
	Origin      *OriginHierarchy `json:"origin,omitempty"`
}

type UpdateProfileRequest struct {
	Name        *string `json:"name,omitempty"`
	PhoneNumber *string `json:"phone_number,omitempty"`
	Bio         *string `json:"bio,omitempty"`
}

type UpdateOriginRequest struct {
	TownID string `json:"town_id" binding:"required"`
}

type PublicTripSummary struct {
	ID                 string `json:"id"`
	Title              string `json:"title"`
	DestinationSummary string `json:"destination_summary,omitempty"`
	StartDate          string `json:"start_date"`
	EndDate            string `json:"end_date"`
}

type PublicProfile struct {
	ID            string              `json:"id"`
	Name          string              `json:"name"`
	AvatarURL     *string             `json:"avatar_url"`
	Bio           *string             `json:"bio"`
	OriginSummary *string             `json:"origin_summary,omitempty"`
	PublicTrips   []PublicTripSummary `json:"public_trips"`
}

type TownSearchResult struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	RegionName  *string `json:"region_name,omitempty"`
	CountryName *string `json:"country_name,omitempty"`
	CountryCode *string `json:"country_code,omitempty"`
}

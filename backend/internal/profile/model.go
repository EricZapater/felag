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

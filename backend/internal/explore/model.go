package explore

type ExploreDestinationItem struct {
	ID                   string  `json:"id"`
	Name                 string  `json:"name"`
	RegionName           *string `json:"region_name,omitempty"`
	CountryName          string  `json:"country_name"`
	CountryCode          string  `json:"country_code"`
	FlagEmoji            *string `json:"flag_emoji,omitempty"`
	BannerURL            *string `json:"banner_url,omitempty"`
	TotalRecommendations int     `json:"total_recommendations"`
	ActiveFelagisCount   int     `json:"active_felagis_count"`
	AffinityReason       *string `json:"affinity_reason,omitempty"`
}

type UserOriginInfo struct {
	TownID      *string
	TownName    *string
	RegionID    *string
	RegionName  *string
	CountryID   *string
	CountryName *string
	CountryCode *string
}

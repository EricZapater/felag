package publicseo

type PublicDestinationItem struct {
	ID                 string  `json:"id"`
	Slug               string  `json:"slug"`
	Name               string  `json:"name"`
	RegionName         *string `json:"region_name,omitempty"`
	CountryName        string  `json:"country_name"`
	CountryCode        string  `json:"country_code"`
	FlagEmoji          *string `json:"flag_emoji,omitempty"`
	CoverImageURL      *string `json:"cover_image_url,omitempty"`
	TotalFelagisCount  int     `json:"total_felagis_count"`
	TotalTipsCount     int     `json:"total_tips_count"`
	EndorsementSummary string  `json:"endorsement_summary"`
	UpdatedAtPeriod    string  `json:"updated_at_period"`
}

type PublicDestinationsResponse struct {
	Data       []PublicDestinationItem `json:"data"`
	Pagination PaginationMeta          `json:"pagination"`
}

type PaginationMeta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalItems int `json:"total_items"`
	TotalPages int `json:"total_pages"`
}

type PublicAnonymousTip struct {
	ID                string  `json:"id"`
	Title             string  `json:"title"`
	Description       string  `json:"description"`
	Category          string  `json:"category"` // food, hidden_gem, transport, practical_tip, anecdote
	LocationHint      *string `json:"location_hint,omitempty"`
	PhotoURL          *string `json:"photo_url,omitempty"`
	EndorsementsCount int     `json:"endorsements_count"`
	EndorsementLabel  string  `json:"endorsement_label"`
	Period            string  `json:"period"` // e.g. "2025-06" or "2025"
}

type PublicFaqItem struct {
	Question         string `json:"question"`
	Answer           string `json:"answer"`
	EndorsementLabel string `json:"endorsement_label"`
}

type BreadcrumbItem struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type SeoMetadata struct {
	MetaTitle       string                 `json:"meta_title"`
	MetaDescription string                 `json:"meta_description"`
	Keywords        []string               `json:"keywords"`
	CanonicalURL    string                 `json:"canonical_url"`
	OgTitle         string                 `json:"og_title"`
	OgDescription   string                 `json:"og_description"`
	OgImageURL      string                 `json:"og_image_url"`
	Robots          string                 `json:"robots"` // "index, follow" | "noindex, follow"
	Breadcrumbs     []BreadcrumbItem       `json:"breadcrumbs"`
	JsonLd          map[string]interface{} `json:"json_ld"`
}

type DestinationStats struct {
	TotalFelagis      int `json:"total_felagis"`
	TotalTips         int `json:"total_tips"`
	HiddenGemsCount   int `json:"hidden_gems_count"`
	FoodSpotsCount    int `json:"food_spots_count"`
	PracticalTipsCount int `json:"practical_tips_count"`
}

type CategorizedTips struct {
	Food         []PublicAnonymousTip `json:"food"`
	HiddenGem    []PublicAnonymousTip `json:"hidden_gem"`
	Transport    []PublicAnonymousTip `json:"transport"`
	PracticalTip []PublicAnonymousTip `json:"practical_tip"`
	Anecdote     []PublicAnonymousTip `json:"anecdote"`
}

type PublicDestinationGuide struct {
	Destination        PublicDestinationItem  `json:"destination"`
	Stats              DestinationStats       `json:"stats"`
	Categories         CategorizedTips        `json:"categories"`
	Faqs               []PublicFaqItem        `json:"faqs"`
	RelatedDestinations []PublicDestinationItem `json:"related_destinations"`
	Seo                SeoMetadata            `json:"seo"`
}

type SitemapEntry struct {
	Loc           string  `json:"loc"`
	LastmodPeriod string  `json:"lastmod_period"`
	Changefreq    string  `json:"changefreq"`
	Priority      float64 `json:"priority"`
}

type PublicSitemapResponse struct {
	Total   int            `json:"total"`
	Entries []SitemapEntry `json:"entries"`
}

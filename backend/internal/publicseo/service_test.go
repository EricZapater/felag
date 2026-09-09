package publicseo

import (
	"context"
	"database/sql"
	"testing"
)

type mockRepo struct {
	items []PublicDestinationItem
	tips  []PublicAnonymousTip
}

func (m *mockRepo) ListPublicDestinations(ctx context.Context, q, countryCode, sort string, page, limit int, minTips int) (*PublicDestinationsResponse, error) {
	return &PublicDestinationsResponse{
		Data: m.items,
		Pagination: PaginationMeta{
			Page:       page,
			Limit:      limit,
			TotalItems: len(m.items),
			TotalPages: 1,
		},
	}, nil
}

func (m *mockRepo) GetPublicDestinationBySlugOrID(ctx context.Context, slugOrID string) (*PublicDestinationItem, bool, string, string, error) {
	for _, item := range m.items {
		if item.Slug == slugOrID || item.ID == slugOrID {
			flag := "🇯🇵"
			item.FlagEmoji = &flag
			return &item, true, item.ID, item.CountryCode, nil
		}
	}
	return nil, false, "", "", sql.ErrNoRows
}

func (m *mockRepo) GetPublicRecommendationsForDestination(ctx context.Context, isTown bool, townID, countryCode string) ([]PublicAnonymousTip, error) {
	return m.tips, nil
}

func (m *mockRepo) GetRelatedDestinations(ctx context.Context, countryCode, currentID string, limit int) ([]PublicDestinationItem, error) {
	return []PublicDestinationItem{}, nil
}

func (m *mockRepo) GetPublicSitemapEntries(ctx context.Context) ([]SitemapEntry, error) {
	return []SitemapEntry{
		{Loc: "https://felag.app/destinacions/tokyo-japo", LastmodPeriod: "2025-06", Changefreq: "weekly", Priority: 0.8},
	}, nil
}

func TestPublicSeoService_ListDestinations(t *testing.T) {
	mock := &mockRepo{
		items: []PublicDestinationItem{
			{
				ID:                "town-1",
				Slug:              "tokyo-japo",
				Name:              "Tòquio",
				CountryName:       "Japó",
				CountryCode:       "JP",
				TotalFelagisCount: 5,
				TotalTipsCount:    3,
			},
		},
	}
	svc := NewService(mock)

	res, err := svc.ListPublicDestinations(context.Background(), "", "", "popular", 1, 20, "ca")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Data) != 1 {
		t.Fatalf("expected 1 item, got %d", len(res.Data))
	}
	if res.Data[0].EndorsementSummary != "5 felagis ho avalen" {
		t.Errorf("expected endorsement label '5 felagis ho avalen', got '%s'", res.Data[0].EndorsementSummary)
	}
}

func TestPublicSeoService_GetDestinationGuide_AnonymityAndSeo(t *testing.T) {
	mock := &mockRepo{
		items: []PublicDestinationItem{
			{
				ID:                "town-1",
				Slug:              "tokyo-japo",
				Name:              "Tòquio",
				CountryName:       "Japó",
				CountryCode:       "JP",
				TotalFelagisCount: 12,
				TotalTipsCount:    2,
			},
		},
		tips: []PublicAnonymousTip{
			{
				ID:                "tip-1",
				Title:             "Ramen a Shinjuku",
				Description:       "Molt bon ramen tradicional sense cues si hi aneu a les 19h.",
				Category:          "food",
				EndorsementsCount: 4,
				Period:            "2025-05",
			},
			{
				ID:                "tip-2",
				Title:             "Com moure's amb la targeta Suica",
				Description:       "Instal·leu-la al wallet per no fer cues de bitllets.",
				Category:          "transport",
				EndorsementsCount: 6,
				Period:            "2025-04",
			},
		},
	}
	svc := NewService(mock)

	guide, err := svc.GetPublicDestinationGuide(context.Background(), "tokyo-japo", "ca")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if guide.Destination.Name != "Tòquio" {
		t.Errorf("expected name 'Tòquio', got '%s'", guide.Destination.Name)
	}
	if guide.Stats.TotalTips != 2 {
		t.Errorf("expected 2 tips, got %d", guide.Stats.TotalTips)
	}
	if len(guide.Categories.Food) != 1 {
		t.Errorf("expected 1 food tip, got %d", len(guide.Categories.Food))
	}
	if len(guide.Categories.Transport) != 1 {
		t.Errorf("expected 1 transport tip, got %d", len(guide.Categories.Transport))
	}

	// Verify SEO pack
	if guide.Seo.Robots != "index, follow" {
		t.Errorf("expected robots 'index, follow', got '%s'", guide.Seo.Robots)
	}
	if len(guide.Seo.Keywords) == 0 {
		t.Errorf("expected keywords to be populated")
	}
	if guide.Seo.JsonLd["@type"] != "TouristDestination" {
		t.Errorf("expected JSON-LD TouristDestination, got %v", guide.Seo.JsonLd["@type"])
	}
}

func TestPublicSeoService_Sitemap(t *testing.T) {
	mock := &mockRepo{}
	svc := NewService(mock)

	sitemap, err := svc.GetPublicSitemap(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if sitemap.Total != 1 {
		t.Errorf("expected 1 entry, got %d", sitemap.Total)
	}
}

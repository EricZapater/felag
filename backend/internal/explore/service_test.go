package explore

import (
	"testing"
)

type mockExploreRepo struct {
	origin *UserOriginInfo
	items  []ExploreDestinationItem
}

func (m *mockExploreRepo) GetUserOrigin(userID string) (*UserOriginInfo, error) {
	return m.origin, nil
}

func (m *mockExploreRepo) GetExploreDestinations(origin *UserOriginInfo, limit int) ([]ExploreDestinationItem, error) {
	return m.items, nil
}

func TestGetRecommendations(t *testing.T) {
	tName := "Vic"
	rName := "Catalunya"
	cName := "Espanya"
	cCode := "ES"
	reason := "Molt recomanat per felagis de Vic"

	repo := &mockExploreRepo{
		origin: &UserOriginInfo{
			TownName:    &tName,
			RegionName:  &rName,
			CountryName: &cName,
			CountryCode: &cCode,
		},
		items: []ExploreDestinationItem{
			{
				ID:                   "town-kyoto",
				Name:                 "Kyoto",
				CountryName:          "Japó",
				CountryCode:          "JP",
				TotalRecommendations: 12,
				ActiveFelagisCount:   3,
				AffinityReason:       &reason,
			},
		},
	}

	svc := NewService(repo)
	items, err := svc.GetRecommendations("user-123")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].Name != "Kyoto" {
		t.Errorf("expected Kyoto, got %s", items[0].Name)
	}
	if *items[0].AffinityReason != "Molt recomanat per felagis de Vic" {
		t.Errorf("unexpected affinity reason: %v", *items[0].AffinityReason)
	}
}

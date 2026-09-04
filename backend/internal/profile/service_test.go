package profile

import (
	"errors"
	"testing"
)

type mockProfileRepo struct {
	profiles    map[string]*Profile
	pubProfiles map[string]*PublicProfile
	pubTrips    map[string][]PublicTripSummary
	countries   []Country
	regions     []Region
	towns       []Town
}

func newMockProfileRepo() *mockProfileRepo {
	bio := "Viatgera entusiasta"
	avatar := "https://example.com/avatar.jpg"
	return &mockProfileRepo{
		profiles: map[string]*Profile{
			"u1": {
				ID:        "u1",
				Name:      "Mireia Masnou",
				Email:     "mireia@example.com",
				AvatarURL: &avatar,
				Bio:       &bio,
			},
		},
		pubProfiles: map[string]*PublicProfile{
			"u1": {
				ID:        "u1",
				Name:      "Mireia Masnou",
				AvatarURL: &avatar,
				Bio:       &bio,
			},
		},
		pubTrips: map[string][]PublicTripSummary{
			"u1": {
				{
					ID:                 "trip-1",
					Title:              "Escandinàvia d'hivern",
					DestinationSummary: "Estocolm, Suècia",
					StartDate:          "2026-10-10",
					EndDate:            "2026-10-18",
				},
			},
		},
	}
}

func (m *mockProfileRepo) GetProfile(userID string) (*Profile, error) {
	return m.profiles[userID], nil
}

func (m *mockProfileRepo) UpdateProfile(userID string, name, phoneNumber, bio *string) error {
	p := m.profiles[userID]
	if p != nil {
		if name != nil {
			p.Name = *name
		}
		if bio != nil {
			p.Bio = bio
		}
	}
	return nil
}

func (m *mockProfileRepo) UpdateAvatar(userID string, avatarURL string) error {
	p := m.profiles[userID]
	if p != nil {
		p.AvatarURL = &avatarURL
	}
	return nil
}

func (m *mockProfileRepo) UpdateOrigin(userID, townID string) error {
	return nil
}

func (m *mockProfileRepo) GetCountries() ([]Country, error) {
	return m.countries, nil
}

func (m *mockProfileRepo) GetRegionsByCountry(countryID string) ([]Region, error) {
	return m.regions, nil
}

func (m *mockProfileRepo) GetTownsByRegion(regionID string) ([]Town, error) {
	return m.towns, nil
}

func (m *mockProfileRepo) SearchTowns(q string, limit int) ([]TownSearchResult, error) {
	reg := "Maresme"
	cName := "Catalunya"
	cCode := "ES"
	return []TownSearchResult{
		{
			ID:          "t1",
			Name:        "El Masnou",
			RegionName:  &reg,
			CountryName: &cName,
			CountryCode: &cCode,
		},
	}, nil
}

func (m *mockProfileRepo) GetPublicProfile(userID string) (*PublicProfile, error) {
	return m.pubProfiles[userID], nil
}

func (m *mockProfileRepo) GetPublicTrips(userID string) ([]PublicTripSummary, error) {
	return m.pubTrips[userID], nil
}

type mockModChecker struct {
	blockedPairs map[string]bool
}

func (mc *mockModChecker) IsBlocked(userA, userB string) (bool, error) {
	if mc.blockedPairs[userA+":"+userB] || mc.blockedPairs[userB+":"+userA] {
		return true, nil
	}
	return false, nil
}

func TestProfileService_GetPublicProfile(t *testing.T) {
	repo := newMockProfileRepo()
	mod := &mockModChecker{blockedPairs: make(map[string]bool)}
	svc := NewService(repo)
	svc.SetModerationService(mod)

	// Happy path
	p, err := svc.GetPublicProfile("u2", "u1")
	if err != nil {
		t.Fatalf("unexpected error getting public profile: %v", err)
	}
	if p.Name != "Mireia Masnou" {
		t.Errorf("expected name 'Mireia Masnou', got '%s'", p.Name)
	}
	if len(p.PublicTrips) != 1 || p.PublicTrips[0].Title != "Escandinàvia d'hivern" {
		t.Errorf("expected 1 public trip, got %+v", p.PublicTrips)
	}

	// Blocked path
	mod.blockedPairs["u1:u2"] = true
	_, err = svc.GetPublicProfile("u2", "u1")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}

	// Not found path
	_, err = svc.GetPublicProfile("u2", "u-not-found")
	if !errors.Is(err, ErrProfileNotFound) {
		t.Fatalf("expected ErrProfileNotFound, got %v", err)
	}
}

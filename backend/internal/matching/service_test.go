package matching

import (
	"fmt"
	"testing"
	"time"
)

type mockMatchingRepo struct {
	userOrigins     map[string]*UserOriginInfo
	tripStages      map[string][]TripStageRecord
	candidateStages map[string][]CandidateTripStage
	matches         map[string]*Match
	upsertedMatches []MatchRecord
}

func (m *mockMatchingRepo) GetTripMatches(tripID string) ([]Match, error) {
	var result []Match
	for _, match := range m.matches {
		if match.TripID == tripID {
			result = append(result, *match)
		}
	}
	return result, nil
}

func (m *mockMatchingRepo) GetMatchByID(matchID string) (*Match, error) {
	match, ok := m.matches[matchID]
	if !ok {
		return nil, nil
	}
	return match, nil
}

func (m *mockMatchingRepo) GetUserOrigin(userID string) (*UserOriginInfo, error) {
	origin, ok := m.userOrigins[userID]
	if !ok {
		return nil, nil
	}
	return origin, nil
}

func (m *mockMatchingRepo) GetTripStages(tripID string) ([]TripStageRecord, error) {
	stages, ok := m.tripStages[tripID]
	if !ok {
		return nil, nil
	}
	return stages, nil
}

func (m *mockMatchingRepo) FindCandidateStages(tripID, currentUserID, destinationName, startDate, endDate string) ([]CandidateTripStage, error) {
	key := fmt.Sprintf("%s:%s", tripID, destinationName)
	return m.candidateStages[key], nil
}

func (m *mockMatchingRepo) UpsertMatch(rec *MatchRecord) (bool, string, error) {
	m.upsertedMatches = append(m.upsertedMatches, *rec)
	id := fmt.Sprintf("match-%s-%s", rec.TripID, rec.MatchedTripID)
	rec.ID = id
	rec.CreatedAt = time.Now()
	return true, id, nil
}

func strPtr(s string) *string {
	return &s
}

func TestCalculateAffinity(t *testing.T) {
	tests := []struct {
		name          string
		owner         *UserOriginInfo
		cand          CandidateTripStage
		expectedLevel string
		expectedScore int
		expectedExpl  string
	}{
		{
			name: "Same Town Match",
			owner: &UserOriginInfo{
				UserID:      "u1",
				UserName:    "Mireia",
				TownID:      strPtr("town-vic"),
				TownName:    strPtr("Vic"),
				RegionID:    strPtr("reg-cat"),
				RegionName:  strPtr("Catalunya"),
				CountryID:   strPtr("ctry-es"),
				CountryName: strPtr("Espanya"),
			},
			cand: CandidateTripStage{
				UserID:      "u2",
				UserName:    "Jordi",
				TownID:      strPtr("town-vic"),
				TownName:    strPtr("Vic"),
				RegionID:    strPtr("reg-cat"),
				RegionName:  strPtr("Catalunya"),
				CountryID:   strPtr("ctry-es"),
				CountryName: strPtr("Espanya"),
			},
			expectedLevel: "town",
			expectedScore: 100,
			expectedExpl:  "Tots dos sou de Vic (Catalunya)!",
		},
		{
			name: "Same Region Match",
			owner: &UserOriginInfo{
				UserID:      "u1",
				UserName:    "Mireia",
				TownID:      strPtr("town-vic"),
				TownName:    strPtr("Vic"),
				RegionID:    strPtr("reg-cat"),
				RegionName:  strPtr("Catalunya"),
				CountryID:   strPtr("ctry-es"),
				CountryName: strPtr("Espanya"),
			},
			cand: CandidateTripStage{
				UserID:      "u2",
				UserName:    "Arnau",
				TownID:      strPtr("town-bcn"),
				TownName:    strPtr("Barcelona"),
				RegionID:    strPtr("reg-cat"),
				RegionName:  strPtr("Catalunya"),
				CountryID:   strPtr("ctry-es"),
				CountryName: strPtr("Espanya"),
			},
			expectedLevel: "region",
			expectedScore: 75,
			expectedExpl:  "Tots dos sou de Catalunya!",
		},
		{
			name: "Same Country Match",
			owner: &UserOriginInfo{
				UserID:      "u1",
				UserName:    "Mireia",
				TownID:      strPtr("town-vic"),
				TownName:    strPtr("Vic"),
				RegionID:    strPtr("reg-cat"),
				RegionName:  strPtr("Catalunya"),
				CountryID:   strPtr("ctry-es"),
				CountryName: strPtr("Espanya"),
			},
			cand: CandidateTripStage{
				UserID:      "u2",
				UserName:    "Carles",
				TownID:      strPtr("town-vlc"),
				TownName:    strPtr("València"),
				RegionID:    strPtr("reg-val"),
				RegionName:  strPtr("Comunitat Valenciana"),
				CountryID:   strPtr("ctry-es"),
				CountryName: strPtr("Espanya"),
			},
			expectedLevel: "country",
			expectedScore: 50,
			expectedExpl:  "Tots dos sou de Espanya!",
		},
		{
			name: "Different Countries (No Affinity)",
			owner: &UserOriginInfo{
				UserID:      "u1",
				UserName:    "Mireia",
				TownID:      strPtr("town-vic"),
				TownName:    strPtr("Vic"),
				RegionID:    strPtr("reg-cat"),
				RegionName:  strPtr("Catalunya"),
				CountryID:   strPtr("ctry-es"),
				CountryName: strPtr("Espanya"),
			},
			cand: CandidateTripStage{
				UserID:      "u2",
				UserName:    "Pierre",
				TownID:      strPtr("town-paris"),
				TownName:    strPtr("París"),
				RegionID:    strPtr("reg-idf"),
				RegionName:  strPtr("Île-de-France"),
				CountryID:   strPtr("ctry-fr"),
				CountryName: strPtr("França"),
			},
			expectedLevel: "",
			expectedScore: 0,
			expectedExpl:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			level, score, expl1, _ := calculateAffinity(tt.owner, tt.cand)
			if level != tt.expectedLevel {
				t.Errorf("expected level %s, got %s", tt.expectedLevel, level)
			}
			if score != tt.expectedScore {
				t.Errorf("expected score %d, got %d", tt.expectedScore, score)
			}
			if expl1 != tt.expectedExpl {
				t.Errorf("expected explanation %s, got %s", tt.expectedExpl, expl1)
			}
		})
	}
}

func TestCalculateMatchesForTrip(t *testing.T) {
	repo := &mockMatchingRepo{
		userOrigins: map[string]*UserOriginInfo{
			"u1": {
				UserID:      "u1",
				UserName:    "Mireia",
				TownID:      strPtr("town-vic"),
				TownName:    strPtr("Vic"),
				RegionID:    strPtr("reg-cat"),
				RegionName:  strPtr("Catalunya"),
				CountryID:   strPtr("ctry-es"),
				CountryName: strPtr("Espanya"),
			},
		},
		tripStages: map[string][]TripStageRecord{
			"trip-1": {
				{
					TripID:          "trip-1",
					UserID:          "u1",
					DestinationName: "Estocolm",
					StartDate:       "2026-10-10",
					EndDate:         "2026-10-18",
					Visibility:      "public",
				},
			},
		},
		candidateStages: map[string][]CandidateTripStage{
			"trip-1:Estocolm": {
				{
					TripID:          "trip-2",
					UserID:          "u2",
					DestinationName: "Estocolm",
					StartDate:       "2026-10-12",
					EndDate:         "2026-10-16",
					UserName:        "Jordi",
					TownID:          strPtr("town-vic"),
					TownName:        strPtr("Vic"),
					RegionID:        strPtr("reg-cat"),
					RegionName:      strPtr("Catalunya"),
					CountryID:       strPtr("ctry-es"),
					CountryName:     strPtr("Espanya"),
				},
			},
		},
		matches: make(map[string]*Match),
	}

	svc := NewService(repo)
	notifications, err := svc.CalculateMatchesForTrip("trip-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(notifications) != 2 {
		t.Fatalf("expected 2 notifications (1 for owner, 1 for candidate), got %d", len(notifications))
	}

	// Verify notification 1 (for owner u1)
	n1 := notifications[0]
	if n1.UserID != "u1" || n1.DestinationName != "Estocolm" || n1.OverlapStartDate != "2026-10-12" || n1.OverlapEndDate != "2026-10-16" {
		t.Errorf("unexpected notification 1 payload: %+v", n1)
	}

	// Verify notification 2 (for candidate u2)
	n2 := notifications[1]
	if n2.UserID != "u2" || n2.DestinationName != "Estocolm" || n2.OverlapStartDate != "2026-10-12" || n2.OverlapEndDate != "2026-10-16" {
		t.Errorf("unexpected notification 2 payload: %+v", n2)
	}

	if len(repo.upsertedMatches) != 2 {
		t.Errorf("expected 2 upserted matches, got %d", len(repo.upsertedMatches))
	}
}

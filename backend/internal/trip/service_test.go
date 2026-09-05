package trip

import (
	"errors"
	"testing"
	"time"
)

type mockRepository struct {
	trips          map[string]*Trip
	companions     map[string][]TripCompanion
	createFn       func(trip *Trip, stages []TripStage, companionUserIDs []string) (*Trip, error)
	getByIDFn      func(tripID, currentUserID string) (*Trip, error)
	listByFn       func(userID string, filter string) ([]Trip, error)
	updateFn       func(tripID, userID string, update *Trip, stages *[]TripStage, companionUserIDs *[]string) (*Trip, error)
	deleteFn       func(tripID, userID string) error
	updatePhotoFn  func(tripID, userID string, mode string) error
	listCompFn     func(tripID string) ([]TripCompanion, error)
	addCompFn      func(tripID, userID, role string) (*TripCompanion, error)
	removeCompFn   func(tripID, userID string) error
	searchUsersFn  func(query, excludeUserID string) ([]FelagiUserSummary, error)
	isTripMemberFn func(tripID, userID string) (bool, bool, error)
}

func (m *mockRepository) Create(trip *Trip, stages []TripStage, companionUserIDs []string) (*Trip, error) {
	if m.createFn != nil {
		return m.createFn(trip, stages, companionUserIDs)
	}
	trip.ID = "test-trip-id"
	trip.Stages = stages
	trip.IsOwner = true
	trip.CreatedAt = time.Now()
	trip.UpdatedAt = time.Now()
	trip.Companions = []TripCompanion{
		{ID: "owner-comp-id", TripID: trip.ID, UserID: trip.UserID, Role: "owner", Status: "accepted", Name: "Owner"},
	}
	for _, cID := range companionUserIDs {
		trip.Companions = append(trip.Companions, TripCompanion{
			ID: "comp-" + cID, TripID: trip.ID, UserID: cID, Role: "companion", Status: "accepted", Name: "Companion " + cID,
		})
	}
	return trip, nil
}

func (m *mockRepository) GetByID(tripID, currentUserID string) (*Trip, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(tripID, currentUserID)
	}
	t, ok := m.trips[tripID]
	if !ok {
		return nil, nil
	}
	t.IsOwner = (t.UserID == currentUserID)
	return t, nil
}

func (m *mockRepository) ListByUserID(userID string, filter string) ([]Trip, error) {
	if m.listByFn != nil {
		return m.listByFn(userID, filter)
	}
	var res []Trip
	for _, t := range m.trips {
		isComp := false
		for _, c := range m.companions[t.ID] {
			if c.UserID == userID {
				isComp = true
				break
			}
		}
		if t.UserID == userID || isComp {
			res = append(res, *t)
		}
	}
	return res, nil
}

func (m *mockRepository) Update(tripID, userID string, update *Trip, stages *[]TripStage, companionUserIDs *[]string) (*Trip, error) {
	if m.updateFn != nil {
		return m.updateFn(tripID, userID, update, stages, companionUserIDs)
	}
	t, ok := m.trips[tripID]
	if !ok || t.UserID != userID {
		return nil, nil
	}
	if update.Title != "" {
		t.Title = update.Title
	}
	if update.StartDate != "" {
		t.StartDate = update.StartDate
	}
	if update.EndDate != "" {
		t.EndDate = update.EndDate
	}
	if update.PhotoSharingMode != "" {
		t.PhotoSharingMode = update.PhotoSharingMode
	}
	if stages != nil {
		t.Stages = *stages
	}
	return t, nil
}

func (m *mockRepository) Delete(tripID, userID string) error {
	if m.deleteFn != nil {
		return m.deleteFn(tripID, userID)
	}
	t, ok := m.trips[tripID]
	if !ok || t.UserID != userID {
		return ErrTripNotFound
	}
	delete(m.trips, tripID)
	return nil
}

func (m *mockRepository) UpdatePhotoSharingMode(tripID, userID string, mode string) error {
	if m.updatePhotoFn != nil {
		return m.updatePhotoFn(tripID, userID, mode)
	}
	t, ok := m.trips[tripID]
	if !ok || t.UserID != userID {
		return ErrTripNotFound
	}
	t.PhotoSharingMode = mode
	return nil
}

func (m *mockRepository) ListCompanions(tripID string) ([]TripCompanion, error) {
	if m.listCompFn != nil {
		return m.listCompFn(tripID)
	}
	return m.companions[tripID], nil
}

func (m *mockRepository) AddCompanion(tripID, userID, role string) (*TripCompanion, error) {
	if m.addCompFn != nil {
		return m.addCompFn(tripID, userID, role)
	}
	tc := TripCompanion{
		ID:        "comp-" + userID,
		TripID:    tripID,
		UserID:    userID,
		Role:      role,
		Status:    "accepted",
		Name:      "Test Companion",
		CreatedAt: time.Now(),
	}
	m.companions[tripID] = append(m.companions[tripID], tc)
	return &tc, nil
}

func (m *mockRepository) RemoveCompanion(tripID, userID string) error {
	if m.removeCompFn != nil {
		return m.removeCompFn(tripID, userID)
	}
	comps := m.companions[tripID]
	newComps := make([]TripCompanion, 0)
	for _, c := range comps {
		if c.UserID != userID {
			newComps = append(newComps, c)
		}
	}
	m.companions[tripID] = newComps
	return nil
}

func (m *mockRepository) SearchUsers(query, excludeUserID string) ([]FelagiUserSummary, error) {
	if m.searchUsersFn != nil {
		return m.searchUsersFn(query, excludeUserID)
	}
	return []FelagiUserSummary{
		{ID: "user-2", Name: "Joan Martí"},
	}, nil
}

func (m *mockRepository) IsTripMember(tripID, userID string) (bool, bool, error) {
	if m.isTripMemberFn != nil {
		return m.isTripMemberFn(tripID, userID)
	}
	t, ok := m.trips[tripID]
	if !ok {
		return false, false, nil
	}
	if t.UserID == userID {
		return true, true, nil
	}
	for _, c := range m.companions[tripID] {
		if c.UserID == userID {
			return true, false, nil
		}
	}
	return false, false, nil
}

func TestCreateTripValidation(t *testing.T) {
	repo := &mockRepository{
		trips:      make(map[string]*Trip),
		companions: make(map[string][]TripCompanion),
	}
	svc := NewService(repo)

	// Test empty title
	_, err := svc.CreateTrip("user-1", CreateTripRequest{
		Title:     "",
		StartDate: "2026-10-10",
		EndDate:   "2026-10-20",
		Stages: []TripStageInput{
			{StageOrder: 1, DestinationName: "Oslo", StartDate: "2026-10-10", EndDate: "2026-10-15"},
		},
	})
	if err == nil {
		t.Errorf("expected error for empty title, got nil")
	}

	// Test invalid trip dates (start > end)
	_, err = svc.CreateTrip("user-1", CreateTripRequest{
		Title:     "Viatge Test",
		StartDate: "2026-10-25",
		EndDate:   "2026-10-10",
		Stages: []TripStageInput{
			{StageOrder: 1, DestinationName: "Oslo", StartDate: "2026-10-25", EndDate: "2026-10-25"},
		},
	})
	if err == nil {
		t.Errorf("expected error for start date after end date, got nil")
	}

	// Test no stages
	_, err = svc.CreateTrip("user-1", CreateTripRequest{
		Title:     "Viatge Sense Etapes",
		StartDate: "2026-10-10",
		EndDate:   "2026-10-20",
		Stages:    []TripStageInput{},
	})
	if err == nil {
		t.Errorf("expected error for empty stages, got nil")
	}

	// Test stage date out of trip range
	_, err = svc.CreateTrip("user-1", CreateTripRequest{
		Title:     "Viatge Etapa Fora de Rang",
		StartDate: "2026-10-10",
		EndDate:   "2026-10-20",
		Stages: []TripStageInput{
			{StageOrder: 1, DestinationName: "Oslo", StartDate: "2026-10-08", EndDate: "2026-10-15"},
		},
	})
	if err == nil {
		t.Errorf("expected error for stage start before trip start, got nil")
	}

	// Test stage start > stage end
	_, err = svc.CreateTrip("user-1", CreateTripRequest{
		Title:     "Viatge Etapa Inversa",
		StartDate: "2026-10-10",
		EndDate:   "2026-10-20",
		Stages: []TripStageInput{
			{StageOrder: 1, DestinationName: "Oslo", StartDate: "2026-10-16", EndDate: "2026-10-12"},
		},
	})
	if err == nil {
		t.Errorf("expected error for stage start after stage end, got nil")
	}

	// Test valid creation with town_id and photo_sharing_mode and companion
	townID := "5a236619-1683-502f-b53d-4096336c35ab"
	psm := "all_felagis"
	compIDs := []string{"user-2"}
	created, err := svc.CreateTrip("user-1", CreateTripRequest{
		Title:            "Ruta Escandinava",
		StartDate:        "2026-10-10",
		EndDate:          "2026-10-20",
		Visibility:       "public",
		PhotoSharingMode: &psm,
		CompanionUserIDs: &compIDs,
		Stages: []TripStageInput{
			{StageOrder: 1, DestinationName: "Oslo", TownID: &townID, StartDate: "2026-10-10", EndDate: "2026-10-15"},
			{StageOrder: 2, DestinationName: "Bergen", StartDate: "2026-10-15", EndDate: "2026-10-20"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error on valid creation: %v", err)
	}
	if created.Title != "Ruta Escandinava" || len(created.Stages) != 2 {
		t.Errorf("unexpected trip data: %+v", created)
	}
	if created.PhotoSharingMode != "all_felagis" {
		t.Errorf("expected photo sharing mode all_felagis, got %s", created.PhotoSharingMode)
	}
	if created.Stages[0].TownID == nil || *created.Stages[0].TownID != townID {
		t.Errorf("expected townID %s, got %v", townID, created.Stages[0].TownID)
	}
	if len(created.Companions) < 2 {
		t.Errorf("expected at least 2 companions (owner + companion), got %d", len(created.Companions))
	}
}

func TestGetTripPrivacy(t *testing.T) {
	repo := &mockRepository{
		trips: map[string]*Trip{
			"trip-public": {
				ID:         "trip-public",
				UserID:     "user-1",
				Title:      "Public Trip",
				Visibility: "public",
			},
			"trip-private": {
				ID:         "trip-private",
				UserID:     "user-1",
				Title:      "Private Trip",
				Visibility: "private",
				Companions: []TripCompanion{
					{UserID: "user-companion"},
				},
			},
		},
		companions: make(map[string][]TripCompanion),
	}
	svc := NewService(repo)

	// Owner accessing private trip -> OK
	trip, err := svc.GetTripByID("trip-private", "user-1")
	if err != nil {
		t.Fatalf("unexpected error for owner accessing private trip: %v", err)
	}
	if trip.ID != "trip-private" {
		t.Errorf("expected trip-private, got %s", trip.ID)
	}

	// Companion accessing private trip -> OK
	trip, err = svc.GetTripByID("trip-private", "user-companion")
	if err != nil {
		t.Fatalf("unexpected error for companion accessing private trip: %v", err)
	}
	if trip.ID != "trip-private" {
		t.Errorf("expected trip-private, got %s", trip.ID)
	}

	// Non-owner non-companion accessing private trip -> ErrTripNotFound
	_, err = svc.GetTripByID("trip-private", "user-other")
	if !errors.Is(err, ErrTripNotFound) {
		t.Errorf("expected ErrTripNotFound for other user accessing private trip, got %v", err)
	}

	// Non-owner accessing public trip -> OK
	trip, err = svc.GetTripByID("trip-public", "user-other")
	if err != nil {
		t.Fatalf("unexpected error for user accessing public trip: %v", err)
	}
	if trip.ID != "trip-public" {
		t.Errorf("expected trip-public, got %s", trip.ID)
	}
}

func TestAddAndRemoveCompanions(t *testing.T) {
	repo := &mockRepository{
		trips: map[string]*Trip{
			"trip-1": {
				ID:         "trip-1",
				UserID:     "user-1",
				Title:      "Viatge Compartit",
				Visibility: "public",
			},
		},
		companions: map[string][]TripCompanion{
			"trip-1": {
				{ID: "comp-owner", TripID: "trip-1", UserID: "user-1", Role: "owner", Status: "accepted"},
			},
		},
	}
	svc := NewService(repo)

	// Owner adds companion -> OK
	tc, err := svc.AddCompanion("trip-1", "user-1", "user-2")
	if err != nil {
		t.Fatalf("unexpected error adding companion: %v", err)
	}
	if tc.UserID != "user-2" {
		t.Errorf("expected added user-2, got %s", tc.UserID)
	}

	// Non-owner tries to add companion -> ErrUnauthorized
	_, err = svc.AddCompanion("trip-1", "user-3", "user-4")
	if !errors.Is(err, ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized when non-owner adds companion, got %v", err)
	}

	// Companion leaves trip -> OK
	err = svc.RemoveCompanion("trip-1", "user-2", "user-2")
	if err != nil {
		t.Fatalf("unexpected error when companion leaves trip: %v", err)
	}
}

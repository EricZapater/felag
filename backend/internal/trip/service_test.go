package trip

import (
	"errors"
	"testing"
	"time"
)

type mockRepository struct {
	trips     map[string]*Trip
	createFn  func(trip *Trip, stages []TripStage) (*Trip, error)
	getByIDFn func(tripID string) (*Trip, error)
	listByFn  func(userID string, filter string) ([]Trip, error)
	updateFn  func(tripID, userID string, update *Trip, stages *[]TripStage) (*Trip, error)
	deleteFn  func(tripID, userID string) error
}

func (m *mockRepository) Create(trip *Trip, stages []TripStage) (*Trip, error) {
	if m.createFn != nil {
		return m.createFn(trip, stages)
	}
	trip.ID = "test-trip-id"
	trip.Stages = stages
	trip.CreatedAt = time.Now()
	trip.UpdatedAt = time.Now()
	return trip, nil
}

func (m *mockRepository) GetByID(tripID string) (*Trip, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(tripID)
	}
	t, ok := m.trips[tripID]
	if !ok {
		return nil, nil
	}
	return t, nil
}

func (m *mockRepository) ListByUserID(userID string, filter string) ([]Trip, error) {
	if m.listByFn != nil {
		return m.listByFn(userID, filter)
	}
	var res []Trip
	for _, t := range m.trips {
		if t.UserID == userID {
			res = append(res, *t)
		}
	}
	return res, nil
}

func (m *mockRepository) Update(tripID, userID string, update *Trip, stages *[]TripStage) (*Trip, error) {
	if m.updateFn != nil {
		return m.updateFn(tripID, userID, update, stages)
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

func TestCreateTripValidation(t *testing.T) {
	repo := &mockRepository{trips: make(map[string]*Trip)}
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

	// Test valid creation
	created, err := svc.CreateTrip("user-1", CreateTripRequest{
		Title:      "Ruta Escandinava",
		StartDate:  "2026-10-10",
		EndDate:    "2026-10-20",
		Visibility: "public",
		Stages: []TripStageInput{
			{StageOrder: 1, DestinationName: "Oslo", StartDate: "2026-10-10", EndDate: "2026-10-15"},
			{StageOrder: 2, DestinationName: "Bergen", StartDate: "2026-10-15", EndDate: "2026-10-20"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error on valid creation: %v", err)
	}
	if created.Title != "Ruta Escandinava" || len(created.Stages) != 2 {
		t.Errorf("unexpected trip data: %+v", created)
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
			},
		},
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

	// Non-owner accessing private trip -> ErrTripNotFound
	_, err = svc.GetTripByID("trip-private", "user-2")
	if !errors.Is(err, ErrTripNotFound) {
		t.Errorf("expected ErrTripNotFound for other user accessing private trip, got %v", err)
	}

	// Non-owner accessing public trip -> OK
	trip, err = svc.GetTripByID("trip-public", "user-2")
	if err != nil {
		t.Fatalf("unexpected error for user accessing public trip: %v", err)
	}
	if trip.ID != "trip-public" {
		t.Errorf("expected trip-public, got %s", trip.ID)
	}
}

func TestUpdateTrip(t *testing.T) {
	repo := &mockRepository{
		trips: map[string]*Trip{
			"trip-1": {
				ID:         "trip-1",
				UserID:     "user-1",
				Title:      "Original Title",
				StartDate:  "2026-10-10",
				EndDate:    "2026-10-20",
				Visibility: "public",
				Stages: []TripStage{
					{StageOrder: 1, DestinationName: "Oslo", StartDate: "2026-10-10", EndDate: "2026-10-20"},
				},
			},
		},
	}
	svc := NewService(repo)

	// Non-owner updating trip -> ErrTripNotFound
	newTitle := "Updated Title"
	_, err := svc.UpdateTrip("trip-1", "user-2", UpdateTripRequest{Title: &newTitle})
	if !errors.Is(err, ErrTripNotFound) {
		t.Errorf("expected ErrTripNotFound for non-owner update, got %v", err)
	}

	// Owner updating title -> OK
	updated, err := svc.UpdateTrip("trip-1", "user-1", UpdateTripRequest{Title: &newTitle})
	if err != nil {
		t.Fatalf("unexpected error updating trip: %v", err)
	}
	if updated.Title != "Updated Title" {
		t.Errorf("expected title Updated Title, got %s", updated.Title)
	}
}

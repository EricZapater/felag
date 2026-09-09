package places

import (
	"context"
	"testing"
)

type mockRepository struct {
	places      map[string]*Place
	externalLogs []*ExternalAPILog
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		places:      make(map[string]*Place),
		externalLogs: make([]*ExternalAPILog, 0),
	}
}

func (m *mockRepository) GetByGooglePlaceID(ctx context.Context, googlePlaceID string) (*Place, error) {
	return m.places[googlePlaceID], nil
}

func (m *mockRepository) GetByID(ctx context.Context, id string) (*Place, error) {
	for _, p := range m.places {
		if p.ID == id {
			return p, nil
		}
	}
	return nil, nil
}

func (m *mockRepository) UpsertPlace(ctx context.Context, p *Place) (*Place, error) {
	if p.ID == "" {
		p.ID = "test-uuid-" + p.GooglePlaceID
	}
	m.places[p.GooglePlaceID] = p
	return p, nil
}

func (m *mockRepository) SearchLocalPlaces(ctx context.Context, query string, limit int) ([]Place, error) {
	var results []Place
	for _, p := range m.places {
		results = append(results, *p)
	}
	return results, nil
}

func (m *mockRepository) LogAPICall(ctx context.Context, log *ExternalAPILog) error {
	m.externalLogs = append(m.externalLogs, log)
	return nil
}

func (m *mockRepository) GetUsageKPIs(ctx context.Context) (*GooglePlacesUsageKPI, error) {
	return &GooglePlacesUsageKPI{
		TotalCallsCount:   len(m.externalLogs),
		TotalPlacesCached: len(m.places),
	}, nil
}

func TestResolvePlaceCached(t *testing.T) {
	repo := newMockRepository()
	client := NewGooglePlacesClient()
	svc := NewService(repo, client)

	ctx := context.Background()

	// Pre-populate cache
	p := &Place{
		ID:            "uuid-123",
		GooglePlaceID: "ChIJF7sC3P_trw0RA4",
		Name:          "Marrakech",
		CountryCode:   "MA",
		CountryName:   "Morocco",
		Latitude:      31.6294723,
		Longitude:     -7.9810845,
	}
	_, _ = repo.UpsertPlace(ctx, p)

	// Resolve place
	resolved, err := svc.ResolvePlace(ctx, "ChIJF7sC3P_trw0RA4", "ca")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if resolved.Name != "Marrakech" {
		t.Fatalf("expected Marrakech, got: %s", resolved.Name)
	}
	if len(repo.externalLogs) != 1 || !repo.externalLogs[0].Cached {
		t.Fatalf("expected 1 cached log entry, got: %+v", repo.externalLogs)
	}
}

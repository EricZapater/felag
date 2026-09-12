package community

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

type mockCommunityRepo struct {
	destinations    map[string]*DestinationInfo
	recs            map[string]*Recommendation
	comments        map[string][]Comment
	votes           map[string]map[string]bool
	userActiveTrips map[string]string // "userID:destID" -> tripID
	liveMoments     map[string][]LiveMoment
	reports         []CommunityReportRequest
	publicTrips     map[string][]PublicTripSummary
}

func newMockCommunityRepo() *mockCommunityRepo {
	tokyoTown := &DestinationInfo{
		IsTown:      true,
		TownID:      "town-tokyo",
		TownName:    "Tokyo",
		RegionID:    "reg-kanto",
		RegionName:  "Kanto",
		CountryCode: "JP",
		CountryName: "Japan",
	}

	japanCountry := &DestinationInfo{
		IsTown:      false,
		CountryCode: "JP",
		CountryName: "Japan",
	}

	townName := "Girona"
	return &mockCommunityRepo{
		destinations: map[string]*DestinationInfo{
			"town-tokyo": tokyoTown,
			"JP":         japanCountry,
		},
		recs:            make(map[string]*Recommendation),
		comments:        make(map[string][]Comment),
		votes:           make(map[string]map[string]bool),
		userActiveTrips: make(map[string]string),
		liveMoments:     make(map[string][]LiveMoment),
		reports:         make([]CommunityReportRequest, 0),
		publicTrips: map[string][]PublicTripSummary{
			"town-tokyo": {
				{
					ID:              "trip-1",
					Title:           "Ruta de tardor pel Japó",
					StartDate:       "2026-09-01",
					EndDate:         "2026-09-07",
					TotalDays:       7,
					FormattedPeriod: "Setembre 2026 • 7 dies",
					Author: PublicAuthorSummary{
						ID:             "user-1",
						AnonymousTitle: "Un felagi de Girona",
						TownName:       &townName,
					},
					CompanionsCount: 1,
					Stages: []PublicTripStage{
						{
							ID:              "stage-1",
							DestinationName: "Tokyo",
							StartDate:       "2026-09-01",
							EndDate:         "2026-09-07",
						},
					},
					Photos: []PublicTripPhoto{
						{
							ID:         "photo-1",
							ImageURL:   "https://r2.felag.app/photos/tokyo1.jpg",
							IsFeatured: true,
						},
					},
				},
			},
		},
	}
}

func (m *mockCommunityRepo) SearchDestinations(q string, limit int) ([]DestinationSummary, error) {
	var list []DestinationSummary
	for _, d := range m.destinations {
		if d.IsTown {
			rName := d.RegionName
			cName := d.CountryName
			cCode := d.CountryCode
			list = append(list, DestinationSummary{
				ID:                   d.TownID,
				Name:                 d.TownName,
				RegionName:           &rName,
				CountryName:          &cName,
				CountryCode:          &cCode,
				Type:                 "town",
				RecommendationsCount: len(m.recs),
				ActiveFelagisCount:   1,
				PublicTripsCount:     len(m.publicTrips[d.TownID]),
				TotalTravelersCount:  5,
			})
		}
	}
	return list, nil
}

func (m *mockCommunityRepo) ResolveDestination(destID string) (*DestinationInfo, error) {
	d, ok := m.destinations[destID]
	if !ok {
		return nil, nil
	}
	return d, nil
}

func (m *mockCommunityRepo) GetDestinationStats(info *DestinationInfo, currentUserID string) (*DestinationDetail, error) {
	flag := "🇯🇵"
	reg := info.RegionName
	return &DestinationDetail{
		ID:                   info.TownID,
		Name:                 info.TownName,
		RegionName:           &reg,
		CountryName:          info.CountryName,
		CountryCode:          info.CountryCode,
		FlagEmoji:            &flag,
		TotalRecommendations: len(m.recs),
		ActiveFelagisCount:   2,
		TotalVisitorsCount:   10,
		PublicTripsCount:     len(m.publicTrips[info.TownID]),
		TotalTravelersCount:  10,
		UserIsTravellingNow:  currentUserID != "",
		UserPhotoSharingMode: "all_felagis",
	}, nil
}

func (m *mockCommunityRepo) ListPublicTripsByDestination(info *DestinationInfo, limit, offset int) ([]PublicTripSummary, error) {
	key := info.TownID
	if !info.IsTown {
		key = info.CountryCode
	}
	trips := m.publicTrips[key]
	if trips == nil {
		return []PublicTripSummary{}, nil
	}
	return trips, nil
}

func (m *mockCommunityRepo) ListRecommendations(info *DestinationInfo, category string, originFilter string, sort string, currentUserID string) ([]Recommendation, error) {
	var list []Recommendation
	for _, r := range m.recs {
		if category != "all" && r.Category != category {
			continue
		}
		list = append(list, *r)
	}
	return list, nil
}

func (m *mockCommunityRepo) CreateRecommendation(destID string, info *DestinationInfo, userID string, req CreateRecommendationRequest) (*Recommendation, error) {
	id := "rec-1"
	rec := &Recommendation{
		ID:               id,
		DestinationID:    destID,
		Category:         req.Category,
		Title:            req.Title,
		Description:      req.Description,
		ImageURL:         req.ImageURL,
		LocationName:     req.LocationName,
		UsefulVotesCount: 0,
		UserHasVoted:     false,
		Author: AuthorSummary{
			ID:   userID,
			Name: "Felagi Test",
		},
		CreatedAt: time.Now(),
	}
	m.recs[id] = rec
	return rec, nil
}

func (m *mockCommunityRepo) GetRecommendationByID(recID string) (*Recommendation, error) {
	r, ok := m.recs[recID]
	if !ok {
		return nil, nil
	}
	return r, nil
}

func (m *mockCommunityRepo) ToggleVote(recommendationID, userID string) (bool, int, error) {
	rec, ok := m.recs[recommendationID]
	if !ok {
		return false, 0, sql.ErrNoRows
	}
	if m.votes[recommendationID] == nil {
		m.votes[recommendationID] = make(map[string]bool)
	}

	if m.votes[recommendationID][userID] {
		delete(m.votes[recommendationID], userID)
		rec.UsefulVotesCount--
		return false, rec.UsefulVotesCount, nil
	}

	m.votes[recommendationID][userID] = true
	rec.UsefulVotesCount++
	return true, rec.UsefulVotesCount, nil
}

func (m *mockCommunityRepo) ListComments(recommendationID string) ([]Comment, error) {
	if _, ok := m.recs[recommendationID]; !ok {
		return nil, sql.ErrNoRows
	}
	return m.comments[recommendationID], nil
}

func (m *mockCommunityRepo) CreateComment(recID, userID, content string) (*Comment, error) {
	if _, ok := m.recs[recID]; !ok {
		return nil, sql.ErrNoRows
	}
	c := Comment{
		ID:      "comment-1",
		Content: content,
		Author: AuthorSummary{
			ID:   userID,
			Name: "Comentador",
		},
		CreatedAt: time.Now(),
	}
	m.comments[recID] = append(m.comments[recID], c)
	return &c, nil
}

func (m *mockCommunityRepo) GetUserActiveTrip(userID string, info *DestinationInfo) (string, string, bool, error) {
	key := userID + ":" + info.TownID
	if !info.IsTown {
		key = userID + ":" + info.CountryCode
	}
	tripID, ok := m.userActiveTrips[key]
	if !ok {
		return "", "", false, nil
	}
	return tripID, "all_felagis", true, nil
}

func (m *mockCommunityRepo) ListLiveMoments(info *DestinationInfo, currentUserID string) (*LiveFeedResponse, error) {
	return &LiveFeedResponse{
		ActiveFelagisCount: 1,
		Moments:            m.liveMoments[info.TownID],
	}, nil
}

func (m *mockCommunityRepo) CreateLiveMoment(townID, userID, tripID, imageURL string, caption *string) (*LiveMoment, error) {
	moment := LiveMoment{
		ID:       "moment-1",
		ImageURL: imageURL,
		Caption:  caption,
		Author: AuthorSummary{
			ID:   userID,
			Name: "Fotògraf",
		},
		CreatedAt: time.Now(),
	}
	m.liveMoments[townID] = append(m.liveMoments[townID], moment)
	return &moment, nil
}

func (m *mockCommunityRepo) CreateReport(reporterID, targetType, targetID, reason string, details *string) error {
	m.reports = append(m.reports, CommunityReportRequest{
		TargetType: targetType,
		TargetID:   targetID,
		Reason:     reason,
		Details:    details,
	})
	return nil
}

func (m *mockCommunityRepo) GetInspirationFeed(q, category, countryCode string, limit, offset int, currentUserID string) (*InspirationResponse, error) {
	cats := []InspirationCategory{
		{ID: "all", Label: "Tot", Icon: "✨"},
		{ID: "itineraries", Label: "Itineraris", Icon: "🗺️"},
		{ID: "food", Label: "Gastronomia", Icon: "🍽️"},
		{ID: "hidden_gem", Label: "Racons Secrets", Icon: "💎"},
		{ID: "practical_tip", Label: "Consells Pràctics", Icon: "💡"},
		{ID: "transport", Label: "Transport", Icon: "🚆"},
		{ID: "anecdote", Label: "Anècdotes", Icon: "📖"},
	}

	var items []InspirationItem
	for _, tripList := range m.publicTrips {
		for _, trip := range tripList {
			tripCopy := trip
			items = append(items, InspirationItem{
				Type:            "itinerary",
				ID:              trip.ID,
				Title:           trip.Title,
				Category:        "itineraries",
				DestinationName: "Tokyo",
				Author:          trip.Author,
				UsefulCount:     trip.CompanionsCount,
				TripSummary:     &tripCopy,
				CreatedAt:       time.Now(),
			})
		}
	}
	for _, rec := range m.recs {
		items = append(items, InspirationItem{
			Type:            "recommendation",
			ID:              rec.ID,
			Title:           rec.Title,
			Description:     rec.Description,
			Category:        rec.Category,
			DestinationName: "Tokyo",
			UsefulCount:     rec.UsefulVotesCount,
			CreatedAt:       rec.CreatedAt,
		})
	}

	var filtered []InspirationItem
	for _, it := range items {
		if category != "" && category != "all" && it.Category != category {
			continue
		}
		filtered = append(filtered, it)
	}

	return &InspirationResponse{
		Items:      filtered,
		Categories: cats,
		Total:      len(filtered),
	}, nil
}


func TestCommunityService_SearchAndDetail(t *testing.T) {
	repo := newMockCommunityRepo()
	svc := NewService(repo)

	// Search
	results, err := svc.SearchDestinations("Tokyo", 10)
	if err != nil {
		t.Fatalf("unexpected error searching destinations: %v", err)
	}
	if len(results) != 1 || results[0].Name != "Tokyo" {
		t.Errorf("expected Tokyo in results, got %+v", results)
	}

	// Detail found
	detail, err := svc.GetDestinationDetail("town-tokyo", "user-1")
	if err != nil {
		t.Fatalf("unexpected error getting destination detail: %v", err)
	}
	if detail.Name != "Tokyo" || !detail.UserIsTravellingNow {
		t.Errorf("unexpected detail data: %+v", detail)
	}

	// Detail not found
	_, err = svc.GetDestinationDetail("unknown-dest", "user-1")
	if !errors.Is(err, ErrDestinationNotFound) {
		t.Errorf("expected ErrDestinationNotFound, got %v", err)
	}
}

func TestCommunityService_RecommendationsAndVotes(t *testing.T) {
	repo := newMockCommunityRepo()
	svc := NewService(repo)

	// Invalid category
	_, err := svc.CreateRecommendation("town-tokyo", "user-1", CreateRecommendationRequest{
		Category:    "invalid_category",
		Title:       "Ramen Bar",
		Description: "El millor ramen de Shinjuku",
	})
	if err == nil {
		t.Errorf("expected error for invalid category, got nil")
	}

	// Valid creation
	rec, err := svc.CreateRecommendation("town-tokyo", "user-1", CreateRecommendationRequest{
		Category:    "food",
		Title:       "Ramen Bar Ichiran",
		Description: "El millor ramen de Shinjuku amb cabines individuals",
	})
	if err != nil {
		t.Fatalf("unexpected error creating recommendation: %v", err)
	}
	if rec.Title != "Ramen Bar Ichiran" || rec.Category != "food" {
		t.Errorf("unexpected rec data: %+v", rec)
	}

	// List recommendations
	list, err := svc.ListRecommendations("town-tokyo", "food", "all", "useful", "user-1")
	if err != nil {
		t.Fatalf("unexpected error listing recs: %v", err)
	}
	if len(list) != 1 {
		t.Errorf("expected 1 recommendation, got %d", len(list))
	}

	// Toggle vote (Upvote)
	voteResp, err := svc.ToggleVote(rec.ID, "user-2")
	if err != nil {
		t.Fatalf("unexpected error voting: %v", err)
	}
	if !voteResp.Voted || voteResp.UsefulVotesCount != 1 {
		t.Errorf("expected voted=true, count=1, got %+v", voteResp)
	}

	// Toggle vote (Remove vote)
	voteResp, err = svc.ToggleVote(rec.ID, "user-2")
	if err != nil {
		t.Fatalf("unexpected error unvoting: %v", err)
	}
	if voteResp.Voted || voteResp.UsefulVotesCount != 0 {
		t.Errorf("expected voted=false, count=0, got %+v", voteResp)
	}
}

func TestCommunityService_Comments(t *testing.T) {
	repo := newMockCommunityRepo()
	svc := NewService(repo)

	// Create recommendation first
	rec, _ := svc.CreateRecommendation("town-tokyo", "user-1", CreateRecommendationRequest{
		Category:    "hidden_gem",
		Title:       "Templo Nezu",
		Description: "Torii vermells sense aglomeracions",
	})

	// Add comment
	comment, err := svc.CreateComment(rec.ID, "user-2", CreateCommentRequest{
		Content: "Gràcies pel consell! S'hi pot anar en metro?",
	})
	if err != nil {
		t.Fatalf("unexpected error creating comment: %v", err)
	}
	if comment.Content != "Gràcies pel consell! S'hi pot anar en metro?" {
		t.Errorf("unexpected comment content: %s", comment.Content)
	}

	// List comments
	comments, err := svc.ListComments(rec.ID)
	if err != nil {
		t.Fatalf("unexpected error listing comments: %v", err)
	}
	if len(comments) != 1 {
		t.Errorf("expected 1 comment, got %d", len(comments))
	}
}

func TestCommunityService_LiveFeed_AccessControl(t *testing.T) {
	repo := newMockCommunityRepo()
	svc := NewService(repo)

	// User-1 has NO active trip to Tokyo -> 403 Forbidden (ErrNoActiveTrip)
	_, err := svc.GetLiveFeed("town-tokyo", "user-1")
	if !errors.Is(err, ErrNoActiveTrip) {
		t.Errorf("expected ErrNoActiveTrip, got %v", err)
	}

	// Set active trip for user-1
	repo.userActiveTrips["user-1:town-tokyo"] = "trip-123"

	// Now user-1 can view live feed
	feed, err := svc.GetLiveFeed("town-tokyo", "user-1")
	if err != nil {
		t.Fatalf("unexpected error getting live feed: %v", err)
	}
	if feed.ActiveFelagisCount != 1 {
		t.Errorf("expected active count 1, got %d", feed.ActiveFelagisCount)
	}

	// User-1 posts a moment
	caption := "Passejant per Shibuya Crossing 🚶‍♂️✨"
	moment, err := svc.CreateLiveMoment("town-tokyo", "user-1", CreateLiveMomentRequest{
		ImageURL: "https://r2.felag.app/photos/shibuya.jpg",
		Caption:  &caption,
	})
	if err != nil {
		t.Fatalf("unexpected error posting live moment: %v", err)
	}
	if moment.ImageURL != "https://r2.felag.app/photos/shibuya.jpg" {
		t.Errorf("unexpected image url: %s", moment.ImageURL)
	}
}

func TestCommunityService_Reports(t *testing.T) {
	repo := newMockCommunityRepo()
	svc := NewService(repo)

	// Invalid target_type
	err := svc.CreateReport("user-1", CommunityReportRequest{
		TargetType: "invalid_type",
		TargetID:   "rec-1",
		Reason:     "spam",
	})
	if err == nil {
		t.Errorf("expected error for invalid target_type, got nil")
	}

	// Valid report
	details := "Aquest lloc ja està tancat permanentment."
	err = svc.CreateReport("user-1", CommunityReportRequest{
		TargetType: "recommendation",
		TargetID:   "rec-1",
		Reason:     "false_information",
		Details:    &details,
	})
	if err != nil {
		t.Fatalf("unexpected error creating report: %v", err)
	}
	if len(repo.reports) != 1 {
		t.Errorf("expected 1 report in repo, got %d", len(repo.reports))
	}
}

func TestCommunityService_ListPublicTrips(t *testing.T) {
	repo := newMockCommunityRepo()
	svc := NewService(repo)

	// List trips for existing town destination
	trips, err := svc.ListPublicTrips("town-tokyo", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error listing public trips: %v", err)
	}
	if len(trips) != 1 {
		t.Fatalf("expected 1 public trip, got %d", len(trips))
	}

	trip := trips[0]
	if trip.Title != "Ruta de tardor pel Japó" {
		t.Errorf("expected trip title 'Ruta de tardor pel Japó', got %s", trip.Title)
	}
	if trip.TotalDays != 7 {
		t.Errorf("expected TotalDays 7, got %d", trip.TotalDays)
	}
	if trip.FormattedPeriod != "Setembre 2026 • 7 dies" {
		t.Errorf("expected FormattedPeriod 'Setembre 2026 • 7 dies', got %s", trip.FormattedPeriod)
	}
	if trip.Author.AnonymousTitle != "Un felagi de Girona" {
		t.Errorf("expected AnonymousTitle 'Un felagi de Girona', got %s", trip.Author.AnonymousTitle)
	}
	if len(trip.Stages) != 1 || trip.Stages[0].DestinationName != "Tokyo" {
		t.Errorf("expected 1 stage to Tokyo, got %+v", trip.Stages)
	}
	if len(trip.Photos) != 1 || !trip.Photos[0].IsFeatured {
		t.Errorf("expected 1 featured photo, got %+v", trip.Photos)
	}

	// Destination not found
	_, err = svc.ListPublicTrips("unknown-dest", 10, 0)
	if !errors.Is(err, ErrDestinationNotFound) {
		t.Errorf("expected ErrDestinationNotFound, got %v", err)
	}
}

func TestCommunityService_CalculateTripPeriodAndDays(t *testing.T) {
	tests := []struct {
		start     string
		end       string
		wantDays  int
		wantLabel string
	}{
		{
			start:     "2026-09-01",
			end:       "2026-09-07",
			wantDays:  7,
			wantLabel: "Setembre 2026 • 7 dies",
		},
		{
			start:     "2026-01-15",
			end:       "2026-01-15",
			wantDays:  1,
			wantLabel: "Gener 2026 • 1 dia",
		},
		{
			start:     "2026-08-10",
			end:       "2026-08-20",
			wantDays:  11,
			wantLabel: "Agost 2026 • 11 dies",
		},
	}

	for _, tt := range tests {
		days, label := calculateTripPeriodAndDays(tt.start, tt.end)
		if days != tt.wantDays {
			t.Errorf("start=%s, end=%s: got days %d, want %d", tt.start, tt.end, days, tt.wantDays)
		}
		if label != tt.wantLabel {
			t.Errorf("start=%s, end=%s: got label '%s', want '%s'", tt.start, tt.end, label, tt.wantLabel)
		}
	}
}

func TestHandler_ListPublicTrips(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := newMockCommunityRepo()
	svc := NewService(repo)
	handler := NewHandler(svc)

	r := gin.New()
	r.GET("/destinations/:id/trips", handler.ListPublicTrips)
	r.GET("/destinations/:id/public-trips", handler.ListPublicTrips)

	// Test 1: GET /destinations/town-tokyo/trips
	req, _ := http.NewRequest(http.MethodGet, "/destinations/town-tokyo/trips?limit=10&offset=0", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var trips []PublicTripSummary
	if err := json.Unmarshal(w.Body.Bytes(), &trips); err != nil {
		t.Fatalf("failed to unmarshal trips: %v", err)
	}
	if len(trips) != 1 {
		t.Fatalf("expected 1 trip, got %d", len(trips))
	}
	if trips[0].ID != "trip-1" {
		t.Errorf("expected trip id 'trip-1', got %s", trips[0].ID)
	}

	// Test 2: GET /destinations/town-tokyo/public-trips
	req2, _ := http.NewRequest(http.MethodGet, "/destinations/town-tokyo/public-trips", nil)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected status 200 for alias route, got %d", w2.Code)
	}

	// Test 3: Not found
	req3, _ := http.NewRequest(http.MethodGet, "/destinations/unknown-id/trips", nil)
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, req3)

	if w3.Code != http.StatusNotFound {
		t.Fatalf("expected status 404 for unknown destination, got %d", w3.Code)
	}
}

func TestCommunityService_InspirationFeed(t *testing.T) {
	repo := newMockCommunityRepo()
	svc := NewService(repo)

	// Add recommendation
	_, _ = svc.CreateRecommendation("town-tokyo", "user-1", CreateRecommendationRequest{
		Category:    "food",
		Title:       "Ramen Bar",
		Description: "Deliciós ramen",
	})

	// 1. Get Feed 'all'
	feed, err := svc.GetInspirationFeed("", "all", "", 20, 0, "")
	if err != nil {
		t.Fatalf("unexpected error getting inspiration feed: %v", err)
	}
	if len(feed.Categories) != 7 {
		t.Errorf("expected 7 standard categories, got %d", len(feed.Categories))
	}
	if feed.Total < 2 {
		t.Errorf("expected at least 2 items (trip + rec), got total %d", feed.Total)
	}

	// 2. Get Feed 'itineraries'
	itFeed, err := svc.GetInspirationFeed("", "itineraries", "", 20, 0, "")
	if err != nil {
		t.Fatalf("unexpected error getting itineraries: %v", err)
	}
	for _, item := range itFeed.Items {
		if item.Type != "itinerary" {
			t.Errorf("expected type 'itinerary', got %s", item.Type)
		}
	}

	// 3. Get Feed 'food'
	foodFeed, err := svc.GetInspirationFeed("", "food", "", 20, 0, "")
	if err != nil {
		t.Fatalf("unexpected error getting food feed: %v", err)
	}
	for _, item := range foodFeed.Items {
		if item.Type != "recommendation" || item.Category != "food" {
			t.Errorf("expected food recommendation, got type=%s category=%s", item.Type, item.Category)
		}
	}
}

func TestHandler_GetInspirationFeed(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := newMockCommunityRepo()
	svc := NewService(repo)
	handler := NewHandler(svc)

	r := gin.New()
	r.GET("/inspiration", handler.GetInspirationFeed)

	req, _ := http.NewRequest(http.MethodGet, "/inspiration?category=all&limit=10&offset=0", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var resp InspirationResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal InspirationResponse: %v", err)
	}
	if len(resp.Categories) != 7 {
		t.Errorf("expected 7 categories, got %d", len(resp.Categories))
	}
}




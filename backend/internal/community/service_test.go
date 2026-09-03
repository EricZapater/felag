package community

import (
	"database/sql"
	"errors"
	"testing"
	"time"
)

type mockCommunityRepo struct {
	destinations    map[string]*DestinationInfo
	recs            map[string]*Recommendation
	comments        map[string][]Comment
	votes           map[string]map[string]bool
	userActiveTrips map[string]string // "userID:destID" -> tripID
	liveMoments     map[string][]LiveMoment
	reports         []CommunityReportRequest
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
		UserIsTravellingNow:  currentUserID != "",
		UserPhotoSharingMode: "all_felagis",
	}, nil
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

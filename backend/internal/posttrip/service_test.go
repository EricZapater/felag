package posttrip

import (
	"errors"
	"testing"
	"time"

	"felag/backend/internal/chat"
)

type mockRepository struct {
	activeTripInfo        *ActiveTripInfo
	tripAccessInfo        *TripAccessInfo
	photos                []TripPhoto
	celebrationCards      []CelebrationCard
	user1Origin           *UserOriginSummary
	user2Origin           *UserOriginSummary
	wrapupStatus          *WrapupStatus
	storiesCardData       *StoriesCardData
	feedbackCreated       bool
	recommendationsAdded  int
	updateWrapupTaskCalls int
}

func (m *mockRepository) GetActiveTripForUser(userID string) (*ActiveTripInfo, error) {
	return m.activeTripInfo, nil
}

func (m *mockRepository) GetTripAccessInfo(tripID string) (*TripAccessInfo, error) {
	if m.tripAccessInfo != nil && m.tripAccessInfo.ID == tripID {
		return m.tripAccessInfo, nil
	}
	return nil, nil
}

func (m *mockRepository) ListPhotos(tripID string) ([]TripPhoto, error) {
	return m.photos, nil
}

func (m *mockRepository) GetPhoto(tripID, photoID string) (*TripPhoto, error) {
	for _, p := range m.photos {
		if p.ID == photoID && p.TripID == tripID {
			return &p, nil
		}
	}
	return nil, nil
}

func (m *mockRepository) AddPhoto(tripID, userID string, req AddTripPhotoRequest) (*TripPhoto, error) {
	p := TripPhoto{
		ID:           "photo-new-123",
		TripID:       tripID,
		UserID:       userID,
		ImageURL:     req.ImageURL,
		Caption:      req.Caption,
		IsFeatured:   req.IsFeatured != nil && *req.IsFeatured,
		LocationName: req.LocationName,
		CreatedAt:    time.Now(),
	}
	m.photos = append(m.photos, p)
	return &p, nil
}

func (m *mockRepository) TogglePhotoFeatured(tripID, photoID string) (*TripPhoto, error) {
	for i, p := range m.photos {
		if p.ID == photoID && p.TripID == tripID {
			m.photos[i].IsFeatured = !m.photos[i].IsFeatured
			return &m.photos[i], nil
		}
	}
	return nil, errors.New("photo not found")
}

func (m *mockRepository) DeletePhoto(tripID, photoID, userID string) error {
	for i, p := range m.photos {
		if p.ID == photoID && p.TripID == tripID {
			m.photos = append(m.photos[:i], m.photos[i+1:]...)
			return nil
		}
	}
	return errors.New("photo not found")
}

func (m *mockRepository) ListCelebrationCards(tripID string) ([]CelebrationCard, error) {
	return m.celebrationCards, nil
}

func (m *mockRepository) CreateCelebrationCard(tripID, user1ID, user2ID string, matchID *string, imageURL, title, headline string, subheadline *string, locationName string) (*CelebrationCard, error) {
	u1 := UserOriginSummary{ID: user1ID, Name: "User 1"}
	if m.user1Origin != nil {
		u1 = *m.user1Origin
	}
	u2 := UserOriginSummary{ID: user2ID, Name: "User 2"}
	if m.user2Origin != nil {
		u2 = *m.user2Origin
	}

	card := CelebrationCard{
		ID:           "card-123",
		TripID:       tripID,
		User1:        u1,
		User2:        u2,
		ImageURL:     imageURL,
		Title:        title,
		Headline:     headline,
		Subheadline:  subheadline,
		LocationName: locationName,
		CreatedAt:    time.Now(),
	}
	m.celebrationCards = append(m.celebrationCards, card)
	return &card, nil
}

func (m *mockRepository) GetUserOriginSummary(userID string) (*UserOriginSummary, error) {
	if m.user1Origin != nil && m.user1Origin.ID == userID {
		return m.user1Origin, nil
	}
	if m.user2Origin != nil && m.user2Origin.ID == userID {
		return m.user2Origin, nil
	}
	name := "Test User"
	return &UserOriginSummary{ID: userID, Name: name}, nil
}

func (m *mockRepository) FindMatchID(user1ID, user2ID, tripID string) (*string, error) {
	matchID := "match-abc"
	return &matchID, nil
}

func (m *mockRepository) GetWrapupStatus(tripID, userID string) (*WrapupStatus, error) {
	if m.wrapupStatus != nil {
		return m.wrapupStatus, nil
	}
	return &WrapupStatus{
		IsFinalDayOrPast:     true,
		CelebrationCompleted: true,
		FeedbackCompleted:    false,
		StoriesReady:         true,
		ProgressPercentage:   66,
	}, nil
}

func (m *mockRepository) UpdateWrapupTask(tripID, userID string, celebration *bool, feedback *bool, stories *bool) error {
	m.updateWrapupTaskCalls++
	return nil
}

func (m *mockRepository) CreateFeedback(tripID, userID string, rating int, comments *string) error {
	m.feedbackCreated = true
	return nil
}

func (m *mockRepository) InsertDestinationRecommendation(townID, countryCode *string, userID, category, title, description string, imageURL, locationName *string) error {
	m.recommendationsAdded++
	return nil
}

func (m *mockRepository) GetTripTownAndCountry(tripID string) (townID, countryCode *string, err error) {
	t := "town-1"
	c := "ES"
	return &t, &c, nil
}

func (m *mockRepository) GetStoriesCardData(tripID, userID string) (*StoriesCardData, error) {
	if m.storiesCardData != nil {
		return m.storiesCardData, nil
	}
	return &StoriesCardData{
		TripID:          tripID,
		TripTitle:       "Viatge al Japó",
		AuthorName:      "Martí",
		StartDate:       "2026-09-01",
		EndDate:         "2026-09-10",
		TotalDays:       10,
		StagesCount:     3,
		FelagisMetCount: 2,
		FeaturedPhotos:  []string{"https://example.com/p1.jpg"},
	}, nil
}

type mockChatService struct {
	sentMessages int
}

func (m *mockChatService) CreateOrGetConversation(userID string, req chat.CreateConversationRequest) (*chat.Conversation, error) {
	return &chat.Conversation{
		ID: "conv-123",
		OtherParticipant: chat.ParticipantUser{
			ID: req.RecipientID,
		},
	}, nil
}

func (m *mockChatService) SendMessage(senderID, conversationID string, req chat.SendMessageRequest) (*chat.Message, error) {
	m.sentMessages++
	return &chat.Message{ID: "msg-123", ConversationID: conversationID, SenderID: senderID, Content: req.Content}, nil
}

func TestGetActiveTripHub_HasActive(t *testing.T) {
	now := time.Now()
	repo := &mockRepository{
		activeTripInfo: &ActiveTripInfo{
			TripID:                "trip-1",
			Title:                 "Tòquio Aventura",
			StartDate:             now.Add(-2 * 24 * time.Hour),
			EndDate:               now.Add(3 * 24 * time.Hour),
			PhotoSharingMode:      "all_felagis",
			DestinationName:       "Tòquio",
			CountryCode:           "JP",
			PhotosCount:           5,
			CelebrationCardsCount: 1,
			ActiveFelagisCount:    4,
		},
	}
	svc := NewService(repo)

	hub, err := svc.GetActiveTripHub("user-1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if !hub.HasActiveTrip {
		t.Errorf("expected HasActiveTrip=true")
	}
	if *hub.TripTitle != "Tòquio Aventura" {
		t.Errorf("expected title 'Tòquio Aventura', got %s", *hub.TripTitle)
	}
	if *hub.CountryFlag != "🇯🇵" {
		t.Errorf("expected flag '🇯🇵', got %s", *hub.CountryFlag)
	}
	if *hub.TotalDays != 6 {
		t.Errorf("expected 6 total days, got %d", *hub.TotalDays)
	}
	if *hub.CurrentDay != 3 {
		t.Errorf("expected current day 3, got %d", *hub.CurrentDay)
	}
}

func TestGetActiveTripHub_NoActive(t *testing.T) {
	repo := &mockRepository{
		activeTripInfo: nil,
	}
	svc := NewService(repo)

	hub, err := svc.GetActiveTripHub("user-1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if hub.HasActiveTrip {
		t.Errorf("expected HasActiveTrip=false")
	}
}

func TestAddAndTogglePhoto(t *testing.T) {
	repo := &mockRepository{
		tripAccessInfo: &TripAccessInfo{
			ID:     "trip-1",
			UserID: "user-1",
		},
		photos: []TripPhoto{},
	}
	svc := NewService(repo)

	cap := "Foto a Shibuya"
	loc := "Shibuya, Tòquio"
	isFeat := false
	photo, err := svc.AddPhoto("user-1", "trip-1", AddTripPhotoRequest{
		ImageURL:     "https://example.com/shibuya.jpg",
		Caption:      &cap,
		IsFeatured:   &isFeat,
		LocationName: &loc,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if photo.ImageURL != "https://example.com/shibuya.jpg" {
		t.Errorf("unexpected image url")
	}
	if photo.IsFeatured {
		t.Errorf("expected is_featured=false")
	}

	// Toggle featured
	toggled, err := svc.TogglePhotoFeatured("user-1", "trip-1", photo.ID)
	if err != nil {
		t.Fatalf("expected no error toggling photo, got %v", err)
	}
	if !toggled.IsFeatured {
		t.Errorf("expected is_featured=true after toggle")
	}
}

func TestCreateCelebrationCard(t *testing.T) {
	town := "Girona"
	region := "Catalunya"
	country := "Espanya"

	repo := &mockRepository{
		tripAccessInfo: &TripAccessInfo{
			ID:     "trip-1",
			UserID: "user-1",
		},
		user1Origin: &UserOriginSummary{
			ID:          "user-1",
			Name:        "Laia",
			TownName:    &town,
			RegionName:  &region,
			CountryName: &country,
		},
		user2Origin: &UserOriginSummary{
			ID:          "user-2",
			Name:        "Marc",
			TownName:    &town,
			RegionName:  &region,
			CountryName: &country,
		},
	}
	mockChat := &mockChatService{}
	svc := NewService(repo)
	svc.SetChatService(mockChat)

	card, err := svc.CreateCelebrationCard("user-1", "trip-1", CreateCelebrationCardRequest{
		User2ID:      "user-2",
		ImageURL:     "https://example.com/celebration.jpg",
		LocationName: "Shinjuku Gyoen",
	})
	if err != nil {
		t.Fatalf("expected no error creating celebration card, got %v", err)
	}

	if card.Title != "We Met! 📸" {
		t.Errorf("expected title 'We Met! 📸', got %s", card.Title)
	}
	if card.Headline != "Laia i Marc a Shinjuku Gyoen" {
		t.Errorf("expected headline 'Laia i Marc a Shinjuku Gyoen', got %s", card.Headline)
	}
	if card.Subheadline == nil || *card.Subheadline != "Felagis de Girona trobant-se pel món" {
		t.Errorf("expected subheadline about Girona, got %v", card.Subheadline)
	}
	if mockChat.sentMessages != 1 {
		t.Errorf("expected 1 chat message sent, got %d", mockChat.sentMessages)
	}
}

func TestCreateCelebrationCard_SelfError(t *testing.T) {
	repo := &mockRepository{
		tripAccessInfo: &TripAccessInfo{
			ID:     "trip-1",
			UserID: "user-1",
		},
	}
	svc := NewService(repo)

	_, err := svc.CreateCelebrationCard("user-1", "trip-1", CreateCelebrationCardRequest{
		User2ID:      "user-1",
		ImageURL:     "https://example.com/pic.jpg",
		LocationName: "Kyoto",
	})
	if !errors.Is(err, ErrSelfCelebration) {
		t.Errorf("expected ErrSelfCelebration, got %v", err)
	}
}

func TestSubmitFeedback_WithTips(t *testing.T) {
	repo := &mockRepository{
		tripAccessInfo: &TripAccessInfo{
			ID:              "trip-1",
			UserID:          "user-1",
			DestinationName: "Kyoto",
		},
	}
	svc := NewService(repo)

	comments := "Increïble viatge!"
	err := svc.SubmitFeedback("user-1", "trip-1", TripFeedbackRequest{
		Rating:   5,
		Comments: &comments,
		CommunityTips: []CommunityTipInput{
			{
				Category:    "hidden_gem",
				Title:       "Temple ocult al nord",
				Description: "Molt tranquil i sense turistes.",
			},
		},
	})
	if err != nil {
		t.Fatalf("expected no error submitting feedback, got %v", err)
	}

	if !repo.feedbackCreated {
		t.Errorf("expected feedbackCreated=true")
	}
	if repo.recommendationsAdded != 1 {
		t.Errorf("expected 1 recommendation added, got %d", repo.recommendationsAdded)
	}
}

func TestSubmitFeedback_InvalidRating(t *testing.T) {
	repo := &mockRepository{
		tripAccessInfo: &TripAccessInfo{
			ID:     "trip-1",
			UserID: "user-1",
		},
	}
	svc := NewService(repo)

	err := svc.SubmitFeedback("user-1", "trip-1", TripFeedbackRequest{
		Rating: 6,
	})
	if !errors.Is(err, ErrInvalidFeedback) {
		t.Errorf("expected ErrInvalidFeedback, got %v", err)
	}
}

package posttrip

import (
	"errors"
	"fmt"
	"time"

	"felag/backend/internal/chat"
)

var (
	ErrTripNotFound    = errors.New("TRIP_NOT_FOUND")
	ErrPhotoNotFound   = errors.New("PHOTO_NOT_FOUND")
	ErrForbidden       = errors.New("FORBIDDEN")
	ErrSelfCelebration = errors.New("cannot create celebration card with yourself")
	ErrInvalidFeedback = errors.New("rating must be between 1 and 5")
)

type ChatSender interface {
	CreateOrGetConversation(userID string, req chat.CreateConversationRequest) (*chat.Conversation, error)
	SendMessage(senderID, conversationID string, req chat.SendMessageRequest) (*chat.Message, error)
}

type Service interface {
	GetActiveTripHub(userID string) (*ActiveTripHubResponse, error)
	ListPhotos(userID, tripID string) ([]TripPhoto, error)
	AddPhoto(userID, tripID string, req AddTripPhotoRequest) (*TripPhoto, error)
	TogglePhotoFeatured(userID, tripID, photoID string) (*TripPhoto, error)
	DeletePhoto(userID, tripID, photoID string) error
	ListCelebrationCards(userID, tripID string) ([]CelebrationCard, error)
	CreateCelebrationCard(userID, tripID string, req CreateCelebrationCardRequest) (*CelebrationCard, error)
	GetWrapupStatus(userID, tripID string) (*WrapupStatus, error)
	SubmitFeedback(userID, tripID string, req TripFeedbackRequest) error
	GetStoriesCardData(userID, tripID string) (*StoriesCardData, error)
	SetChatService(chatSvc ChatSender)
}

type service struct {
	repo    Repository
	chatSvc ChatSender
}

func NewService(repo Repository) Service {
	return &service{
		repo: repo,
	}
}

func (s *service) SetChatService(chatSvc ChatSender) {
	s.chatSvc = chatSvc
}

func (s *service) GetActiveTripHub(userID string) (*ActiveTripHubResponse, error) {
	info, err := s.repo.GetActiveTripForUser(userID)
	if err != nil {
		return nil, err
	}
	if info == nil {
		return &ActiveTripHubResponse{
			HasActiveTrip: false,
		}, nil
	}

	today := time.Now().Truncate(24 * time.Hour)
	tripStart := info.StartDate.Truncate(24 * time.Hour)
	tripEnd := info.EndDate.Truncate(24 * time.Hour)

	totalDays := int(tripEnd.Sub(tripStart).Hours()/24) + 1
	if totalDays < 1 {
		totalDays = 1
	}

	var currentDay int
	if today.Before(tripStart) {
		currentDay = 1
	} else if today.After(tripEnd) {
		currentDay = totalDays
	} else {
		currentDay = int(today.Sub(tripStart).Hours()/24) + 1
	}

	isFinalDayOrPast := currentDay >= totalDays || !today.Before(tripEnd)
	flag := CountryCodeToFlagEmoji(info.CountryCode)

	return &ActiveTripHubResponse{
		HasActiveTrip:         true,
		TripID:                &info.TripID,
		TripTitle:             &info.Title,
		DestinationName:       &info.DestinationName,
		CountryCode:           &info.CountryCode,
		CountryFlag:           &flag,
		CurrentDay:            &currentDay,
		TotalDays:             &totalDays,
		IsFinalDayOrPast:      &isFinalDayOrPast,
		PhotoSharingMode:      &info.PhotoSharingMode,
		PhotosCount:           &info.PhotosCount,
		CelebrationCardsCount: &info.CelebrationCardsCount,
		ActiveFelagisCount:    &info.ActiveFelagisCount,
	}, nil
}

func (s *service) ListPhotos(userID, tripID string) ([]TripPhoto, error) {
	trip, err := s.repo.GetTripAccessInfo(tripID)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, ErrTripNotFound
	}

	return s.repo.ListPhotos(tripID)
}

func (s *service) AddPhoto(userID, tripID string, req AddTripPhotoRequest) (*TripPhoto, error) {
	trip, err := s.repo.GetTripAccessInfo(tripID)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, ErrTripNotFound
	}

	photo, err := s.repo.AddPhoto(tripID, userID, req)
	if err != nil {
		return nil, err
	}

	// Update stories ready status
	trueVal := true
	_ = s.repo.UpdateWrapupTask(tripID, userID, nil, nil, &trueVal)

	return photo, nil
}

func (s *service) TogglePhotoFeatured(userID, tripID, photoID string) (*TripPhoto, error) {
	trip, err := s.repo.GetTripAccessInfo(tripID)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, ErrTripNotFound
	}

	photo, err := s.repo.GetPhoto(tripID, photoID)
	if err != nil {
		return nil, err
	}
	if photo == nil {
		return nil, ErrPhotoNotFound
	}

	if photo.UserID != userID && trip.UserID != userID {
		return nil, ErrForbidden
	}

	return s.repo.TogglePhotoFeatured(tripID, photoID)
}

func (s *service) DeletePhoto(userID, tripID, photoID string) error {
	trip, err := s.repo.GetTripAccessInfo(tripID)
	if err != nil {
		return err
	}
	if trip == nil {
		return ErrTripNotFound
	}

	photo, err := s.repo.GetPhoto(tripID, photoID)
	if err != nil {
		return err
	}
	if photo == nil {
		return ErrPhotoNotFound
	}

	if photo.UserID != userID && trip.UserID != userID {
		return ErrForbidden
	}

	return s.repo.DeletePhoto(tripID, photoID, userID)
}

func (s *service) ListCelebrationCards(userID, tripID string) ([]CelebrationCard, error) {
	trip, err := s.repo.GetTripAccessInfo(tripID)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, ErrTripNotFound
	}

	return s.repo.ListCelebrationCards(tripID)
}

func (s *service) CreateCelebrationCard(userID, tripID string, req CreateCelebrationCardRequest) (*CelebrationCard, error) {
	if req.User2ID == userID {
		return nil, ErrSelfCelebration
	}

	trip, err := s.repo.GetTripAccessInfo(tripID)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, ErrTripNotFound
	}

	u1, err := s.repo.GetUserOriginSummary(userID)
	if err != nil {
		return nil, err
	}
	u2, err := s.repo.GetUserOriginSummary(req.User2ID)
	if err != nil {
		return nil, err
	}

	title := "We Met! 📸"
	headline := fmt.Sprintf("%s i %s a %s", u1.Name, u2.Name, req.LocationName)

	var subheadline *string
	if req.Caption != nil && *req.Caption != "" {
		subheadline = req.Caption
	} else if u1.TownName != nil && u2.TownName != nil && *u1.TownName == *u2.TownName {
		txt := fmt.Sprintf("Felagis de %s trobant-se pel món", *u1.TownName)
		subheadline = &txt
	} else if u1.RegionName != nil && u2.RegionName != nil && *u1.RegionName == *u2.RegionName {
		txt := fmt.Sprintf("Felagis de %s trobant-se pel món", *u1.RegionName)
		subheadline = &txt
	}

	matchID, _ := s.repo.FindMatchID(userID, req.User2ID, tripID)

	card, err := s.repo.CreateCelebrationCard(
		tripID,
		userID,
		req.User2ID,
		matchID,
		req.ImageURL,
		title,
		headline,
		subheadline,
		req.LocationName,
	)
	if err != nil {
		return nil, err
	}

	// Update wrapup task for both users
	completed := true
	_ = s.repo.UpdateWrapupTask(tripID, userID, &completed, nil, nil)
	_ = s.repo.UpdateWrapupTask(tripID, req.User2ID, &completed, nil, nil)

	// Send celebration message to chat if chat service is available
	if s.chatSvc != nil {
		conv, convErr := s.chatSvc.CreateOrGetConversation(userID, chat.CreateConversationRequest{
			MatchID:     matchID,
			RecipientID: req.User2ID,
		})
		if convErr == nil && conv != nil {
			chatMsgContent := fmt.Sprintf("📸 Hem creat una Celebration Card junts a %s!\n%s", req.LocationName, req.ImageURL)
			_, _ = s.chatSvc.SendMessage(userID, conv.ID, chat.SendMessageRequest{
				Content: chatMsgContent,
			})
		}
	}

	return card, nil
}

func (s *service) GetWrapupStatus(userID, tripID string) (*WrapupStatus, error) {
	trip, err := s.repo.GetTripAccessInfo(tripID)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, ErrTripNotFound
	}

	return s.repo.GetWrapupStatus(tripID, userID)
}

func (s *service) SubmitFeedback(userID, tripID string, req TripFeedbackRequest) error {
	if req.Rating < 1 || req.Rating > 5 {
		return ErrInvalidFeedback
	}

	trip, err := s.repo.GetTripAccessInfo(tripID)
	if err != nil {
		return err
	}
	if trip == nil {
		return ErrTripNotFound
	}

	if err := s.repo.CreateFeedback(tripID, userID, req.Rating, req.Comments); err != nil {
		return err
	}

	// Insert any community tips from the feedback into destination_recommendations
	if len(req.CommunityTips) > 0 {
		townID, countryCode, _ := s.repo.GetTripTownAndCountry(tripID)
		for _, tip := range req.CommunityTips {
			_ = s.repo.InsertDestinationRecommendation(
				townID,
				countryCode,
				userID,
				tip.Category,
				tip.Title,
				tip.Description,
				tip.ImageURL,
				&trip.DestinationName,
			)
		}
	}

	// Update wrapup task
	feedbackCompleted := true
	_ = s.repo.UpdateWrapupTask(tripID, userID, nil, &feedbackCompleted, nil)

	return nil
}

func (s *service) GetStoriesCardData(userID, tripID string) (*StoriesCardData, error) {
	trip, err := s.repo.GetTripAccessInfo(tripID)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, ErrTripNotFound
	}

	data, err := s.repo.GetStoriesCardData(tripID, userID)
	if err != nil {
		return nil, err
	}

	// Mark stories shared in wrapup status
	storiesShared := true
	_ = s.repo.UpdateWrapupTask(tripID, userID, nil, nil, &storiesShared)

	return data, nil
}

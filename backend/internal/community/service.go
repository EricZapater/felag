package community

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

var (
	ErrDestinationNotFound    = errors.New("destinació no trobada")
	ErrRecommendationNotFound = errors.New("recomanació no trobada")
	ErrUnauthorized           = errors.New("no autoritzat")
	ErrNoActiveTrip           = errors.New("l'usuari no té un viatge actiu en aquesta destinació")
	ErrInvalidInput           = errors.New("dades d'entrada invàlides")
	ErrInvalidCategory        = errors.New("categoria invàlida")
)

var validCategories = map[string]bool{
	"food":          true,
	"hidden_gem":    true,
	"transport":     true,
	"practical_tip": true,
	"anecdote":      true,
}

var validReportReasons = map[string]bool{
	"spam":                  true,
	"inappropriate_content": true,
	"false_information":     true,
	"harassment":            true,
	"other":                 true,
}

type Service interface {
	SearchDestinations(q string, limit int) ([]DestinationSummary, error)
	GetDestinationDetail(destID string, currentUserID string) (*DestinationDetail, error)
	ListRecommendations(destID string, category, originFilter, sort, currentUserID string) ([]Recommendation, error)
	CreateRecommendation(destID string, userID string, req CreateRecommendationRequest) (*Recommendation, error)
	ToggleVote(recommendationID, userID string) (*VoteResponse, error)
	ListComments(recommendationID string) ([]Comment, error)
	CreateComment(recommendationID, userID string, req CreateCommentRequest) (*Comment, error)
	GetLiveFeed(destID string, userID string) (*LiveFeedResponse, error)
	CreateLiveMoment(destID string, userID string, req CreateLiveMomentRequest) (*LiveMoment, error)
	CreateReport(reporterID string, req CommunityReportRequest) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) SearchDestinations(q string, limit int) ([]DestinationSummary, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.repo.SearchDestinations(q, limit)
}

func (s *service) GetDestinationDetail(destID string, currentUserID string) (*DestinationDetail, error) {
	info, err := s.repo.ResolveDestination(destID)
	if err != nil {
		return nil, err
	}
	if info == nil {
		return nil, ErrDestinationNotFound
	}

	return s.repo.GetDestinationStats(info, currentUserID)
}

func (s *service) ListRecommendations(destID string, category, originFilter, sort, currentUserID string) ([]Recommendation, error) {
	info, err := s.repo.ResolveDestination(destID)
	if err != nil {
		return nil, err
	}
	if info == nil {
		return nil, ErrDestinationNotFound
	}

	cleanCategory := strings.TrimSpace(category)
	if cleanCategory == "" {
		cleanCategory = "all"
	}

	cleanOriginFilter := strings.TrimSpace(originFilter)
	if cleanOriginFilter == "" {
		cleanOriginFilter = "all"
	}

	cleanSort := strings.TrimSpace(sort)
	if cleanSort == "" {
		cleanSort = "useful"
	}

	return s.repo.ListRecommendations(info, cleanCategory, cleanOriginFilter, cleanSort, currentUserID)
}

func (s *service) CreateRecommendation(destID string, userID string, req CreateRecommendationRequest) (*Recommendation, error) {
	info, err := s.repo.ResolveDestination(destID)
	if err != nil {
		return nil, err
	}
	if info == nil {
		return nil, ErrDestinationNotFound
	}

	cat := strings.TrimSpace(req.Category)
	if !validCategories[cat] {
		return nil, fmt.Errorf("categoria invàlida: ha de ser 'food', 'hidden_gem', 'transport', 'practical_tip' o 'anecdote'")
	}

	title := strings.TrimSpace(req.Title)
	if title == "" || len(title) > 120 {
		return nil, fmt.Errorf("el títol és obligatori i no pot superar els 120 caràcters")
	}

	desc := strings.TrimSpace(req.Description)
	if desc == "" || len(desc) > 2000 {
		return nil, fmt.Errorf("la descripció és obligatòria i no pot superar els 2000 caràcters")
	}

	req.Category = cat
	req.Title = title
	req.Description = desc

	return s.repo.CreateRecommendation(destID, info, userID, req)
}

func (s *service) ToggleVote(recommendationID, userID string) (*VoteResponse, error) {
	voted, count, err := s.repo.ToggleVote(recommendationID, userID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrRecommendationNotFound
	}
	if err != nil {
		return nil, err
	}

	return &VoteResponse{
		Voted:            voted,
		UsefulVotesCount: count,
	}, nil
}

func (s *service) ListComments(recommendationID string) ([]Comment, error) {
	comments, err := s.repo.ListComments(recommendationID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrRecommendationNotFound
	}
	if err != nil {
		return nil, err
	}

	return comments, nil
}

func (s *service) CreateComment(recommendationID, userID string, req CreateCommentRequest) (*Comment, error) {
	content := strings.TrimSpace(req.Content)
	if content == "" {
		return nil, fmt.Errorf("el comentari no pot estar buit")
	}
	if len(content) > 500 {
		return nil, fmt.Errorf("el comentari no pot superar els 500 caràcters")
	}

	comment, err := s.repo.CreateComment(recommendationID, userID, content)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrRecommendationNotFound
	}
	if err != nil {
		return nil, err
	}

	return comment, nil
}

func (s *service) GetLiveFeed(destID string, userID string) (*LiveFeedResponse, error) {
	info, err := s.repo.ResolveDestination(destID)
	if err != nil {
		return nil, err
	}
	if info == nil {
		return nil, ErrDestinationNotFound
	}

	_, _, isTravelling, err := s.repo.GetUserActiveTrip(userID, info)
	if err != nil {
		return nil, err
	}
	if !isTravelling {
		return nil, ErrNoActiveTrip
	}

	return s.repo.ListLiveMoments(info, userID)
}

func (s *service) CreateLiveMoment(destID string, userID string, req CreateLiveMomentRequest) (*LiveMoment, error) {
	info, err := s.repo.ResolveDestination(destID)
	if err != nil {
		return nil, err
	}
	if info == nil {
		return nil, ErrDestinationNotFound
	}

	tripID, _, isTravelling, err := s.repo.GetUserActiveTrip(userID, info)
	if err != nil {
		return nil, err
	}
	if !isTravelling {
		return nil, ErrNoActiveTrip
	}

	imgURL := strings.TrimSpace(req.ImageURL)
	if imgURL == "" {
		return nil, fmt.Errorf("la imatge és obligatòria")
	}

	var caption *string
	if req.Caption != nil {
		c := strings.TrimSpace(*req.Caption)
		if len(c) > 280 {
			return nil, fmt.Errorf("el peu de foto no pot superar els 280 caràcters")
		}
		if c != "" {
			caption = &c
		}
	}

	townID := info.TownID
	if !info.IsTown || townID == "" {
		// If destination was queried by country, townID could be determined or info.TownID
		// In Postgres destination_live_moments town_id is required. If town is not resolved, fallback to user's town or town from trip stage.
		if info.TownID != "" {
			townID = info.TownID
		}
	}

	return s.repo.CreateLiveMoment(townID, userID, tripID, imgURL, caption)
}

func (s *service) CreateReport(reporterID string, req CommunityReportRequest) error {
	targetType := strings.TrimSpace(req.TargetType)
	if targetType != "recommendation" && targetType != "comment" && targetType != "live_moment" {
		return fmt.Errorf("tipus d'objectiu invàlid: ha de ser 'recommendation', 'comment' o 'live_moment'")
	}

	targetID := strings.TrimSpace(req.TargetID)
	if targetID == "" {
		return fmt.Errorf("identificador d'objectiu obligatori")
	}

	reason := strings.TrimSpace(req.Reason)
	if !validReportReasons[reason] {
		return fmt.Errorf("motiu de denúncia invàlid: ha de ser 'spam', 'inappropriate_content', 'false_information', 'harassment' o 'other'")
	}

	var details *string
	if req.Details != nil {
		d := strings.TrimSpace(*req.Details)
		if d != "" {
			details = &d
		}
	}

	return s.repo.CreateReport(reporterID, targetType, targetID, reason, details)
}

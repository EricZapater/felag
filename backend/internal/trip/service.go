package trip

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrTripNotFound = errors.New("viatge no trobat")
	ErrUnauthorized = errors.New("no autoritzat")
)

type Service interface {
	CreateTrip(userID string, req CreateTripRequest) (*Trip, error)
	GetTripByID(tripID string, currentUserID string) (*Trip, error)
	ListMyTrips(userID string, filter string) ([]Trip, error)
	UpdateTrip(tripID string, userID string, req UpdateTripRequest) (*Trip, error)
	DeleteTrip(tripID string, userID string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func parseDate(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02", strings.TrimSpace(dateStr))
}

func (s *service) CreateTrip(userID string, req CreateTripRequest) (*Trip, error) {
	if strings.TrimSpace(req.Title) == "" {
		return nil, fmt.Errorf("el títol del viatge és obligatori")
	}

	startDate, err := parseDate(req.StartDate)
	if err != nil {
		return nil, fmt.Errorf("format de data d'inici invàlid (format esperat: YYYY-MM-DD)")
	}

	endDate, err := parseDate(req.EndDate)
	if err != nil {
		return nil, fmt.Errorf("format de data de fi invàlid (format esperat: YYYY-MM-DD)")
	}

	if startDate.After(endDate) {
		return nil, fmt.Errorf("la data d'inici ha de ser anterior a la data de fi")
	}

	visibility := strings.TrimSpace(req.Visibility)
	if visibility == "" {
		visibility = "public"
	}
	if visibility != "public" && visibility != "contacts_only" && visibility != "private" {
		return nil, fmt.Errorf("visibilitat invàlida: ha de ser 'public', 'contacts_only' o 'private'")
	}

	if len(req.Stages) == 0 {
		return nil, fmt.Errorf("el viatge ha de tenir almenys una etapa")
	}

	stages := make([]TripStage, 0, len(req.Stages))
	for i, st := range req.Stages {
		if strings.TrimSpace(st.DestinationName) == "" {
			return nil, fmt.Errorf("el nom de la destinació de l'etapa és obligatori")
		}

		sStart, err := parseDate(st.StartDate)
		if err != nil {
			return nil, fmt.Errorf("format de data d'inici invàlid a l'etapa '%s'", st.DestinationName)
		}

		sEnd, err := parseDate(st.EndDate)
		if err != nil {
			return nil, fmt.Errorf("format de data de fi invàlid a l'etapa '%s'", st.DestinationName)
		}

		if sStart.After(sEnd) {
			return nil, fmt.Errorf("la data d'inici de l'etapa '%s' ha de ser anterior o igual a la data de fi", st.DestinationName)
		}

		if sStart.Before(startDate) || sEnd.After(endDate) {
			return nil, fmt.Errorf("les dates de l'etapa '%s' han d'estar compreses dins de les dates globals del viatge", st.DestinationName)
		}

		order := st.StageOrder
		if order <= 0 {
			order = i + 1
		}

		stages = append(stages, TripStage{
			StageOrder:      order,
			DestinationName: strings.TrimSpace(st.DestinationName),
			CountryCode:     st.CountryCode,
			StartDate:       sStart.Format("2006-01-02"),
			EndDate:         sEnd.Format("2006-01-02"),
			Notes:           st.Notes,
		})
	}

	trip := &Trip{
		UserID:      userID,
		Title:       strings.TrimSpace(req.Title),
		Description: req.Description,
		StartDate:   startDate.Format("2006-01-02"),
		EndDate:     endDate.Format("2006-01-02"),
		Visibility:  visibility,
		Status:      "planned",
	}

	return s.repo.Create(trip, stages)
}

func (s *service) GetTripByID(tripID string, currentUserID string) (*Trip, error) {
	trip, err := s.repo.GetByID(tripID)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, ErrTripNotFound
	}

	// If trip is private and does not belong to the current user, return Not Found
	if trip.Visibility == "private" && trip.UserID != currentUserID {
		return nil, ErrTripNotFound
	}

	return trip, nil
}

func (s *service) ListMyTrips(userID string, filter string) ([]Trip, error) {
	cleanFilter := strings.ToLower(strings.TrimSpace(filter))
	if cleanFilter != "upcoming" && cleanFilter != "past" {
		cleanFilter = "all"
	}
	return s.repo.ListByUserID(userID, cleanFilter)
}

func (s *service) UpdateTrip(tripID string, userID string, req UpdateTripRequest) (*Trip, error) {
	existing, err := s.repo.GetByID(tripID)
	if err != nil {
		return nil, err
	}
	if existing == nil || existing.UserID != userID {
		return nil, ErrTripNotFound
	}

	effectiveStartStr := existing.StartDate
	effectiveEndStr := existing.EndDate

	var updateTrip Trip

	if req.Title != nil {
		t := strings.TrimSpace(*req.Title)
		if t == "" {
			return nil, fmt.Errorf("el títol no pot ser buit")
		}
		updateTrip.Title = t
	}

	if req.Description != nil {
		updateTrip.Description = req.Description
	}

	if req.StartDate != nil {
		sDate, err := parseDate(*req.StartDate)
		if err != nil {
			return nil, fmt.Errorf("format de data d'inici invàlid (format esperat: YYYY-MM-DD)")
		}
		effectiveStartStr = sDate.Format("2006-01-02")
		updateTrip.StartDate = effectiveStartStr
	}

	if req.EndDate != nil {
		eDate, err := parseDate(*req.EndDate)
		if err != nil {
			return nil, fmt.Errorf("format de data de fi invàlid (format esperat: YYYY-MM-DD)")
		}
		effectiveEndStr = eDate.Format("2006-01-02")
		updateTrip.EndDate = effectiveEndStr
	}

	startDate, _ := parseDate(effectiveStartStr)
	endDate, _ := parseDate(effectiveEndStr)
	if startDate.After(endDate) {
		return nil, fmt.Errorf("la data d'inici ha de ser anterior a la data de fi")
	}

	if req.Visibility != nil {
		vis := strings.TrimSpace(*req.Visibility)
		if vis != "public" && vis != "contacts_only" && vis != "private" {
			return nil, fmt.Errorf("visibilitat invàlida: ha de ser 'public', 'contacts_only' o 'private'")
		}
		updateTrip.Visibility = vis
	}

	var stagesSlice *[]TripStage
	if req.Stages != nil {
		stgs := make([]TripStage, 0, len(*req.Stages))
		for i, st := range *req.Stages {
			if strings.TrimSpace(st.DestinationName) == "" {
				return nil, fmt.Errorf("el nom de la destinació de l'etapa és obligatori")
			}

			sStart, err := parseDate(st.StartDate)
			if err != nil {
				return nil, fmt.Errorf("format de data d'inici invàlid a l'etapa '%s'", st.DestinationName)
			}

			sEnd, err := parseDate(st.EndDate)
			if err != nil {
				return nil, fmt.Errorf("format de data de fi invàlid a l'etapa '%s'", st.DestinationName)
			}

			if sStart.After(sEnd) {
				return nil, fmt.Errorf("la data d'inici de l'etapa '%s' ha de ser anterior o igual a la data de fi", st.DestinationName)
			}

			if sStart.Before(startDate) || sEnd.After(endDate) {
				return nil, fmt.Errorf("les dates de l'etapa '%s' han d'estar compreses dins de les dates globals del viatge", st.DestinationName)
			}

			order := st.StageOrder
			if order <= 0 {
				order = i + 1
			}

			stgs = append(stgs, TripStage{
				StageOrder:      order,
				DestinationName: strings.TrimSpace(st.DestinationName),
				CountryCode:     st.CountryCode,
				StartDate:       sStart.Format("2006-01-02"),
				EndDate:         sEnd.Format("2006-01-02"),
				Notes:           st.Notes,
			})
		}
		stagesSlice = &stgs
	}

	updated, err := s.repo.Update(tripID, userID, &updateTrip, stagesSlice)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrTripNotFound
	}

	return updated, nil
}

func (s *service) DeleteTrip(tripID string, userID string) error {
	err := s.repo.Delete(tripID, userID)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrTripNotFound
	}
	return err
}

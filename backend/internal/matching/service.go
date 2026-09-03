package matching

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrMatchNotFound = errors.New("coincidència no trobada")
	ErrUnauthorized  = errors.New("no autoritzat")
)

type Service interface {
	GetTripMatches(tripID string, currentUserID string) ([]Match, error)
	GetMatchByID(matchID string, currentUserID string) (*Match, error)
	CalculateMatchesForTrip(tripID string) ([]MatchNotificationPayload, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) GetTripMatches(tripID string, currentUserID string) ([]Match, error) {
	// Query matches for tripID
	matches, err := s.repo.GetTripMatches(tripID)
	if err != nil {
		return nil, err
	}
	return matches, nil
}

func (s *service) GetMatchByID(matchID string, currentUserID string) (*Match, error) {
	match, err := s.repo.GetMatchByID(matchID)
	if err != nil {
		return nil, err
	}
	if match == nil {
		return nil, ErrMatchNotFound
	}
	return match, nil
}

func maxDate(d1, d2 time.Time) time.Time {
	if d1.After(d2) {
		return d1
	}
	return d2
}

func minDate(d1, d2 time.Time) time.Time {
	if d1.Before(d2) {
		return d1
	}
	return d2
}

func parseDateStr(s string) (time.Time, error) {
	return time.Parse("2006-01-02", strings.TrimSpace(s))
}

func (s *service) CalculateMatchesForTrip(tripID string) ([]MatchNotificationPayload, error) {
	stages, err := s.repo.GetTripStages(tripID)
	if err != nil {
		return nil, fmt.Errorf("error obtenint etapes del viatge: %w", err)
	}
	if len(stages) == 0 {
		return nil, nil
	}

	// If the trip itself is private, it does not participate in public matching
	if stages[0].Visibility == "private" {
		return nil, nil
	}

	ownerID := stages[0].UserID
	ownerOrigin, err := s.repo.GetUserOrigin(ownerID)
	if err != nil {
		return nil, fmt.Errorf("error obtenint origen del propietari: %w", err)
	}
	if ownerOrigin == nil || ownerOrigin.CountryID == nil {
		// No origin configured, cannot match
		return nil, nil
	}

	var notifications []MatchNotificationPayload
	seenPairs := make(map[string]bool)

	for _, stage := range stages {
		candidates, err := s.repo.FindCandidateStages(
			tripID, ownerID, stage.DestinationName, stage.StartDate, stage.EndDate,
		)
		if err != nil {
			return nil, fmt.Errorf("error cercant candidats per a etapa '%s': %w", stage.DestinationName, err)
		}

		stageStart, err := parseDateStr(stage.StartDate)
		if err != nil {
			continue
		}
		stageEnd, err := parseDateStr(stage.EndDate)
		if err != nil {
			continue
		}

		for _, cand := range candidates {
			pairKey := fmt.Sprintf("%s-%s", tripID, cand.TripID)
			if seenPairs[pairKey] {
				continue
			}
			seenPairs[pairKey] = true

			candStart, err := parseDateStr(cand.StartDate)
			if err != nil {
				continue
			}
			candEnd, err := parseDateStr(cand.EndDate)
			if err != nil {
				continue
			}

			// Calculate overlap date interval
			overlapStart := maxDate(stageStart, candStart)
			overlapEnd := minDate(stageEnd, candEnd)
			if overlapStart.After(overlapEnd) {
				continue
			}

			overlapStartStr := overlapStart.Format("2006-01-02")
			overlapEndStr := overlapEnd.Format("2006-01-02")

			// Calculate origin affinity hierarchy
			affinityLevel, affinityScore, explanation1, explanation2 := calculateAffinity(ownerOrigin, cand)
			if affinityLevel == "" {
				continue
			}

			// Destination name to store
			destName := stage.DestinationName

			// 1. Create/Update match for Owner (tripID -> cand.TripID)
			matchRecord1 := &MatchRecord{
				TripID:           tripID,
				MatchedTripID:    cand.TripID,
				UserID:           ownerID,
				MatchedUserID:    cand.UserID,
				DestinationName:  destName,
				OverlapStartDate: overlapStartStr,
				OverlapEndDate:   overlapEndStr,
				AffinityLevel:    affinityLevel,
				AffinityScore:    affinityScore,
				Explanation:      explanation1,
			}
			isNew1, matchID1, err := s.repo.UpsertMatch(matchRecord1)
			if err != nil {
				return nil, fmt.Errorf("error guardant match per usuari 1: %w", err)
			}

			// 2. Create/Update symmetric match for Candidate (cand.TripID -> tripID)
			matchRecord2 := &MatchRecord{
				TripID:           cand.TripID,
				MatchedTripID:    tripID,
				UserID:           cand.UserID,
				MatchedUserID:    ownerID,
				DestinationName:  destName,
				OverlapStartDate: overlapStartStr,
				OverlapEndDate:   overlapEndStr,
				AffinityLevel:    affinityLevel,
				AffinityScore:    affinityScore,
				Explanation:      explanation2,
			}
			isNew2, matchID2, err := s.repo.UpsertMatch(matchRecord2)
			if err != nil {
				return nil, fmt.Errorf("error guardant match per usuari 2: %w", err)
			}

			ownerOriginSum := ""
			if s := formatOriginSummary(ownerOrigin.TownName, ownerOrigin.RegionName, ownerOrigin.CountryName); s != nil {
				ownerOriginSum = *s
			}
			candOriginSum := ""
			if s := formatOriginSummary(cand.TownName, cand.RegionName, cand.CountryName); s != nil {
				candOriginSum = *s
			}

			if isNew1 {
				notifications = append(notifications, MatchNotificationPayload{
					MatchID:           matchID1,
					TripID:            tripID,
					MatchedTripID:     cand.TripID,
					UserID:            ownerID,
					MatchedUserID:     cand.UserID,
					MatchedUserName:   cand.UserName,
					MatchedUserOrigin: candOriginSum,
					DestinationName:   destName,
					OverlapStartDate:  overlapStartStr,
					OverlapEndDate:    overlapEndStr,
				})
			}

			if isNew2 {
				notifications = append(notifications, MatchNotificationPayload{
					MatchID:           matchID2,
					TripID:            cand.TripID,
					MatchedTripID:     tripID,
					UserID:            cand.UserID,
					MatchedUserID:     ownerID,
					MatchedUserName:   ownerOrigin.UserName,
					MatchedUserOrigin: ownerOriginSum,
					DestinationName:   destName,
					OverlapStartDate:  overlapStartStr,
					OverlapEndDate:    overlapEndStr,
				})
			}
		}
	}

	return notifications, nil
}

func calculateAffinity(owner *UserOriginInfo, cand CandidateTripStage) (level string, score int, expl1 string, expl2 string) {
	// 1. Town Match (Score: 100)
	if owner.TownID != nil && cand.TownID != nil && *owner.TownID == *cand.TownID {
		tName := ""
		if cand.TownName != nil {
			tName = *cand.TownName
		}
		rName := ""
		if cand.RegionName != nil {
			rName = *cand.RegionName
		}

		expl := fmt.Sprintf("Tots dos sou de %s (%s)!", tName, rName)
		if rName == "" {
			expl = fmt.Sprintf("Tots dos sou de %s!", tName)
		}
		return "town", 100, expl, expl
	}

	// 2. Region Match (Score: 75)
	if owner.RegionID != nil && cand.RegionID != nil && *owner.RegionID == *cand.RegionID {
		rName := ""
		if cand.RegionName != nil {
			rName = *cand.RegionName
		}
		expl := fmt.Sprintf("Tots dos sou de %s!", rName)
		return "region", 75, expl, expl
	}

	// 3. Country Match (Score: 50)
	if owner.CountryID != nil && cand.CountryID != nil && *owner.CountryID == *cand.CountryID {
		cName := ""
		if cand.CountryName != nil {
			cName = *cand.CountryName
		}
		expl := fmt.Sprintf("Tots dos sou de %s!", cName)
		return "country", 50, expl, expl
	}

	return "", 0, "", ""
}

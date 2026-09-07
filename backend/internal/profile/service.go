package profile

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"

	"felag/backend/internal/storage"
)

var (
	ErrProfileNotFound = errors.New("PROFILE_NOT_FOUND")
	ErrForbidden       = errors.New("FORBIDDEN")
)

type Service interface {
	GetProfile(userID string) (*Profile, error)
	GetPublicProfile(requesterID, targetUserID string) (*PublicProfile, error)
	UpdateProfile(userID string, req UpdateProfileRequest) (*Profile, error)
	UploadAvatar(userID string, fileHeader *multipart.FileHeader) (string, error)
	UpdateOrigin(userID, townID string) (*Profile, error)
	GetCountries() ([]Country, error)
	GetRegionsByCountry(countryID string) ([]Region, error)
	GetTownsByRegion(regionID string) ([]Town, error)
	SearchTowns(q string, limit int) ([]TownSearchResult, error)
	SetModerationService(mod moderationChecker)
	SetStorageService(storage storage.StorageService)
}

type moderationChecker interface {
	IsBlocked(userA, userB string) (bool, error)
}

type service struct {
	repo          Repository
	moderationSvc moderationChecker
	storage       storage.StorageService
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) SetStorageService(storage storage.StorageService) {
	s.storage = storage
}

func (s *service) SetModerationService(mod moderationChecker) {
	s.moderationSvc = mod
}

func (s *service) GetProfile(userID string) (*Profile, error) {
	p, err := s.repo.GetProfile(userID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, ErrProfileNotFound
	}
	return p, nil
}

func (s *service) GetPublicProfile(requesterID, targetUserID string) (*PublicProfile, error) {
	if s.moderationSvc != nil {
		blocked, err := s.moderationSvc.IsBlocked(requesterID, targetUserID)
		if err != nil {
			return nil, err
		}
		if blocked {
			return nil, ErrForbidden
		}
	}

	p, err := s.repo.GetPublicProfile(targetUserID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, ErrProfileNotFound
	}

	trips, err := s.repo.GetPublicTrips(targetUserID)
	if err != nil {
		return nil, err
	}
	p.PublicTrips = trips

	return p, nil
}

func (s *service) UpdateProfile(userID string, req UpdateProfileRequest) (*Profile, error) {
	if err := s.repo.UpdateProfile(userID, req.Name, req.PhoneNumber, req.Bio); err != nil {
		return nil, err
	}
	return s.GetProfile(userID)
}

func (s *service) UploadAvatar(userID string, fileHeader *multipart.FileHeader) (string, error) {
	storageSvc := s.storage
	if storageSvc == nil {
		storageSvc = storage.NewStorageService()
	}

	avatarURL, err := storageSvc.UploadFileHeader(context.Background(), "avatars", userID, fileHeader)
	if err != nil {
		return "", fmt.Errorf("error uploading avatar: %w", err)
	}

	if err := s.repo.UpdateAvatar(userID, avatarURL); err != nil {
		return "", fmt.Errorf("error saving avatar url: %w", err)
	}

	return avatarURL, nil
}

func (s *service) UpdateOrigin(userID, townID string) (*Profile, error) {
	if err := s.repo.UpdateOrigin(userID, townID); err != nil {
		return nil, err
	}
	return s.GetProfile(userID)
}

func (s *service) GetCountries() ([]Country, error) {
	return s.repo.GetCountries()
}

func (s *service) GetRegionsByCountry(countryID string) ([]Region, error) {
	return s.repo.GetRegionsByCountry(countryID)
}

func (s *service) GetTownsByRegion(regionID string) ([]Town, error) {
	return s.repo.GetTownsByRegion(regionID)
}

func (s *service) SearchTowns(q string, limit int) ([]TownSearchResult, error) {
	return s.repo.SearchTowns(q, limit)
}

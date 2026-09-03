package profile

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
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
	SetModerationService(mod moderationChecker)
}

type moderationChecker interface {
	IsBlocked(userA, userB string) (bool, error)
}

type service struct {
	repo          Repository
	moderationSvc moderationChecker
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
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
	file, err := fileHeader.Open()
	if err != nil {
		return "", fmt.Errorf("error opening uploaded file: %w", err)
	}
	defer file.Close()

	fileName := fmt.Sprintf("%s_%s", userID, filepath.Base(fileHeader.Filename))

	// Ensure uploads directory exists for fallback/local development
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	avatarDir := filepath.Join(uploadDir, "avatars")
	if err := os.MkdirAll(avatarDir, 0755); err != nil {
		return "", fmt.Errorf("error creating avatar dir: %w", err)
	}

	dstPath := filepath.Join(avatarDir, fileName)
	dst, err := os.Create(dstPath)
	if err != nil {
		return "", fmt.Errorf("error creating destination file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", fmt.Errorf("error writing file: %w", err)
	}

	var avatarURL string
	r2URL := os.Getenv("R2_PUBLIC_URL")
	if r2URL != "" {
		avatarURL = fmt.Sprintf("%s/%s", strings.TrimRight(r2URL, "/"), fileName)
	} else {
		baseURL := os.Getenv("BASE_URL")
		if baseURL == "" {
			baseURL = "http://localhost:8080"
		}
		avatarURL = fmt.Sprintf("%s/static/avatars/%s", strings.TrimRight(baseURL, "/"), fileName)
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

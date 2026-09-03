package profile

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
)

var ErrProfileNotFound = errors.New("PROFILE_NOT_FOUND")

type Service interface {
	GetProfile(userID string) (*Profile, error)
	UpdateProfile(userID string, req UpdateProfileRequest) (*Profile, error)
	UploadAvatar(userID string, fileHeader *multipart.FileHeader) (string, error)
	UpdateOrigin(userID, townID string) (*Profile, error)
	GetCountries() ([]Country, error)
	GetRegionsByCountry(countryID string) ([]Region, error)
	GetTownsByRegion(regionID string) ([]Town, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
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

	// Ensure uploads directory exists for fallback/local development
	uploadDir := "uploads/avatars"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("error creating upload directory: %w", err)
	}

	fileName := fmt.Sprintf("%s_%s", userID, filepath.Base(fileHeader.Filename))
	dstPath := filepath.Join(uploadDir, fileName)

	dst, err := os.Create(dstPath)
	if err != nil {
		return "", fmt.Errorf("error creating destination file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", fmt.Errorf("error writing file: %w", err)
	}

	avatarURL := fmt.Sprintf("http://localhost:8080/static/avatars/%s", fileName)
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

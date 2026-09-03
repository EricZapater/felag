package auth

import (
	"errors"
	"fmt"
	"time"

	"felag/backend/internal/shared"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserAlreadyExists  = errors.New("USER_ALREADY_EXISTS")
	ErrInvalidCredentials = errors.New("INVALID_CREDENTIALS")
	ErrInvalidToken       = errors.New("INVALID_TOKEN")
)

type Service interface {
	Register(req RegisterRequest) (*AuthResponse, error)
	Login(req LoginRequest) (*AuthResponse, error)
	Refresh(refreshToken string) (*TokenResponse, error)
	Logout(refreshToken string) error
	GetCurrentUser(userID string) (*User, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Register(req RegisterRequest) (*AuthResponse, error) {
	existing, _, err := s.repo.GetUserByEmail(req.Email)
	if err != nil {
		return nil, fmt.Errorf("error checking existing user: %w", err)
	}
	if existing != nil {
		return nil, ErrUserAlreadyExists
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("error hashing password: %w", err)
	}

	user, err := s.repo.CreateUser(req.Email, string(hashedPassword), req.Name)
	if err != nil {
		return nil, fmt.Errorf("error creating user: %w", err)
	}

	accToken, refToken, expiresIn, err := shared.GenerateTokens(user.ID, user.Email)
	if err != nil {
		return nil, fmt.Errorf("error generating tokens: %w", err)
	}

	if err := s.repo.SaveRefreshToken(user.ID, refToken, time.Now().Add(30*24*time.Hour)); err != nil {
		return nil, fmt.Errorf("error saving refresh token: %w", err)
	}

	return &AuthResponse{
		User: *user,
		Tokens: Tokens{
			AccessToken:  accToken,
			RefreshToken: refToken,
			ExpiresIn:    expiresIn,
		},
	}, nil
}

func (s *service) Login(req LoginRequest) (*AuthResponse, error) {
	user, passwordHash, err := s.repo.GetUserByEmail(req.Email)
	if err != nil {
		return nil, fmt.Errorf("error querying user: %w", err)
	}
	if user == nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	accToken, refToken, expiresIn, err := shared.GenerateTokens(user.ID, user.Email)
	if err != nil {
		return nil, fmt.Errorf("error generating tokens: %w", err)
	}

	if err := s.repo.SaveRefreshToken(user.ID, refToken, time.Now().Add(30*24*time.Hour)); err != nil {
		return nil, fmt.Errorf("error saving refresh token: %w", err)
	}

	return &AuthResponse{
		User: *user,
		Tokens: Tokens{
			AccessToken:  accToken,
			RefreshToken: refToken,
			ExpiresIn:    expiresIn,
		},
	}, nil
}

func (s *service) Refresh(refreshToken string) (*TokenResponse, error) {
	userID, err := s.repo.IsRefreshTokenValid(refreshToken)
	if err != nil || userID == "" {
		return nil, ErrInvalidToken
	}

	user, err := s.repo.GetUserByID(userID)
	if err != nil || user == nil {
		return nil, ErrInvalidToken
	}

	accToken, _, expiresIn, err := shared.GenerateTokens(user.ID, user.Email)
	if err != nil {
		return nil, fmt.Errorf("error generating new access token: %w", err)
	}

	return &TokenResponse{
		AccessToken: accToken,
		ExpiresIn:   expiresIn,
	}, nil
}

func (s *service) Logout(refreshToken string) error {
	return s.repo.RevokeRefreshToken(refreshToken)
}

func (s *service) GetCurrentUser(userID string) (*User, error) {
	user, err := s.repo.GetUserByID(userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("USER_NOT_FOUND")
	}
	return user, nil
}

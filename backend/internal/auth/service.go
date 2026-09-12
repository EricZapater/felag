package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"felag/backend/internal/shared"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserAlreadyExists  = errors.New("USER_ALREADY_EXISTS")
	ErrInvalidCredentials = errors.New("INVALID_CREDENTIALS")
	ErrInvalidToken       = errors.New("INVALID_TOKEN")
	ErrInvalidOTP         = errors.New("INVALID_OTP")
	ErrTooManyAttempts    = errors.New("TOO_MANY_ATTEMPTS")
	ErrDeviceNotFound     = errors.New("DEVICE_NOT_FOUND")
)

type Service interface {
	Register(req RegisterRequest) (*AuthResponse, error)
	Login(req LoginRequest) (*AuthResponse, error)
	Refresh(refreshToken string) (*TokenResponse, error)
	Logout(refreshToken string) error
	GetCurrentUser(userID string) (*User, error)
	RequestOTP(email, deviceName, platform string) error
	VerifyOTP(email, code, deviceID, deviceName, platform, pushToken string) (*AuthResponse, error)
	ListUserDevices(userID string) ([]DeviceSummary, error)
	RevokeDevice(userID, deviceID string) error
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

	accToken, refToken, expiresIn, err := shared.GenerateTokens(user.ID, user.Email, user.Role)
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

	accToken, refToken, expiresIn, err := shared.GenerateTokens(user.ID, user.Email, user.Role)
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

	accToken, _, expiresIn, err := shared.GenerateTokens(user.ID, user.Email, user.Role)
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

func GenerateSecureOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()+100000), nil
}

func HashOTP(code string) string {
	hash := sha256.Sum256([]byte(code))
	return hex.EncodeToString(hash[:])
}

func (s *service) RequestOTP(email, deviceName, platform string) error {
	cleanEmail := strings.ToLower(strings.TrimSpace(email))
	if cleanEmail == "" {
		return errors.New("el correu electrònic és obligatori")
	}

	if deviceName == "" {
		deviceName = "Dispositiu"
	}
	if platform == "" {
		platform = "mobile"
	}

	code, err := GenerateSecureOTP()
	if err != nil {
		return fmt.Errorf("error generant codi OTP: %w", err)
	}

	codeHash := HashOTP(code)
	expiresAt := time.Now().Add(10 * time.Minute)

	if err := s.repo.SaveOTP(cleanEmail, codeHash, expiresAt); err != nil {
		return fmt.Errorf("error guardant OTP: %w", err)
	}

	// Simula/envia correu en català a la consola/mailer
	log.Printf("[AUTH] 📧 Correu enviat a %s: El teu codi d'inici de sessió a FELAG és %s (vàlid durant 10 minuts). Dispositiu: %s (%s)", cleanEmail, code, deviceName, platform)

	return nil
}

func (s *service) VerifyOTP(email, code, deviceID, deviceName, platform, pushToken string) (*AuthResponse, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(email))
	cleanCode := strings.TrimSpace(code)
	cleanDeviceID := strings.TrimSpace(deviceID)

	if cleanEmail == "" || cleanCode == "" || cleanDeviceID == "" {
		return nil, errors.New("dades d'entrada invàlides")
	}

	otp, err := s.repo.GetLatestValidOTP(cleanEmail)
	if err != nil {
		return nil, fmt.Errorf("error verificant OTP: %w", err)
	}
	if otp == nil {
		return nil, ErrInvalidOTP
	}

	if otp.Attempts >= 5 {
		return nil, ErrTooManyAttempts
	}

	expectedHash := HashOTP(cleanCode)
	if subtle.ConstantTimeCompare([]byte(otp.OTPCodeHash), []byte(expectedHash)) != 1 {
		_ = s.repo.IncrementOTPAttempts(otp.ID)
		return nil, ErrInvalidOTP
	}

	_ = s.repo.MarkOTPUsed(otp.ID)

	// Check if user exists, else create user
	user, _, err := s.repo.GetUserByEmail(cleanEmail)
	if err != nil {
		return nil, fmt.Errorf("error cercant usuari: %w", err)
	}

	if user == nil {
		userName := strings.Split(cleanEmail, "@")[0]
		if userName == "" {
			userName = "Felagi"
		}
		user, err = s.repo.CreateUser(cleanEmail, "", userName)
		if err != nil {
			return nil, fmt.Errorf("error creant usuari: %w", err)
		}
	}

	if deviceName == "" {
		deviceName = "Dispositiu"
	}
	if platform == "" {
		platform = "mobile"
	}

	var ptPtr *string
	cleanPushToken := strings.TrimSpace(pushToken)
	if cleanPushToken != "" {
		ptPtr = &cleanPushToken
	}

	if err := s.repo.UpsertUserDevice(user.ID, cleanDeviceID, deviceName, platform, ptPtr); err != nil {
		return nil, fmt.Errorf("error desant el dispositiu: %w", err)
	}

	accToken, refToken, expiresIn, err := shared.GenerateTokens(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, fmt.Errorf("error generant tokens: %w", err)
	}

	if err := s.repo.SaveRefreshToken(user.ID, refToken, time.Now().Add(30*24*time.Hour)); err != nil {
		return nil, fmt.Errorf("error guardant token de renovació: %w", err)
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

func (s *service) ListUserDevices(userID string) ([]DeviceSummary, error) {
	return s.repo.ListUserDevices(userID)
}

func (s *service) RevokeDevice(userID, deviceID string) error {
	err := s.repo.RevokeDevice(userID, deviceID)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrDeviceNotFound
	}
	return err
}


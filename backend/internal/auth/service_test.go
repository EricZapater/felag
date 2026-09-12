package auth

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

type mockAuthRepo struct {
	users         map[string]*User
	userPasswords map[string]string
	refreshTokens map[string]string
	otps          map[string][]*AuthOTP
	devices       map[string]map[string]*DeviceSummary
}

func newMockAuthRepo() *mockAuthRepo {
	return &mockAuthRepo{
		users:         make(map[string]*User),
		userPasswords: make(map[string]string),
		refreshTokens: make(map[string]string),
		otps:          make(map[string][]*AuthOTP),
		devices:       make(map[string]map[string]*DeviceSummary),
	}
}

func (m *mockAuthRepo) CreateUser(email, passwordHash, name string) (*User, error) {
	id := "user-" + email
	u := &User{
		ID:        id,
		Email:     email,
		Name:      name,
		Role:      "user",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	m.users[id] = u
	m.userPasswords[email] = passwordHash
	return u, nil
}

func (m *mockAuthRepo) GetUserByEmail(email string) (*User, string, error) {
	for _, u := range m.users {
		if u.Email == email {
			return u, m.userPasswords[email], nil
		}
	}
	return nil, "", nil
}

func (m *mockAuthRepo) GetUserByID(id string) (*User, error) {
	u, ok := m.users[id]
	if !ok {
		return nil, nil
	}
	return u, nil
}

func (m *mockAuthRepo) SaveRefreshToken(userID, token string, expiresAt time.Time) error {
	m.refreshTokens[token] = userID
	return nil
}

func (m *mockAuthRepo) IsRefreshTokenValid(token string) (string, error) {
	uid, ok := m.refreshTokens[token]
	if !ok {
		return "", nil
	}
	return uid, nil
}

func (m *mockAuthRepo) RevokeRefreshToken(token string) error {
	delete(m.refreshTokens, token)
	return nil
}

func (m *mockAuthRepo) SaveOTP(email, otpCodeHash string, expiresAt time.Time) error {
	otp := &AuthOTP{
		ID:          "otp-" + email,
		Email:       email,
		OTPCodeHash: otpCodeHash,
		ExpiresAt:   expiresAt,
		Attempts:    0,
		Used:        false,
		CreatedAt:   time.Now(),
	}
	m.otps[email] = append(m.otps[email], otp)
	return nil
}

func (m *mockAuthRepo) GetLatestValidOTP(email string) (*AuthOTP, error) {
	list := m.otps[email]
	for i := len(list) - 1; i >= 0; i-- {
		otp := list[i]
		if !otp.Used && otp.ExpiresAt.After(time.Now()) {
			return otp, nil
		}
	}
	return nil, nil
}

func (m *mockAuthRepo) IncrementOTPAttempts(otpID string) error {
	for _, list := range m.otps {
		for _, otp := range list {
			if otp.ID == otpID {
				otp.Attempts++
				return nil
			}
		}
	}
	return nil
}

func (m *mockAuthRepo) MarkOTPUsed(otpID string) error {
	for _, list := range m.otps {
		for _, otp := range list {
			if otp.ID == otpID {
				otp.Used = true
				return nil
			}
		}
	}
	return nil
}

func (m *mockAuthRepo) UpsertUserDevice(userID, deviceID, deviceName, platform string, pushToken *string) error {
	if m.devices[userID] == nil {
		m.devices[userID] = make(map[string]*DeviceSummary)
	}
	d := &DeviceSummary{
		ID:           "dev-" + deviceID,
		UserID:       userID,
		DeviceID:     deviceID,
		DeviceName:   deviceName,
		Platform:     platform,
		PushToken:    pushToken,
		LastActiveAt: time.Now(),
		CreatedAt:    time.Now(),
	}
	m.devices[userID][deviceID] = d
	return nil
}

func (m *mockAuthRepo) ListUserDevices(userID string) ([]DeviceSummary, error) {
	var list []DeviceSummary
	for _, d := range m.devices[userID] {
		list = append(list, *d)
	}
	return list, nil
}

func (m *mockAuthRepo) RevokeDevice(userID, deviceID string) error {
	if m.devices[userID] == nil {
		return sql.ErrNoRows
	}
	for idKey, d := range m.devices[userID] {
		if d.ID == deviceID || d.DeviceID == deviceID {
			delete(m.devices[userID], idKey)
			return nil
		}
	}
	return sql.ErrNoRows
}

func TestAuthService_OTP_FullFlow(t *testing.T) {
	repo := newMockAuthRepo()
	svc := NewService(repo)

	email := "felagi@example.cat"
	deviceName := "iPhone 15"
	platform := "ios"

	// 1. Request OTP
	err := svc.RequestOTP(email, deviceName, platform)
	if err != nil {
		t.Fatalf("unexpected error requesting OTP: %v", err)
	}

	otps := repo.otps[email]
	if len(otps) != 1 {
		t.Fatalf("expected 1 OTP stored, got %d", len(otps))
	}
	storedOTP := otps[0]

	// 2. Verify with invalid code
	_, err = svc.VerifyOTP(email, "000000", "dev-123", deviceName, platform, "push-tok-123")
	if !errors.Is(err, ErrInvalidOTP) {
		t.Fatalf("expected ErrInvalidOTP, got %v", err)
	}
	if storedOTP.Attempts != 1 {
		t.Errorf("expected 1 attempt, got %d", storedOTP.Attempts)
	}

	// 3. Find correct code by testing hash or manually setting OTP code
	code := "123456"
	storedOTP.OTPCodeHash = HashOTP(code)

	authResp, err := svc.VerifyOTP(email, code, "dev-123", deviceName, platform, "push-tok-123")
	if err != nil {
		t.Fatalf("unexpected error verifying correct OTP: %v", err)
	}

	if authResp.User.Email != email {
		t.Errorf("expected user email %s, got %s", email, authResp.User.Email)
	}
	if authResp.Tokens.AccessToken == "" || authResp.Tokens.RefreshToken == "" {
		t.Errorf("expected non-empty tokens, got %+v", authResp.Tokens)
	}
	if !storedOTP.Used {
		t.Errorf("expected OTP to be marked as used")
	}

	// 4. List devices
	devices, err := svc.ListUserDevices(authResp.User.ID)
	if err != nil {
		t.Fatalf("unexpected error listing devices: %v", err)
	}
	if len(devices) != 1 {
		t.Fatalf("expected 1 device, got %d", len(devices))
	}
	if devices[0].DeviceID != "dev-123" || devices[0].Platform != "ios" {
		t.Errorf("unexpected device details: %+v", devices[0])
	}

	// 5. Revoke device
	err = svc.RevokeDevice(authResp.User.ID, "dev-123")
	if err != nil {
		t.Fatalf("unexpected error revoking device: %v", err)
	}

	devicesAfter, err := svc.ListUserDevices(authResp.User.ID)
	if err != nil {
		t.Fatalf("unexpected error listing devices after revoke: %v", err)
	}
	if len(devicesAfter) != 0 {
		t.Errorf("expected 0 devices after revoke, got %d", len(devicesAfter))
	}

	// 6. Revoke non-existent device
	err = svc.RevokeDevice(authResp.User.ID, "non-existent")
	if !errors.Is(err, ErrDeviceNotFound) {
		t.Errorf("expected ErrDeviceNotFound, got %v", err)
	}
}

func TestAuthHandler_OTPAndDevices(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := newMockAuthRepo()
	svc := NewService(repo)
	handler := NewHandler(svc)

	r := gin.New()
	r.POST("/auth/otp/request", handler.RequestOTP)
	r.POST("/auth/otp/verify", handler.VerifyOTP)
	r.GET("/auth/devices", func(c *gin.Context) {
		c.Set("user_id", "user-test@example.cat")
		handler.ListDevices(c)
	})
	r.DELETE("/auth/devices/:id", func(c *gin.Context) {
		c.Set("user_id", "user-test@example.cat")
		handler.RevokeDevice(c)
	})

	// 1. POST /auth/otp/request
	reqBody, _ := json.Marshal(OTPRequest{
		Email:      "test@example.cat",
		DeviceName: "Android Phone",
		Platform:   "android",
	})
	req, _ := http.NewRequest(http.MethodPost, "/auth/otp/request", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	// Inject known hash into stored OTP
	otps := repo.otps["test@example.cat"]
	if len(otps) != 1 {
		t.Fatalf("expected 1 stored OTP")
	}
	otps[0].OTPCodeHash = HashOTP("654321")

	// 2. POST /auth/otp/verify
	verifyBody, _ := json.Marshal(OTPVerifyRequest{
		Email:      "test@example.cat",
		Code:       "654321",
		DeviceID:   "device-abc",
		DeviceName: "Android Phone",
		Platform:   "android",
		PushToken:  "ExponentPushToken[xyz]",
	})
	req2, _ := http.NewRequest(http.MethodPost, "/auth/otp/verify", bytes.NewBuffer(verifyBody))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected status 200 on verify, got %d. Body: %s", w2.Code, w2.Body.String())
	}

	var authResp AuthResponse
	if err := json.Unmarshal(w2.Body.Bytes(), &authResp); err != nil {
		t.Fatalf("failed to decode verify response: %v", err)
	}
	if authResp.User.Email != "test@example.cat" {
		t.Errorf("expected email test@example.cat, got %s", authResp.User.Email)
	}

	// 3. GET /auth/devices
	req3, _ := http.NewRequest(http.MethodGet, "/auth/devices", nil)
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, req3)

	if w3.Code != http.StatusOK {
		t.Fatalf("expected status 200 on list devices, got %d", w3.Code)
	}

	// 4. DELETE /auth/devices/:id
	req4, _ := http.NewRequest(http.MethodDelete, "/auth/devices/device-abc", nil)
	w4 := httptest.NewRecorder()
	r.ServeHTTP(w4, req4)

	if w4.Code != http.StatusOK {
		t.Fatalf("expected status 200 on delete device, got %d", w4.Code)
	}
}

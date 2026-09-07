package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"felag/backend/internal/posttrip"
	"felag/backend/internal/storage"
	"github.com/gin-gonic/gin"
)

type mockPostTripRepo struct {
	photos []posttrip.TripPhoto
}

func (m *mockPostTripRepo) GetActiveTripForUser(userID string) (*posttrip.ActiveTripInfo, error) {
	return nil, nil
}
func (m *mockPostTripRepo) GetTripAccessInfo(tripID string) (*posttrip.TripAccessInfo, error) {
	return &posttrip.TripAccessInfo{
		ID:     tripID,
		UserID: "user-1",
	}, nil
}
func (m *mockPostTripRepo) ListPhotos(tripID string) ([]posttrip.TripPhoto, error) {
	return m.photos, nil
}
func (m *mockPostTripRepo) GetPhoto(tripID, photoID string) (*posttrip.TripPhoto, error) {
	for _, p := range m.photos {
		if p.ID == photoID {
			return &p, nil
		}
	}
	return nil, nil
}
func (m *mockPostTripRepo) AddPhoto(tripID, userID string, req posttrip.AddTripPhotoRequest) (*posttrip.TripPhoto, error) {
	p := posttrip.TripPhoto{
		ID:           fmt.Sprintf("photo-%d", len(m.photos)+1),
		TripID:       tripID,
		UserID:       userID,
		ImageURL:     req.ImageURL,
		Caption:      req.Caption,
		LocationName: req.LocationName,
	}
	m.photos = append(m.photos, p)
	return &p, nil
}
func (m *mockPostTripRepo) TogglePhotoFeatured(tripID, photoID string) (*posttrip.TripPhoto, error) {
	return nil, nil
}
func (m *mockPostTripRepo) DeletePhoto(tripID, photoID, userID string) error { return nil }
func (m *mockPostTripRepo) ListCelebrationCards(tripID string) ([]posttrip.CelebrationCard, error) {
	return nil, nil
}
func (m *mockPostTripRepo) CreateCelebrationCard(tripID, user1ID, user2ID string, matchID *string, imageURL, title, headline string, subheadline *string, locationName string) (*posttrip.CelebrationCard, error) {
	return nil, nil
}
func (m *mockPostTripRepo) GetUserOriginSummary(userID string) (*posttrip.UserOriginSummary, error) {
	return nil, nil
}
func (m *mockPostTripRepo) FindMatchID(user1ID, user2ID, tripID string) (*string, error) {
	return nil, nil
}
func (m *mockPostTripRepo) GetWrapupStatus(tripID, userID string) (*posttrip.WrapupStatus, error) {
	return nil, nil
}
func (m *mockPostTripRepo) UpdateWrapupTask(tripID, userID string, celebration, feedback, stories *bool) error {
	return nil
}
func (m *mockPostTripRepo) CreateFeedback(tripID, userID string, rating int, comments *string) error {
	return nil
}
func (m *mockPostTripRepo) InsertDestinationRecommendation(townID, countryCode *string, userID, category, title, description string, imageURL, locationName *string) error {
	return nil
}
func (m *mockPostTripRepo) GetTripTownAndCountry(tripID string) (townID, countryCode *string, err error) {
	return nil, nil, nil
}
func (m *mockPostTripRepo) GetStoriesCardData(tripID, userID string) (*posttrip.StoriesCardData, error) {
	return nil, nil
}

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func setupTestRouter(storageSvc storage.StorageService, postTripRepo *mockPostTripRepo) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	posttripSvc := posttrip.NewService(postTripRepo)
	posttripSvc.SetStorageService(storageSvc)
	posttripH := posttrip.NewHandler(posttripSvc)

	// Inject test user in middleware
	v1 := r.Group("/api/v1")
	v1.Use(func(c *gin.Context) {
		c.Set("user_id", "user-1")
		c.Next()
	})
	{
		v1.POST("/trips/:trip_id/photos", posttripH.AddPhoto)
		v1.GET("/trips/:trip_id/photos", posttripH.ListPhotos)
	}

	return r
}

func TestE2E_TripPhoto_Base64_UploadedToR2(t *testing.T) {
	var uploadedToR2 bool
	var r2Key string
	var r2Auth string

	mockHTTP := &http.Client{
		Transport: roundTripperFunc(func(r *http.Request) (*http.Response, error) {
			uploadedToR2 = true
			r2Key = r.URL.Path
			r2Auth = r.Header.Get("Authorization")
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader("")),
				Header:     make(http.Header),
			}, nil
		}),
	}

	// Configure R2 storage
	r2Cfg := storage.Config{
		AccountID:       "test-account-id",
		Bucket:          "felag-media-bucket",
		AccessKeyID:     "test-r2-key",
		SecretAccessKey: "test-r2-secret",
		Region:          "auto",
		PublicURL:       "https://media.felag.app",
		HTTPClient:      mockHTTP,
	}
	storageSvc := storage.NewStorageServiceWithConfig(r2Cfg)

	if !storageSvc.IsR2Enabled() {
		t.Fatalf("expected R2 to be enabled")
	}

	postTripRepo := &mockPostTripRepo{}
	router := setupTestRouter(storageSvc, postTripRepo)

	// 1. Post a Trip Photo using Base64 data URI (as the frontend sends)
	base64Photo := "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
	caption := "Foto a Shibuya Crossing"
	loc := "Tokyo"

	reqBody, _ := json.Marshal(posttrip.AddTripPhotoRequest{
		ImageURL:     base64Photo,
		Caption:      &caption,
		LocationName: &loc,
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/trips/trip-tokyo-101/photos", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201 Created, got %d. Body: %s", w.Code, w.Body.String())
	}

	if !uploadedToR2 {
		t.Errorf("expected photo to be uploaded to R2 via S3 client")
	}
	if !strings.Contains(r2Key, "trips/trip_trip-tokyo-101_") {
		t.Errorf("expected R2 key path to contain trips/trip_trip-tokyo-101_, got %s", r2Key)
	}
	if !strings.Contains(r2Auth, "Credential=test-r2-key") {
		t.Errorf("expected R2 Authorization header with credentials, got %s", r2Auth)
	}

	var createdPhoto posttrip.TripPhoto
	_ = json.Unmarshal(w.Body.Bytes(), &createdPhoto)

	if createdPhoto.ImageURL == base64Photo {
		t.Errorf("expected stored image_url to be the R2 public URL, but got raw base64")
	}
	if !strings.HasPrefix(createdPhoto.ImageURL, "https://media.felag.app/trips/trip_trip-tokyo-101_") {
		t.Errorf("expected R2 public URL https://media.felag.app/trips/trip_..., got %s", createdPhoto.ImageURL)
	}

	// 2. Query photos list and verify stored photo has the R2 public URL
	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/trips/trip-tokyo-101/photos", nil)
	getW := httptest.NewRecorder()
	router.ServeHTTP(getW, getReq)

	if getW.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for list photos, got %d", getW.Code)
	}

	var photosList []posttrip.TripPhoto
	_ = json.Unmarshal(getW.Body.Bytes(), &photosList)

	if len(photosList) != 1 {
		t.Fatalf("expected 1 photo in list, got %d", len(photosList))
	}
	if photosList[0].ImageURL != createdPhoto.ImageURL {
		t.Errorf("expected photo in list to have R2 URL %s, got %s", createdPhoto.ImageURL, photosList[0].ImageURL)
	}
}

func TestE2E_TripPhoto_Multipart_UploadedToR2(t *testing.T) {
	var uploadedToR2 bool
	var r2Key string

	mockHTTP := &http.Client{
		Transport: roundTripperFunc(func(r *http.Request) (*http.Response, error) {
			uploadedToR2 = true
			r2Key = r.URL.Path
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader("")),
				Header:     make(http.Header),
			}, nil
		}),
	}

	r2Cfg := storage.Config{
		AccountID:       "test-account-id",
		Bucket:          "felag-media-bucket",
		AccessKeyID:     "test-r2-key",
		SecretAccessKey: "test-r2-secret",
		Region:          "auto",
		PublicURL:       "https://media.felag.app",
		HTTPClient:      mockHTTP,
	}
	storageSvc := storage.NewStorageServiceWithConfig(r2Cfg)

	postTripRepo := &mockPostTripRepo{}
	router := setupTestRouter(storageSvc, postTripRepo)

	var b bytes.Buffer
	mw := multipart.NewWriter(&b)
	part, err := mw.CreateFormFile("file", "sunset.jpg")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	_, _ = part.Write([]byte("jpeg-image-binary-data"))
	_ = mw.WriteField("caption", "Posta de sol")
	_ = mw.WriteField("location_name", "Kyoto")
	_ = mw.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/trips/trip-kyoto-202/photos", &b)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201 Created, got %d. Body: %s", w.Code, w.Body.String())
	}

	if !uploadedToR2 {
		t.Errorf("expected multipart file to be uploaded to R2")
	}
	if !strings.Contains(r2Key, "trips/trip_trip-kyoto-202_") {
		t.Errorf("expected R2 key path to contain trips/trip_trip-kyoto-202_, got %s", r2Key)
	}

	var createdPhoto posttrip.TripPhoto
	_ = json.Unmarshal(w.Body.Bytes(), &createdPhoto)

	if !strings.HasPrefix(createdPhoto.ImageURL, "https://media.felag.app/trips/trip_trip-kyoto-202_") {
		t.Errorf("expected R2 public URL, got %s", createdPhoto.ImageURL)
	}
}

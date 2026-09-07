package posttrip

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"felag/backend/internal/storage"
	"github.com/gin-gonic/gin"
)

type mockPostTripService struct {
	Service
	addPhotoFunc func(userID, tripID string, req AddTripPhotoRequest) (*TripPhoto, error)
	storageSvc   storage.StorageService
}

func (m *mockPostTripService) AddPhoto(userID, tripID string, req AddTripPhotoRequest) (*TripPhoto, error) {
	if m.addPhotoFunc != nil {
		return m.addPhotoFunc(userID, tripID, req)
	}
	return &TripPhoto{
		ID:        "photo-1",
		TripID:    tripID,
		UserID:    userID,
		ImageURL:  req.ImageURL,
		Caption:   req.Caption,
		CreatedAt: time.Now(),
	}, nil
}

func (m *mockPostTripService) GetStorageService() storage.StorageService {
	if m.storageSvc == nil {
		m.storageSvc = storage.NewStorageService()
	}
	return m.storageSvc
}

func TestHandler_AddPhoto_JSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var capturedReq AddTripPhotoRequest
	svc := &mockPostTripService{
		addPhotoFunc: func(userID, tripID string, req AddTripPhotoRequest) (*TripPhoto, error) {
			capturedReq = req
			return &TripPhoto{
				ID:        "photo-1",
				TripID:    tripID,
				UserID:    userID,
				ImageURL:  req.ImageURL,
				CreatedAt: time.Now(),
			}, nil
		},
	}

	h := NewHandler(svc)

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user_id", "user-123")
		c.Next()
	})
	r.POST("/trips/:trip_id/photos", h.AddPhoto)

	payload := map[string]string{
		"image_url": "https://example.com/mountain.jpg",
		"caption":   "Vistes increïbles",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/trips/trip-999/photos", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d. Body: %s", w.Code, w.Body.String())
	}

	if capturedReq.ImageURL != "https://example.com/mountain.jpg" {
		t.Errorf("expected image_url to match, got %s", capturedReq.ImageURL)
	}
}

func TestHandler_AddPhoto_Multipart(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var capturedReq AddTripPhotoRequest
	svc := &mockPostTripService{
		addPhotoFunc: func(userID, tripID string, req AddTripPhotoRequest) (*TripPhoto, error) {
			capturedReq = req
			return &TripPhoto{
				ID:        "photo-1",
				TripID:    tripID,
				UserID:    userID,
				ImageURL:  req.ImageURL,
				CreatedAt: time.Now(),
			}, nil
		},
	}

	h := NewHandler(svc)

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user_id", "user-123")
		c.Next()
	})
	r.POST("/trips/:trip_id/photos", h.AddPhoto)

	var b bytes.Buffer
	mw := multipart.NewWriter(&b)
	part, err := mw.CreateFormFile("file", "photo.jpg")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	_, _ = part.Write([]byte("image-data-bytes"))
	_ = mw.WriteField("caption", "Selfie al mirador")
	_ = mw.Close()

	req := httptest.NewRequest(http.MethodPost, "/trips/trip-999/photos", &b)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d. Body: %s", w.Code, w.Body.String())
	}

	if !strings.HasPrefix(capturedReq.ImageURL, "http://localhost:8080/static/trips/trip_trip-999_") && !strings.HasPrefix(capturedReq.ImageURL, "https://") {
		t.Errorf("expected uploaded image URL, got: %s", capturedReq.ImageURL)
	}
	if capturedReq.Caption == nil || *capturedReq.Caption != "Selfie al mirador" {
		t.Errorf("expected caption 'Selfie al mirador', got %v", capturedReq.Caption)
	}
}

package storage

import (
	"context"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestStorageLocalFallback(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "felag_storage_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	cfg := Config{
		UploadDir: tempDir,
		BaseURL:   "http://localhost:8080",
	}
	svc := NewStorageServiceWithConfig(cfg)

	if svc.IsR2Enabled() {
		t.Errorf("expected R2 to be disabled")
	}

	ctx := context.Background()

	// 1. Test raw upload
	url, err := svc.Upload(ctx, "trips", "test.jpg", []byte("fake-jpeg-data"), "image/jpeg")
	if err != nil {
		t.Fatalf("unexpected upload error: %v", err)
	}
	expectedURL := "http://localhost:8080/static/trips/test.jpg"
	if url != expectedURL {
		t.Errorf("expected url %s, got %s", expectedURL, url)
	}

	// Verify file was written to disk
	savedPath := filepath.Join(tempDir, "trips", "test.jpg")
	content, err := os.ReadFile(savedPath)
	if err != nil {
		t.Fatalf("file was not written to disk: %v", err)
	}
	if string(content) != "fake-jpeg-data" {
		t.Errorf("file content mismatch, got %s", string(content))
	}

	// 2. Test Base64 upload
	base64Img := "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
	if !svc.IsBase64Image(base64Img) {
		t.Errorf("expected IsBase64Image to return true")
	}

	b64URL, err := svc.UploadBase64(ctx, "trips", "trip123", base64Img)
	if err != nil {
		t.Fatalf("UploadBase64 error: %v", err)
	}
	if !strings.HasPrefix(b64URL, "http://localhost:8080/static/trips/trip123_") || !strings.HasSuffix(b64URL, ".png") {
		t.Errorf("unexpected b64URL: %s", b64URL)
	}
}

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestStorageR2Upload(t *testing.T) {
	var receivedAuth string
	var receivedContentSha string
	var receivedContentType string
	var receivedBody []byte

	mockClient := &http.Client{
		Transport: roundTripperFunc(func(r *http.Request) (*http.Response, error) {
			receivedAuth = r.Header.Get("Authorization")
			receivedContentSha = r.Header.Get("x-amz-content-sha256")
			receivedContentType = r.Header.Get("Content-Type")
			receivedBody, _ = io.ReadAll(r.Body)

			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader("")),
				Header:     make(http.Header),
			}, nil
		}),
	}

	cfg := Config{
		Endpoint:        "https://0123456789abcdef.r2.cloudflarestorage.com",
		Bucket:          "felag-media",
		AccessKeyID:     "test-key-id",
		SecretAccessKey: "test-secret-key",
		Region:          "auto",
		PublicURL:       "https://media.felag.app",
		HTTPClient:      mockClient,
	}

	svc := NewStorageServiceWithConfig(cfg)
	if !svc.IsR2Enabled() {
		t.Fatalf("expected R2 to be enabled")
	}

	ctx := context.Background()
	publicURL, err := svc.Upload(ctx, "avatars", "user1.jpg", []byte("avatar-bytes"), "image/jpeg")
	if err != nil {
		t.Fatalf("upload to mock R2 failed: %v", err)
	}

	expectedPublicURL := "https://media.felag.app/avatars/user1.jpg"
	if publicURL != expectedPublicURL {
		t.Errorf("expected public url %s, got %s", expectedPublicURL, publicURL)
	}

	if !strings.Contains(receivedAuth, "AWS4-HMAC-SHA256 Credential=test-key-id") {
		t.Errorf("authorization header missing expected credentials, got: %s", receivedAuth)
	}
	if receivedContentType != "image/jpeg" {
		t.Errorf("expected content type image/jpeg, got: %s", receivedContentType)
	}
	if receivedContentSha == "" {
		t.Errorf("expected x-amz-content-sha256 header")
	}
	if string(receivedBody) != "avatar-bytes" {
		t.Errorf("expected body 'avatar-bytes', got '%s'", string(receivedBody))
	}
}

package storage

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// StorageService defines the interface for file/image storage operations.
type StorageService interface {
	// Upload stores raw bytes under folder/filename and returns the public accessible URL.
	Upload(ctx context.Context, folder, filename string, data []byte, contentType string) (string, error)
	// UploadFileHeader reads and uploads a multipart.FileHeader.
	UploadFileHeader(ctx context.Context, folder, prefix string, fileHeader *multipart.FileHeader) (string, error)
	// UploadBase64 decodes a Base64 data URL and uploads it to storage, returning the public URL.
	UploadBase64(ctx context.Context, folder, prefix, base64Data string) (string, error)
	// IsBase64Image returns true if the input string is a base64-encoded image.
	IsBase64Image(data string) bool
	// IsR2Enabled returns true if Cloudflare R2 is configured and active.
	IsR2Enabled() bool
}

type storageService struct {
	isR2            bool
	r2Endpoint      string
	r2AccountID     string
	r2Bucket        string
	r2AccessKeyID   string
	r2SecretKey     string
	r2Region        string
	r2PublicURL     string
	localUploadDir  string
	localBaseURL    string
	httpClient      *http.Client
}

// Config holds options to initialize the storage service.
type Config struct {
	AccountID       string
	Endpoint        string
	Bucket          string
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	PublicURL       string
	UploadDir       string
	BaseURL         string
	HTTPClient      *http.Client
}

// NewStorageService creates a StorageService from environment variables.
func NewStorageService() StorageService {
	accountID := strings.TrimSpace(getEnvAny("R2_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"))
	accessKeyID := strings.TrimSpace(getEnvAny("R2_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID"))
	secretAccessKey := strings.TrimSpace(getEnvAny("R2_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY"))
	bucket := strings.TrimSpace(getEnvAny("R2_BUCKET_NAME", "R2_BUCKET", "AWS_S3_BUCKET"))
	endpoint := strings.TrimSpace(os.Getenv("R2_ENDPOINT"))
	region := strings.TrimSpace(getEnvAny("R2_REGION", "AWS_REGION"))
	if region == "" {
		region = "auto"
	}
	publicURL := strings.TrimSpace(getEnvAny("R2_PUBLIC_URL", "STORAGE_PUBLIC_URL"))
	uploadDir := strings.TrimSpace(os.Getenv("UPLOAD_DIR"))
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	baseURL := strings.TrimSpace(os.Getenv("BASE_URL"))
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}

	return NewStorageServiceWithConfig(Config{
		AccountID:       accountID,
		Endpoint:        endpoint,
		Bucket:          bucket,
		AccessKeyID:     accessKeyID,
		SecretAccessKey: secretAccessKey,
		Region:          region,
		PublicURL:       publicURL,
		UploadDir:       uploadDir,
		BaseURL:         baseURL,
	})
}

// NewStorageServiceWithConfig creates a StorageService with the provided Config.
func NewStorageServiceWithConfig(cfg Config) StorageService {
	isR2 := (cfg.AccountID != "" || cfg.Endpoint != "") &&
		cfg.AccessKeyID != "" &&
		cfg.SecretAccessKey != "" &&
		cfg.Bucket != ""

	endpoint := cfg.Endpoint
	if endpoint == "" && cfg.AccountID != "" {
		endpoint = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.AccountID)
	}

	if isR2 {
		log.Printf("[Storage] Initialized with Cloudflare R2 (bucket: %s, endpoint: %s)", cfg.Bucket, endpoint)
	} else {
		log.Printf("[Storage] Cloudflare R2 credentials not fully provided; fallback to local disk storage (%s)", cfg.UploadDir)
	}

	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}

	return &storageService{
		isR2:           isR2,
		r2Endpoint:     strings.TrimRight(endpoint, "/"),
		r2AccountID:    cfg.AccountID,
		r2Bucket:       cfg.Bucket,
		r2AccessKeyID:  cfg.AccessKeyID,
		r2SecretKey:    cfg.SecretAccessKey,
		r2Region:       cfg.Region,
		r2PublicURL:    strings.TrimRight(cfg.PublicURL, "/"),
		localUploadDir: cfg.UploadDir,
		localBaseURL:   strings.TrimRight(cfg.BaseURL, "/"),
		httpClient:     client,
	}
}

func (s *storageService) IsR2Enabled() bool {
	return s.isR2
}

var dataURIRegex = regexp.MustCompile(`^data:(image\/[a-zA-Z0-9\+\.\-]+);base64,(.+)$`)

func (s *storageService) IsBase64Image(data string) bool {
	data = strings.TrimSpace(data)
	if strings.HasPrefix(data, "data:image/") {
		return true
	}
	// Heuristic: if it's long, has no spaces/newlines, and is valid base64
	if len(data) > 100 && !strings.HasPrefix(data, "http://") && !strings.HasPrefix(data, "https://") && !strings.HasPrefix(data, "/") {
		_, err := base64.StdEncoding.DecodeString(data)
		return err == nil
	}
	return false
}

func (s *storageService) UploadBase64(ctx context.Context, folder, prefix, base64Data string) (string, error) {
	base64Data = strings.TrimSpace(base64Data)
	var rawBytes []byte
	var contentType string
	var ext string

	if matches := dataURIRegex.FindStringSubmatch(base64Data); len(matches) == 3 {
		contentType = matches[1]
		decoded, err := base64.StdEncoding.DecodeString(matches[2])
		if err != nil {
			return "", fmt.Errorf("invalid base64 payload: %w", err)
		}
		rawBytes = decoded
	} else {
		decoded, err := base64.StdEncoding.DecodeString(base64Data)
		if err != nil {
			return "", fmt.Errorf("invalid base64 string: %w", err)
		}
		rawBytes = decoded
		contentType = http.DetectContentType(rawBytes)
	}

	ext = extensionFromContentType(contentType)
	randomID := generateRandomID(8)
	timestamp := time.Now().UnixNano()
	filename := fmt.Sprintf("%s_%d_%s%s", sanitizeName(prefix), timestamp, randomID, ext)

	return s.Upload(ctx, folder, filename, rawBytes, contentType)
}

func (s *storageService) UploadFileHeader(ctx context.Context, folder, prefix string, fileHeader *multipart.FileHeader) (string, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return "", fmt.Errorf("error opening file: %w", err)
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return "", fmt.Errorf("error reading file data: %w", err)
	}

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = http.DetectContentType(data)
	}

	origExt := filepath.Ext(fileHeader.Filename)
	if origExt == "" {
		origExt = extensionFromContentType(contentType)
	}

	randomID := generateRandomID(8)
	timestamp := time.Now().UnixNano()
	cleanPrefix := sanitizeName(prefix)
	if cleanPrefix == "" {
		cleanPrefix = "upload"
	}
	filename := fmt.Sprintf("%s_%d_%s%s", cleanPrefix, timestamp, randomID, origExt)

	return s.Upload(ctx, folder, filename, data, contentType)
}

func (s *storageService) Upload(ctx context.Context, folder, filename string, data []byte, contentType string) (string, error) {
	folder = strings.Trim(folder, "/")
	filename = strings.TrimLeft(filename, "/")
	key := filename
	if folder != "" {
		key = fmt.Sprintf("%s/%s", folder, filename)
	}

	if s.isR2 {
		return s.uploadToR2(ctx, key, data, contentType)
	}
	return s.uploadToLocal(folder, filename, data)
}

func (s *storageService) uploadToLocal(folder, filename string, data []byte) (string, error) {
	targetDir := s.localUploadDir
	if folder != "" {
		targetDir = filepath.Join(s.localUploadDir, folder)
	}

	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return "", fmt.Errorf("error creating local directory %s: %w", targetDir, err)
	}

	targetPath := filepath.Join(targetDir, filename)
	if err := os.WriteFile(targetPath, data, 0644); err != nil {
		return "", fmt.Errorf("error writing local file %s: %w", targetPath, err)
	}

	var publicURL string
	if folder != "" {
		publicURL = fmt.Sprintf("%s/static/%s/%s", s.localBaseURL, folder, filename)
	} else {
		publicURL = fmt.Sprintf("%s/static/%s", s.localBaseURL, filename)
	}
	return publicURL, nil
}

func (s *storageService) uploadToR2(ctx context.Context, key string, data []byte, contentType string) (string, error) {
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// S3 URL: https://<account_id>.r2.cloudflarestorage.com/<bucket>/<key>
	reqURL := fmt.Sprintf("%s/%s/%s", s.r2Endpoint, s.r2Bucket, key)
	parsedURL, err := url.Parse(reqURL)
	if err != nil {
		return "", fmt.Errorf("invalid R2 URL: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, reqURL, bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("failed to create http request: %w", err)
	}

	// Payload SHA256
	payloadHash := sha256.Sum256(data)
	payloadHashHex := hex.EncodeToString(payloadHash[:])

	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")

	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Content-Length", fmt.Sprintf("%d", len(data)))
	req.Header.Set("Host", parsedURL.Host)
	req.Header.Set("x-amz-date", amzDate)
	req.Header.Set("x-amz-content-sha256", payloadHashHex)

	// Build AWS SigV4 authorization
	signedHeaders := "content-length;content-type;host;x-amz-content-sha256;x-amz-date"
	canonicalHeaders := fmt.Sprintf("content-length:%d\ncontent-type:%s\nhost:%s\nx-amz-content-sha256:%s\nx-amz-date:%s\n",
		len(data), contentType, parsedURL.Host, payloadHashHex, amzDate)

	canonicalURI := parsedURL.EscapedPath()
	canonicalRequest := fmt.Sprintf("PUT\n%s\n\n%s\n%s\n%s",
		canonicalURI, canonicalHeaders, signedHeaders, payloadHashHex)

	canonicalReqHash := sha256.Sum256([]byte(canonicalRequest))
	canonicalReqHashHex := hex.EncodeToString(canonicalReqHash[:])

	credentialScope := fmt.Sprintf("%s/%s/s3/aws4_request", dateStamp, s.r2Region)
	stringToSign := fmt.Sprintf("AWS4-HMAC-SHA256\n%s\n%s\n%s",
		amzDate, credentialScope, canonicalReqHashHex)

	signingKey := getSignatureKey(s.r2SecretKey, dateStamp, s.r2Region, "s3")
	signature := hex.EncodeToString(hmacSHA256(signingKey, []byte(stringToSign)))

	authHeader := fmt.Sprintf("AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		s.r2AccessKeyID, credentialScope, signedHeaders, signature)
	req.Header.Set("Authorization", authHeader)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("R2 upload request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("R2 upload returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Construct public URL
	if s.r2PublicURL != "" {
		return fmt.Sprintf("%s/%s", s.r2PublicURL, key), nil
	}
	return fmt.Sprintf("%s/%s/%s", s.r2Endpoint, s.r2Bucket, key), nil
}

func hmacSHA256(key []byte, data []byte) []byte {
	h := hmac.New(sha256.New, key)
	h.Write(data)
	return h.Sum(nil)
}

func getSignatureKey(key, dateStamp, regionName, serviceName string) []byte {
	kDate := hmacSHA256([]byte("AWS4"+key), []byte(dateStamp))
	kRegion := hmacSHA256(kDate, []byte(regionName))
	kService := hmacSHA256(kRegion, []byte(serviceName))
	kSigning := hmacSHA256(kService, []byte("aws4_request"))
	return kSigning
}

func extensionFromContentType(contentType string) string {
	switch strings.ToLower(strings.Split(contentType, ";")[0]) {
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	case "image/svg+xml":
		return ".svg"
	default:
		return ".jpg"
	}
}

func generateRandomID(length int) string {
	b := make([]byte, length)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func sanitizeName(name string) string {
	reg := regexp.MustCompile(`[^a-zA-Z0-9_-]`)
	clean := reg.ReplaceAllString(name, "_")
	return strings.Trim(clean, "_")
}

func getEnvAny(keys ...string) string {
	for _, k := range keys {
		v := os.Getenv(k)
		if v != "" {
			return v
		}
	}
	return ""
}

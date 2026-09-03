package shared

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"sync"
)

var (
	ErrInvalidCiphertext = errors.New("invalid ciphertext or decryption failed")
	ErrEmptyPlaintext    = errors.New("plaintext cannot be empty")
)

var (
	cachedKey     []byte
	cachedKeyOnce sync.Once
)

// GetChatEncryptionKey retrieves and normalizes the AES-256 encryption key (32 bytes).
func GetChatEncryptionKey() []byte {
	raw := os.Getenv("CHAT_ENCRYPTION_KEY")
	if raw == "" {
		raw = "felag_default_chat_aes_256_secret_key_32b!"
	}

	// If exactly 32 bytes
	if len(raw) == 32 {
		return []byte(raw)
	}

	// Try hex decoding (64 hex characters = 32 bytes)
	if len(raw) == 64 {
		if decoded, err := hex.DecodeString(raw); err == nil && len(decoded) == 32 {
			return decoded
		}
	}

	// Try base64 decoding (44 chars base64 = 32 bytes)
	if decoded, err := base64.StdEncoding.DecodeString(raw); err == nil && len(decoded) == 32 {
		return decoded
	}

	// Fallback to SHA-256 hash of raw string to guarantee 32 bytes
	hash := sha256.Sum256([]byte(raw))
	return hash[:]
}

// Encrypt encrypts plaintext using AES-256-GCM and returns a base64 encoded ciphertext with nonce prefixed.
func Encrypt(plaintext string) (string, error) {
	key := GetChatEncryptionKey()
	return EncryptWithKey(plaintext, key)
}

// Decrypt decrypts a base64 encoded ciphertext using AES-256-GCM.
func Decrypt(ciphertextBase64 string) (string, error) {
	key := GetChatEncryptionKey()
	return DecryptWithKey(ciphertextBase64, key)
}

// EncryptWithKey encrypts plaintext with a given 32-byte key.
func EncryptWithKey(plaintext string, key []byte) (string, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create gcm: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Seal appends the encrypted ciphertext to nonce (nonce + ciphertext + tag)
	sealed := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// DecryptWithKey decrypts base64 ciphertext with a given 32-byte key.
func DecryptWithKey(ciphertextBase64 string, key []byte) (string, error) {
	data, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return "", ErrInvalidCiphertext
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create gcm: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", ErrInvalidCiphertext
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", ErrInvalidCiphertext
	}

	return string(plaintext), nil
}

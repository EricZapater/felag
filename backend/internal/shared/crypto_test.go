package shared

import (
	"os"
	"testing"
)

func TestCrypto_EncryptDecrypt(t *testing.T) {
	origEnv := os.Getenv("CHAT_ENCRYPTION_KEY")
	defer os.Setenv("CHAT_ENCRYPTION_KEY", origEnv)

	os.Setenv("CHAT_ENCRYPTION_KEY", "test_secret_key_for_unit_tests_32_bytes!!")

	messages := []string{
		"Hola, com va el viatge?",
		"Ens veiem a l'aeroport de Barcelona a les 10h!",
		"🔑 Missatge amb caràcters especials & emojis 🚀✨",
		"",
		"Very long message with numbers 1234567890 and punctuation !@#$%^&*()_+-=[]{}|;':,./<>?",
	}

	for _, msg := range messages {
		encrypted, err := Encrypt(msg)
		if err != nil {
			t.Fatalf("Failed to encrypt message '%s': %v", msg, err)
		}

		if encrypted == msg && msg != "" {
			t.Fatalf("Ciphertext should not equal plaintext")
		}

		decrypted, err := Decrypt(encrypted)
		if err != nil {
			t.Fatalf("Failed to decrypt message '%s': %v", msg, err)
		}

		if decrypted != msg {
			t.Fatalf("Expected '%s', got '%s'", msg, decrypted)
		}
	}
}

func TestCrypto_InvalidCiphertext(t *testing.T) {
	_, err := Decrypt("invalid-non-base64")
	if err == nil {
		t.Fatalf("Expected error for invalid base64, got nil")
	}

	_, err = Decrypt("YQ==") // "a" decoded, shorter than nonce size
	if err == nil {
		t.Fatalf("Expected error for short ciphertext, got nil")
	}
}

func TestCrypto_DifferentKeys(t *testing.T) {
	key1 := []byte("01234567890123456789012345678901")
	key2 := []byte("12345678901234567890123456789012")

	msg := "Missatge ultrasecret"
	encrypted, err := EncryptWithKey(msg, key1)
	if err != nil {
		t.Fatalf("Failed to encrypt: %v", err)
	}

	_, err = DecryptWithKey(encrypted, key2)
	if err == nil {
		t.Fatalf("Expected decryption failure with different key, got nil")
	}
}

package shared

import (
	"bufio"
	"log"
	"os"
	"strings"
)

// LoadEnv attempts to load environment variables from .env files
func LoadEnv(filenames ...string) {
	if len(filenames) == 0 {
		filenames = []string{".env", ".env.local", "backend/.env", "../.env"}
	}

	loadedAny := false
	for _, filename := range filenames {
		file, err := os.Open(filename)
		if err != nil {
			continue
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}

			parts := strings.SplitN(line, "=", 2)
			if len(parts) != 2 {
				continue
			}

			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])

			// Strip quotes if present
			if len(val) >= 2 && ((val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'')) {
				val = val[1 : len(val)-1]
			}

			// Only set if not already set by the environment
			if os.Getenv(key) == "" {
				_ = os.Setenv(key, val)
			}
		}

		if err := scanner.Err(); err == nil {
			log.Printf("Loaded environment variables from %s", filename)
			loadedAny = true
			break
		}
	}

	if !loadedAny {
		log.Println("No .env file found; using existing system environment variables.")
	}
}

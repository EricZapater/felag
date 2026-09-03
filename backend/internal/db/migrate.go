package db

import (
	"database/sql"
	"embed"
	"fmt"
	"log"
	"path"
	"sort"
	"strings"
)

//go:embed migrations/*.up.sql
var migrationsFS embed.FS

// RunMigrations automatically checks and executes pending database migrations
func RunMigrations(database *sql.DB) error {
	log.Println("Checking database schema migrations...")

	// Create migrations tracking table
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		version VARCHAR(255) PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
	);`
	if _, err := database.Exec(createTableSQL); err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".up.sql") {
			files = append(files, entry.Name())
		}
	}
	sort.Strings(files)

	for _, fileName := range files {
		var exists bool
		query := `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`
		if err := database.QueryRow(query, fileName).Scan(&exists); err != nil {
			return fmt.Errorf("failed to check migration status for %s: %w", fileName, err)
		}

		if exists {
			continue
		}

		log.Printf("Applying database migration: %s", fileName)
		content, err := migrationsFS.ReadFile(path.Join("migrations", fileName))
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", fileName, err)
		}

		tx, err := database.Begin()
		if err != nil {
			return fmt.Errorf("failed to begin transaction for %s: %w", fileName, err)
		}

		if _, err := tx.Exec(string(content)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("failed to execute migration %s: %w", fileName, err)
		}

		if _, err := tx.Exec(`INSERT INTO schema_migrations (version) VALUES ($1)`, fileName); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("failed to record migration %s in schema_migrations: %w", fileName, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", fileName, err)
		}

		log.Printf("Successfully applied migration: %s", fileName)
	}

	log.Println("All database migrations are up to date.")
	return nil
}

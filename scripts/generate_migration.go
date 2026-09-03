package main

import (
	"crypto/sha1"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

// Generate deterministic UUID from namespace and string
func deterministicUUID(namespace string, value string) string {
	hasher := sha1.New()
	hasher.Write([]byte(namespace + ":" + value))
	bytes := hasher.Sum(nil)
	// Set version 5 and variant RFC4122
	bytes[6] = (bytes[6] & 0x0f) | 0x50
	bytes[8] = (bytes[8] & 0x3f) | 0x80
	u, _ := uuid.FromBytes(bytes[:16])
	return u.String()
}

func escapeSQL(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

func findExistingPath(p string) string {
	if _, err := os.Stat(p); err == nil {
		return p
	}
	parentP := filepath.Join("..", p)
	if _, err := os.Stat(parentP); err == nil {
		return parentP
	}
	return p
}

func findMigrationsDir() string {
	if _, err := os.Stat("internal/db/migrations"); err == nil {
		return "internal/db/migrations"
	}
	if _, err := os.Stat("backend/internal/db/migrations"); err == nil {
		return "backend/internal/db/migrations"
	}
	if _, err := os.Stat("../backend/internal/db/migrations"); err == nil {
		return "../backend/internal/db/migrations"
	}
	return "backend/internal/db/migrations"
}

func main() {
	countriesPath := findExistingPath("data/countries.csv")
	statesPath := findExistingPath("data/states.csv")
	citiesPath := findExistingPath("data/cities.csv")
	migrationsDir := findMigrationsDir()

	outPath := filepath.Join(migrationsDir, "000004_populate_geographic_data.up.sql")
	downPath := filepath.Join(migrationsDir, "000004_populate_geographic_data.down.sql")

	log.Printf("Reading countries from %s...", countriesPath)
	countriesFile, err := os.Open(countriesPath)
	if err != nil {
		log.Fatalf("Failed to open countries.csv: %v", err)
	}
	defer countriesFile.Close()

	reader := csv.NewReader(countriesFile)
	header, _ := reader.Read() // skip header
	_ = header

	countryMap := make(map[string]bool) // iso2 -> exists
	countryRows := []string{}

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil || len(record) < 4 {
			continue
		}

		name := escapeSQL(strings.TrimSpace(record[1]))
		iso2 := strings.TrimSpace(record[3])
		if iso2 == "" || name == "" {
			continue
		}

		countryMap[iso2] = true
		countryRows = append(countryRows, fmt.Sprintf("('%s', '%s')", name, iso2))
	}
	log.Printf("Parsed %d countries.", len(countryRows))

	log.Printf("Reading states from %s...", statesPath)
	statesFile, err := os.Open(statesPath)
	if err != nil {
		log.Fatalf("Failed to open states.csv: %v", err)
	}
	defer statesFile.Close()

	sReader := csv.NewReader(statesFile)
	sReader.LazyQuotes = true
	sHeader, _ := sReader.Read()
	_ = sHeader

	stateMap := make(map[string]string) // state_id -> UUID
	regionRows := []string{}

	for {
		record, err := sReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil || len(record) < 4 {
			continue
		}

		rawStateID := strings.TrimSpace(record[0])
		name := escapeSQL(strings.TrimSpace(record[1]))
		countryCode := strings.TrimSpace(record[3])

		if !countryMap[countryCode] || name == "" {
			continue
		}

		regionID := deterministicUUID("state", rawStateID)
		stateMap[rawStateID] = regionID
		regionRows = append(regionRows, fmt.Sprintf("('%s'::uuid, '%s', '%s')", regionID, name, countryCode))
	}
	log.Printf("Parsed %d states/regions.", len(regionRows))

	log.Printf("Reading cities from %s...", citiesPath)
	citiesFile, err := os.Open(citiesPath)
	if err != nil {
		log.Fatalf("Failed to open cities.csv: %v", err)
	}
	defer citiesFile.Close()

	cReader := csv.NewReader(citiesFile)
	cReader.LazyQuotes = true
	cHeader, _ := cReader.Read()
	_ = cHeader

	townRows := []string{}
	for {
		record, err := cReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil || len(record) < 3 {
			continue
		}

		rawCityID := strings.TrimSpace(record[0])
		name := escapeSQL(strings.TrimSpace(record[1]))
		rawStateID := strings.TrimSpace(record[2])

		regionID, ok := stateMap[rawStateID]
		if !ok || name == "" {
			continue
		}

		townID := deterministicUUID("city", rawCityID)
		townRows = append(townRows, fmt.Sprintf("('%s'::uuid, '%s', '%s'::uuid)", townID, name, regionID))
	}
	log.Printf("Parsed %d cities/towns.", len(townRows))

	// Write migration 000004_populate_geographic_data.up.sql
	outFile, err := os.Create(outPath)
	if err != nil {
		log.Fatalf("Failed to create migration file %s: %v", outPath, err)
	}
	defer outFile.Close()

	outFile.WriteString("-- Migration: Populate full geographic database (Countries, Regions, Towns)\n\n")
	outFile.WriteString("ALTER TABLE IF EXISTS countries ALTER COLUMN name TYPE VARCHAR(255);\n")
	outFile.WriteString("ALTER TABLE IF EXISTS regions ALTER COLUMN name TYPE VARCHAR(255);\n")
	outFile.WriteString("ALTER TABLE IF EXISTS towns ALTER COLUMN name TYPE VARCHAR(255);\n\n")

	// 1. Countries
	outFile.WriteString("-- 1. Insert Countries\n")
	batchSize := 500
	for i := 0; i < len(countryRows); i += batchSize {
		end := i + batchSize
		if end > len(countryRows) {
			end = len(countryRows)
		}
		chunk := countryRows[i:end]
		outFile.WriteString(fmt.Sprintf("INSERT INTO countries (name, code) VALUES\n  %s\nON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;\n\n", strings.Join(chunk, ",\n  ")))
	}

	// 2. Regions (JOIN with countries by code to guarantee foreign key integrity)
	outFile.WriteString("-- 2. Insert Regions\n")
	batchSize = 1000
	for i := 0; i < len(regionRows); i += batchSize {
		end := i + batchSize
		if end > len(regionRows) {
			end = len(regionRows)
		}
		chunk := regionRows[i:end]
		outFile.WriteString(fmt.Sprintf(`INSERT INTO regions (id, name, country_id)
SELECT r.id, r.name, c.id
FROM (VALUES
  %s
) AS r(id, name, country_code)
JOIN countries c ON c.code = r.country_code
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, country_id = EXCLUDED.country_id;

`, strings.Join(chunk, ",\n  ")))
	}

	// 3. Towns (JOIN with regions by id to guarantee foreign key integrity)
	outFile.WriteString("-- 3. Insert Towns / Cities\n")
	batchSize = 2000
	for i := 0; i < len(townRows); i += batchSize {
		end := i + batchSize
		if end > len(townRows) {
			end = len(townRows)
		}
		chunk := townRows[i:end]
		outFile.WriteString(fmt.Sprintf(`INSERT INTO towns (id, name, region_id)
SELECT t.id, t.name, r.id
FROM (VALUES
  %s
) AS t(id, name, region_id)
JOIN regions r ON r.id = t.region_id
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id;

`, strings.Join(chunk, ",\n  ")))
	}

	// Down migration
	downFile, err := os.Create(downPath)
	if err != nil {
		log.Fatalf("Failed to create down migration: %v", err)
	}
	defer downFile.Close()
	downFile.WriteString("-- Rollback population\nTRUNCATE towns, regions, countries CASCADE;\n")

	log.Printf("Migration file %s generated successfully!", outPath)
}

package main

import (
	"bufio"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"unicode"

	_ "github.com/lib/pq"
	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

// DestinationEntry represents a destination candidate extracted from the database
type DestinationEntry struct {
	ID          string `json:"id,omitempty"`
	Name        string `json:"name"`
	CleanName   string `json:"clean_name"`
	Phonetic    string `json:"phonetic"`
	Type        string `json:"type"` // "town", "trip_stage", "recommendation"
	CountryCode string `json:"country_code"`
	CountryName string `json:"country_name"`
	RegionName  string `json:"region_name,omitempty"`
	TownID      string `json:"town_id,omitempty"`
	UsageCount  int    `json:"usage_count"`
}

// SimilarPair represents a pair of destination names detected as potential duplicates
type SimilarPair struct {
	ItemA        DestinationEntry `json:"item_a"`
	ItemB        DestinationEntry `json:"item_b"`
	Similarity   float64          `json:"similarity"`
	Distance     int              `json:"distance"`
	Explanation  string           `json:"explanation"`
	SuggestedSQL string           `json:"suggested_sql,omitempty"`
}

// CountrySummary represents duplicate statistics aggregated by country
type CountrySummary struct {
	CountryCode    string   `json:"country_code"`
	CountryName    string   `json:"country_name"`
	DuplicateCount int      `json:"duplicate_count"`
	TownsCount     int      `json:"towns_count"`
	ActiveUsages   int      `json:"active_usages"`
	TopExamples    []string `json:"top_examples,omitempty"`
}

func main() {
	thresholdFlag := flag.Float64("threshold", 0.70, "Llindar mínim de similitud (0.0 a 1.0, defecte: 0.70)")
	countryFlag := flag.String("country", "", "Filtrar per codi de país ISO (ex: MA, ES, JP)")
	sourceFlag := flag.String("source", "all", "Filtrar per origen (all, trips, recs, towns)")
	byCountriesFlag := flag.Bool("bycountries", false, "Llistar resum de possibles duplicats agrupats per països")
	byCountriesAlias := flag.Bool("by-countries", false, "Alias de -bycountries")
	jsonFlag := flag.Bool("json", false, "Emetre el resultat en format JSON")
	csvFlag := flag.Bool("csv", false, "Emetre el resultat en format CSV")
	outFlag := flag.String("out", "", "Ruta del fitxer de sortida (ex: resultats.csv o resultats.json)")
	outAlias := flag.String("output", "", "Alias de -out")
	sqlFlag := flag.Bool("sql", false, "Generar instruccions SQL per unificar a la base de dades")
	dbURLFlag := flag.String("db", "", "Cadena de connexió DATABASE_URL (opcional)")
	verboseFlag := flag.Bool("v", false, "Mode detallat (mostra informació de diagnòstic)")

	flag.Parse()

	isByCountries := *byCountriesFlag || *byCountriesAlias
	outputPath := *outFlag
	if outputPath == "" {
		outputPath = *outAlias
	}

	loadEnv()

	db, err := initDB(*dbURLFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Error connectant a la base de dades: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	// Load country name mapping
	countryNames := loadCountryNames(db)

	if !*jsonFlag && !*csvFlag {
		fmt.Println("==========================================================================")
		if isByCountries {
			fmt.Println("🧭 FELAG - Resum de Destins Semblants per Països (-bycountries)")
		} else {
			fmt.Println("🧭 FELAG - Detector de Destins Semblants i Duplicats a la Base de Dades")
		}
		fmt.Println("==========================================================================")
		if *countryFlag != "" {
			cName := countryNames[strings.ToUpper(*countryFlag)]
			if cName != "" {
				fmt.Printf("🔍 Filtre per país: %s (%s)\n", strings.ToUpper(*countryFlag), cName)
			} else {
				fmt.Printf("🔍 Filtre per país: %s\n", strings.ToUpper(*countryFlag))
			}
		}
		fmt.Printf("🎯 Llindar de similitud: %.0f%%\n", *thresholdFlag*100)
		fmt.Println("⏳ Carregant dades de municipis, viatges i recomanacions...")
	}

	entries, stats, err := loadDestinations(db, *countryFlag, *sourceFlag, countryNames)
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Error carregant destins: %v\n", err)
		os.Exit(1)
	}

	if !*jsonFlag && !*csvFlag {
		fmt.Printf("📊 Carregats: %d municipis/towns, %d etapes de viatges, %d recomanacions (%d destins totals).\n",
			stats["towns"], stats["trips"], stats["recs"], len(entries))
		fmt.Println("🧠 Analitzant similituds amb índexs de bloqueig i transliteració fonètica...")
	}

	pairs := findSimilarPairs(entries, *thresholdFlag, *sqlFlag, *verboseFlag)

	// If -bycountries is specified, group by country and show country breakdown
	if isByCountries {
		summaries := buildCountrySummaries(pairs, entries, countryNames)

		if *jsonFlag {
			var outWriter = os.Stdout
			if outputPath != "" {
				f, err := os.Create(outputPath)
				if err != nil {
					fmt.Fprintf(os.Stderr, "Error creant fitxer %s: %v\n", outputPath, err)
					os.Exit(1)
				}
				defer f.Close()
				outWriter = f
			}
			enc := json.NewEncoder(outWriter)
			enc.SetIndent("", "  ")
			if err := enc.Encode(summaries); err != nil {
				fmt.Fprintf(os.Stderr, "Error serialitzant JSON: %v\n", err)
			} else if outputPath != "" {
				fmt.Printf("💾 Resum per països (JSON) desat correctament a %s\n", outputPath)
			}
			return
		}

		if *csvFlag {
			var outWriter = os.Stdout
			if outputPath != "" {
				f, err := os.Create(outputPath)
				if err != nil {
					fmt.Fprintf(os.Stderr, "Error creant fitxer %s: %v\n", outputPath, err)
					os.Exit(1)
				}
				defer f.Close()
				outWriter = f
			}
			w := csv.NewWriter(outWriter)
			defer w.Flush()
			w.Write([]string{"Pais", "Codi_ISO", "Possibles_Duplicats", "Municipis_BBDD", "Usat_Viatges_Recs", "Exemples"})
			for _, s := range summaries {
				w.Write([]string{
					s.CountryName,
					s.CountryCode,
					fmt.Sprintf("%d", s.DuplicateCount),
					fmt.Sprintf("%d", s.TownsCount),
					fmt.Sprintf("%d", s.ActiveUsages),
					strings.Join(s.TopExamples, "; "),
				})
			}
			if outputPath != "" {
				w.Flush()
				fmt.Printf("💾 Resum per països (CSV) desat correctament a %s\n", outputPath)
			}
			return
		}

		// Terminal Table for -bycountries
		if len(summaries) == 0 {
			fmt.Printf("\n✅ No s'ha trobat cap duplicat amb similitud >= %.0f%%.\n", *thresholdFlag*100)
			return
		}

		totalDuplicates := 0
		for _, s := range summaries {
			totalDuplicates += s.DuplicateCount
		}

		fmt.Printf("\n📋 S'han trobat duplicats en %d països (%d parelles totals):\n\n", len(summaries), totalDuplicates)
		fmt.Printf("%-24s | %-5s | %-19s | %-14s | %-15s | %s\n",
			"PAÍS", "CODI", "POSSIBLES DUPLICATS", "MUNICIPIS BBDD", "VIATGES/RECS", "EXEMPLES DETECTATS")
		fmt.Println(strings.Repeat("-", 125))

		for _, s := range summaries {
			cName := s.CountryName
			if len(cName) > 24 {
				cName = cName[:21] + "..."
			}
			examples := strings.Join(s.TopExamples, ", ")
			if len(examples) > 42 {
				examples = examples[:39] + "..."
			}

			fmt.Printf("%-24s | %-5s | %-19s | %-14d | %-15d | %s\n",
				cName,
				s.CountryCode,
				fmt.Sprintf("%d parelles", s.DuplicateCount),
				s.TownsCount,
				s.ActiveUsages,
				examples,
			)
		}

		fmt.Println(strings.Repeat("-", 125))
		fmt.Printf("📌 TOTAL: %d països amb possibles duplicats (%d parelles detectades)\n\n", len(summaries), totalDuplicates)
		fmt.Printf("💡 Com explorar o unificar un país concret:\n")
		if len(summaries) > 0 {
			firstCode := summaries[0].CountryCode
			fmt.Printf("   ./scripts/find_similar_destinations.sh -country %s -threshold %.2f\n", firstCode, *thresholdFlag)
			fmt.Printf("   ./scripts/find_similar_destinations.sh -country %s -sql\n", firstCode)
		}
		return
	}

	if *jsonFlag {
		var outWriter = os.Stdout
		if outputPath != "" {
			f, err := os.Create(outputPath)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error creant fitxer %s: %v\n", outputPath, err)
				os.Exit(1)
			}
			defer f.Close()
			outWriter = f
		}
		enc := json.NewEncoder(outWriter)
		enc.SetIndent("", "  ")
		if err := enc.Encode(pairs); err != nil {
			fmt.Fprintf(os.Stderr, "Error serialitzant JSON: %v\n", err)
		} else if outputPath != "" {
			fmt.Printf("💾 Llistat de duplicats (JSON) desat correctament a %s\n", outputPath)
		}
		return
	}

	if *csvFlag {
		var outWriter = os.Stdout
		if outputPath != "" {
			f, err := os.Create(outputPath)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error creant fitxer %s: %v\n", outputPath, err)
				os.Exit(1)
			}
			defer f.Close()
			outWriter = f
		}
		w := csv.NewWriter(outWriter)
		defer w.Flush()
		w.Write([]string{"Similitud (%)", "Destinacio_1", "Origen_1", "Usos_1", "ID_1", "Destinacio_2", "Origen_2", "Usos_2", "ID_2", "Pais", "Explicacio", "SQL_Sugg"})
		for _, p := range pairs {
			w.Write([]string{
				fmt.Sprintf("%.1f%%", p.Similarity*100),
				p.ItemA.Name,
				p.ItemA.Type,
				fmt.Sprintf("%d", p.ItemA.UsageCount),
				p.ItemA.ID,
				p.ItemB.Name,
				p.ItemB.Type,
				fmt.Sprintf("%d", p.ItemB.UsageCount),
				p.ItemB.ID,
				p.ItemA.CountryCode,
				p.Explanation,
				p.SuggestedSQL,
			})
		}
		if outputPath != "" {
			w.Flush()
			fmt.Printf("💾 Llistat de duplicats (CSV) desat correctament a %s\n", outputPath)
		}
		return
	}

	// Terminal Table Output
	if len(pairs) == 0 {
		fmt.Printf("\n✅ No s'ha trobat cap parella de destins amb similitud >= %.0f%%.\n", *thresholdFlag*100)
		fmt.Println("💡 Prova a rebaixar el llindar amb `-threshold 0.5` o a filtrar per país amb `-country MA`.")
		return
	}

	fmt.Printf("\n✨ S'han detectat %d parelles de destins semblants (llindar: %.0f%%):\n\n", len(pairs), *thresholdFlag*100)
	fmt.Printf("%-8s | %-28s | %-28s | %-6s | %s\n", "SIMILITUD", "DESTINACIÓ A (ORIGEN:USOS)", "DESTINACIÓ B (ORIGEN:USOS)", "PAÍS", "DETALLS / MOTIU")
	fmt.Println(strings.Repeat("-", 115))

	for _, p := range pairs {
		labelA := fmt.Sprintf("%s (%s:%d)", p.ItemA.Name, p.ItemA.Type, p.ItemA.UsageCount)
		labelB := fmt.Sprintf("%s (%s:%d)", p.ItemB.Name, p.ItemB.Type, p.ItemB.UsageCount)
		if len(labelA) > 28 {
			labelA = labelA[:25] + "..."
		}
		if len(labelB) > 28 {
			labelB = labelB[:25] + "..."
		}

		countryStr := p.ItemA.CountryCode
		if countryStr == "" {
			countryStr = p.ItemB.CountryCode
		}
		if p.ItemA.CountryCode != "" && p.ItemB.CountryCode != "" && p.ItemA.CountryCode != p.ItemB.CountryCode {
			countryStr = fmt.Sprintf("%s≠%s", p.ItemA.CountryCode, p.ItemB.CountryCode)
		}

		fmt.Printf("%-8s | %-28s | %-28s | %-6s | %s\n",
			fmt.Sprintf("%.1f%%", p.Similarity*100),
			labelA,
			labelB,
			countryStr,
			p.Explanation,
		)
		if *sqlFlag && p.SuggestedSQL != "" {
			fmt.Printf("   └── 🛠️  SQL: %s\n", p.SuggestedSQL)
		}
	}

	fmt.Println(strings.Repeat("-", 115))
	fmt.Printf("\n💡 Opcions útils:\n")
	fmt.Printf("   - Executar amb `-sql` per veure les consultes SQL d'unificació.\n")
	fmt.Printf("   - Executar amb `-country MA` o `-country ES` per filtrar per país.\n")
	fmt.Printf("   - Executar amb `-threshold 0.5` per ampliar la cerca.\n")
}

// Load environment variables looking up directory trees
func loadEnv() {
	cwd, _ := os.Getwd()
	dirsToCheck := []string{
		filepath.Dir(cwd),
		filepath.Join(cwd, ".."),
		cwd,
		filepath.Join(cwd, "backend"),
		filepath.Join(filepath.Dir(cwd), "backend"),
	}

	for _, dir := range dirsToCheck {
		envPath := filepath.Join(dir, ".env.backend")
		if parseEnvFile(envPath) {
			if os.Getenv("DB_HOST") != "" {
				os.Unsetenv("DATABASE_URL")
			}
			return
		}
	}

	for _, dir := range dirsToCheck {
		envPath := filepath.Join(dir, ".env")
		if parseEnvFile(envPath) {
			return
		}
	}
}

func parseEnvFile(envPath string) bool {
	data, err := os.ReadFile(envPath)
	if err != nil {
		return false
	}
	scanner := bufio.NewScanner(strings.NewReader(string(data)))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
			os.Setenv(key, val)
		}
	}
	return true
}

func initDB(customURL string) (*sql.DB, error) {
	connStr := customURL
	if connStr == "" {
		host := os.Getenv("DB_HOST")
		if host != "" {
			port := os.Getenv("DB_PORT")
			if port == "" {
				port = "5432"
			}
			user := os.Getenv("DB_USER")
			pass := os.Getenv("DB_PASSWORD")
			dbname := os.Getenv("DB_NAME")
			sslmode := os.Getenv("DB_SSLMODE")
			if sslmode == "" {
				sslmode = "disable"
			}
			connStr = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
				host, port, user, pass, dbname, sslmode)
		} else {
			connStr = os.Getenv("DATABASE_URL")
			if connStr == "" {
				connStr = "postgres://postgres:postgres@localhost:5432/felag?sslmode=disable"
			}
		}
	}

	database, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}
	if err := database.Ping(); err != nil {
		return nil, err
	}

	// Ensure search_path is public
	_, _ = database.Exec("SET search_path TO public;")

	return database, nil
}

func loadCountryNames(db *sql.DB) map[string]string {
	res := make(map[string]string)
	rows, err := db.Query("SELECT UPPER(TRIM(code)), TRIM(name) FROM public.countries WHERE code IS NOT NULL AND code != '';")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var code, name string
			if err := rows.Scan(&code, &name); err == nil && code != "" {
				res[code] = name
			}
		}
	}
	return res
}

func loadDestinations(db *sql.DB, countryFilter, sourceFilter string, countryNames map[string]string) ([]DestinationEntry, map[string]int, error) {
	var entries []DestinationEntry
	stats := map[string]int{"towns": 0, "trips": 0, "recs": 0}

	cleanCountry := strings.ToUpper(strings.TrimSpace(countryFilter))

	// 1. Load Towns
	if sourceFilter == "all" || sourceFilter == "towns" {
		townQuery := `
			SELECT t.id, t.name, COALESCE(r.name, '') AS region_name, COALESCE(c.name, '') AS country_name, COALESCE(c.code, '') AS country_code,
			       COALESCE((SELECT COUNT(*) FROM public.trip_stages ts WHERE ts.town_id = t.id), 0) +
			       COALESCE((SELECT COUNT(*) FROM public.destination_recommendations dr WHERE dr.town_id = t.id), 0) AS usage_count
			FROM public.towns t
			LEFT JOIN public.regions r ON t.region_id = r.id
			LEFT JOIN public.countries c ON r.country_id = c.id
			WHERE ($1 = '' OR c.code = $1);
		`
		rows, err := db.Query(townQuery, cleanCountry)
		if err != nil {
			fmt.Fprintf(os.Stderr, "⚠️ Error query towns: %v\n", err)
		} else {
			defer rows.Close()
			for rows.Next() {
				var e DestinationEntry
				e.Type = "town"
				if err := rows.Scan(&e.ID, &e.Name, &e.RegionName, &e.CountryName, &e.CountryCode, &e.UsageCount); err == nil {
					e.CountryCode = strings.ToUpper(strings.TrimSpace(e.CountryCode))
					if e.CountryName == "" && e.CountryCode != "" {
						e.CountryName = countryNames[e.CountryCode]
					}
					e.CleanName = cleanString(e.Name)
					e.Phonetic = phoneticNormalize(e.Name)
					e.TownID = e.ID
					entries = append(entries, e)
					stats["towns"]++
				}
			}
		}
	}

	// 2. Load Trip Stages
	if sourceFilter == "all" || sourceFilter == "trips" {
		tripQuery := `
			SELECT COALESCE(ts.destination_name, ''), COALESCE(ts.country_code, ''), COALESCE(ts.town_id::text, ''), COUNT(*) as cnt
			FROM public.trip_stages ts
			WHERE ($1 = '' OR ts.country_code = $1)
			GROUP BY ts.destination_name, ts.country_code, ts.town_id;
		`
		rows, err := db.Query(tripQuery, cleanCountry)
		if err != nil {
			fmt.Fprintf(os.Stderr, "⚠️ Error query trip_stages: %v\n", err)
		} else {
			defer rows.Close()
			for rows.Next() {
				var name, cCode, townID string
				var cnt int
				if err := rows.Scan(&name, &cCode, &townID, &cnt); err == nil {
					name = strings.TrimSpace(name)
					if name == "" {
						continue
					}
					cCode = strings.ToUpper(strings.TrimSpace(cCode))
					stats["trips"]++
					entries = append(entries, DestinationEntry{
						ID:          townID,
						Name:        name,
						CleanName:   cleanString(name),
						Phonetic:    phoneticNormalize(name),
						Type:        "trip_stage",
						CountryCode: cCode,
						CountryName: countryNames[cCode],
						TownID:      townID,
						UsageCount:  cnt,
					})
				}
			}
		}
	}

	// 3. Load Destination Recommendations
	if sourceFilter == "all" || sourceFilter == "recs" {
		recQuery := `
			SELECT COALESCE(dr.location_name, dr.title), COALESCE(dr.country_code, ''), COALESCE(dr.town_id::text, ''), COUNT(*) as cnt
			FROM public.destination_recommendations dr
			WHERE ($1 = '' OR dr.country_code = $1)
			GROUP BY COALESCE(dr.location_name, dr.title), dr.country_code, dr.town_id;
		`
		rows, err := db.Query(recQuery, cleanCountry)
		if err != nil {
			fmt.Fprintf(os.Stderr, "⚠️ Error query recommendations: %v\n", err)
		} else {
			defer rows.Close()
			for rows.Next() {
				var name, cCode, townID string
				var cnt int
				if err := rows.Scan(&name, &cCode, &townID, &cnt); err == nil {
					name = strings.TrimSpace(name)
					if name == "" {
						continue
					}
					cCode = strings.ToUpper(strings.TrimSpace(cCode))
					stats["recs"]++
					entries = append(entries, DestinationEntry{
						ID:          townID,
						Name:        name,
						CleanName:   cleanString(name),
						Phonetic:    phoneticNormalize(name),
						Type:        "recommendation",
						CountryCode: cCode,
						CountryName: countryNames[cCode],
						TownID:      townID,
						UsageCount:  cnt,
					})
				}
			}
		}
	}

	return entries, stats, nil
}

// buildBlockingKeys returns keys used for candidate index blocking
func buildBlockingKeys(e DestinationEntry) []string {
	var keys []string
	clean := e.CleanName
	if len(clean) >= 3 {
		keys = append(keys, "p3:"+clean[:3])
	} else if len(clean) >= 2 {
		keys = append(keys, "p2:"+clean[:2])
	}

	phon := e.Phonetic
	if len(phon) >= 3 {
		keys = append(keys, "ph3:"+phon[:3])
	} else if len(phon) >= 2 {
		keys = append(keys, "ph2:"+phon[:2])
	}

	// For multi-word destinations, index subsequent significant words
	words := strings.Fields(clean)
	if len(words) > 1 {
		for _, w := range words[1:] {
			if len(w) >= 3 {
				keys = append(keys, "w3:"+w[:3])
			}
		}
	}

	return keys
}

// Zero-allocation fast Levenshtein distance for ASCII/clean strings
func levenshtein(s1, s2 string) int {
	if s1 == s2 {
		return 0
	}
	n, m := len(s1), len(s2)
	if n == 0 {
		return m
	}
	if m == 0 {
		return n
	}

	var v0Buf [64]int
	var v1Buf [64]int
	var v0, v1 []int
	if m+1 <= 64 {
		v0 = v0Buf[:m+1]
		v1 = v1Buf[:m+1]
	} else {
		v0 = make([]int, m+1)
		v1 = make([]int, m+1)
	}

	for i := 0; i <= m; i++ {
		v0[i] = i
	}

	for i := 0; i < n; i++ {
		v1[0] = i + 1
		for j := 0; j < m; j++ {
			cost := 0
			if s1[i] != s2[j] {
				cost = 1
			}
			minVal := v0[j+1] + 1
			if v1[j]+1 < minVal {
				minVal = v1[j] + 1
			}
			if v0[j]+cost < minVal {
				minVal = v0[j] + cost
			}
			v1[j+1] = minVal
		}
		copy(v0, v1)
	}
	return v1[m]
}

func jaroWinkler(s1, s2 string) float64 {
	j := jaro(s1, s2)
	if j < 0.7 {
		return j
	}

	prefix := 0
	maxPrefix := min(min(len(s1), len(s2)), 4)
	for i := 0; i < maxPrefix; i++ {
		if s1[i] == s2[i] {
			prefix++
		} else {
			break
		}
	}

	return j + float64(prefix)*0.1*(1.0-j)
}

func jaro(s1, s2 string) float64 {
	len1, len2 := len(s1), len(s2)
	if len1 == 0 && len2 == 0 {
		return 1.0
	}
	if len1 == 0 || len2 == 0 {
		return 0.0
	}

	matchDistance := max(len1, len2)/2 - 1
	if matchDistance < 0 {
		matchDistance = 0
	}

	var s1MatchesBuf [64]bool
	var s2MatchesBuf [64]bool
	var s1Matches, s2Matches []bool
	if len1 <= 64 {
		s1Matches = s1MatchesBuf[:len1]
	} else {
		s1Matches = make([]bool, len1)
	}
	if len2 <= 64 {
		s2Matches = s2MatchesBuf[:len2]
	} else {
		s2Matches = make([]bool, len2)
	}

	matches := 0
	for i := 0; i < len1; i++ {
		start := max(0, i-matchDistance)
		end := min(i+matchDistance+1, len2)

		for j := start; j < end; j++ {
			if s2Matches[j] || s1[i] != s2[j] {
				continue
			}
			s1Matches[i] = true
			s2Matches[j] = true
			matches++
			break
		}
	}

	if matches == 0 {
		return 0.0
	}

	k := 0
	transpositions := 0
	for i := 0; i < len1; i++ {
		if !s1Matches[i] {
			continue
		}
		for !s2Matches[k] {
			k++
		}
		if s1[i] != s2[k] {
			transpositions++
		}
		k++
	}

	m := float64(matches)
	return (m/float64(len1) + m/float64(len2) + (m-float64(transpositions/2))/m) / 3.0
}

// findSimilarPairs uses index blocking and parallel processing for ultra-fast execution (< 1s on 150k+ records)
func findSimilarPairs(entries []DestinationEntry, threshold float64, genSQL, verbose bool) []SimilarPair {
	// 1. Bucket entries by CountryCode
	countryBuckets := make(map[string][]DestinationEntry)
	var activeItems []DestinationEntry

	for _, e := range entries {
		cc := strings.ToUpper(e.CountryCode)
		countryBuckets[cc] = append(countryBuckets[cc], e)
		if e.Type == "trip_stage" || e.Type == "recommendation" {
			activeItems = append(activeItems, e)
		}
	}

	var pairs []SimilarPair
	var mu sync.Mutex
	seenPairs := make(map[string]bool)

	var wg sync.WaitGroup

	// Process each country bucket concurrently
	for country, bucket := range countryBuckets {
		wg.Add(1)
		go func(cCode string, items []DestinationEntry) {
			defer wg.Done()
			var localPairs []SimilarPair

			n := len(items)
			if n < 2 {
				return
			}

			// Build inverted index of blocking keys -> slice of item indices
			blockIndex := make(map[string][]int, n*2)
			for idx, item := range items {
				keys := buildBlockingKeys(item)
				for _, k := range keys {
					blockIndex[k] = append(blockIndex[k], idx)
				}
			}

			// Compare within blocks
			testedPairs := make(map[uint64]bool)

			for i := 0; i < n; i++ {
				a := items[i]
				lenA := len(a.CleanName)
				if lenA < 2 {
					continue
				}

				keysA := buildBlockingKeys(a)
				for _, k := range keysA {
					candidateIndices := blockIndex[k]
					for _, j := range candidateIndices {
						if j <= i {
							continue
						}

						// Pack i and j into uint64 to avoid duplicate evaluations
						pairHash := (uint64(i) << 32) | uint64(j)
						if testedPairs[pairHash] {
							continue
						}
						testedPairs[pairHash] = true

						b := items[j]
						lenB := len(b.CleanName)
						if lenB < 2 {
							continue
						}

						diff := lenA - lenB
						if diff < 0 {
							diff = -diff
						}
						if diff > 4 {
							continue
						}

						// Skip identical IDs from same source
						if a.ID != "" && a.ID == b.ID && a.Type == b.Type {
							continue
						}

						// Skip identical names & source
						if strings.EqualFold(a.Name, b.Name) && a.Type == b.Type {
							continue
						}

						sim, dist, explanation := computeSimilarity(a, b)
						if sim >= threshold {
							var sqlStmt string
							if genSQL {
								sqlStmt = generateMergeSQL(a, b)
							}

							localPairs = append(localPairs, SimilarPair{
								ItemA:        a,
								ItemB:        b,
								Similarity:   sim,
								Distance:     dist,
								Explanation:  explanation,
								SuggestedSQL: sqlStmt,
							})
						}
					}
				}
			}

			if len(localPairs) > 0 {
				mu.Lock()
				for _, p := range localPairs {
					keyA := fmt.Sprintf("%s:%s", p.ItemA.ID, strings.ToLower(p.ItemA.Name))
					keyB := fmt.Sprintf("%s:%s", p.ItemB.ID, strings.ToLower(p.ItemB.Name))
					pairKey := keyA + "|||" + keyB
					if keyA > keyB {
						pairKey = keyB + "|||" + keyA
					}
					if !seenPairs[pairKey] {
						seenPairs[pairKey] = true
						pairs = append(pairs, p)
					}
				}
				mu.Unlock()
			}
		}(country, bucket)
	}

	wg.Wait()

	// 2. High-priority check for active items (trip_stages / recs) across all destinations
	for _, act := range activeItems {
		lenA := len(act.CleanName)
		if lenA < 2 {
			continue
		}

		for _, e := range entries {
			if act.ID != "" && act.ID == e.ID && act.Type == e.Type {
				continue
			}
			if strings.EqualFold(act.Name, e.Name) && act.Type == e.Type {
				continue
			}

			// If different country, only match very high threshold
			sameCountry := strings.EqualFold(act.CountryCode, e.CountryCode)
			minScore := threshold
			if !sameCountry {
				minScore = 0.88
			}

			lenB := len(e.CleanName)
			diff := lenA - lenB
			if diff < 0 {
				diff = -diff
			}
			if diff > 3 {
				continue
			}

			sim, dist, explanation := computeSimilarity(act, e)
			if sim >= minScore {
				keyA := fmt.Sprintf("%s:%s", act.ID, strings.ToLower(act.Name))
				keyB := fmt.Sprintf("%s:%s", e.ID, strings.ToLower(e.Name))
				pairKey := keyA + "|||" + keyB
				if keyA > keyB {
					pairKey = keyB + "|||" + keyA
				}
				if !seenPairs[pairKey] {
					seenPairs[pairKey] = true
					if !sameCountry && act.CountryCode != "" && e.CountryCode != "" {
						explanation = fmt.Sprintf("⚠️ Països diferents (%s vs %s) | %s", act.CountryCode, e.CountryCode, explanation)
					}
					var sqlStmt string
					if genSQL {
						sqlStmt = generateMergeSQL(act, e)
					}
					pairs = append(pairs, SimilarPair{
						ItemA:        act,
						ItemB:        e,
						Similarity:   sim,
						Distance:     dist,
						Explanation:  explanation,
						SuggestedSQL: sqlStmt,
					})
				}
			}
		}
	}

	// Sort by similarity descending, then by usages
	sort.Slice(pairs, func(i, j int) bool {
		if math.Abs(pairs[i].Similarity-pairs[j].Similarity) > 0.001 {
			return pairs[i].Similarity > pairs[j].Similarity
		}
		return (pairs[i].ItemA.UsageCount + pairs[i].ItemB.UsageCount) > (pairs[j].ItemA.UsageCount + pairs[j].ItemB.UsageCount)
	})

	return pairs
}

func buildCountrySummaries(pairs []SimilarPair, entries []DestinationEntry, countryNames map[string]string) []CountrySummary {
	// 1. Group pairs by country
	pairMap := make(map[string][]SimilarPair)
	for _, p := range pairs {
		cc := strings.ToUpper(p.ItemA.CountryCode)
		if cc == "" {
			cc = strings.ToUpper(p.ItemB.CountryCode)
		}
		if cc == "" {
			cc = "OTHER"
		}
		pairMap[cc] = append(pairMap[cc], p)
	}

	// 2. Count towns and active entries per country
	townsCount := make(map[string]int)
	activeCount := make(map[string]int)
	for _, e := range entries {
		cc := strings.ToUpper(e.CountryCode)
		if cc == "" {
			cc = "OTHER"
		}
		if e.Type == "town" {
			townsCount[cc]++
		} else {
			activeCount[cc] += e.UsageCount
		}
	}

	var summaries []CountrySummary
	for cCode, cPairs := range pairMap {
		cName := countryNames[cCode]
		if cName == "" {
			if cCode == "OTHER" {
				cName = "Sense país definit"
			} else {
				cName = cCode
			}
		}

		// Pick top 2 examples
		var examples []string
		for i, p := range cPairs {
			if i >= 2 {
				break
			}
			examples = append(examples, fmt.Sprintf("%s ↔ %s (%.0f%%)", p.ItemA.Name, p.ItemB.Name, p.Similarity*100))
		}

		summaries = append(summaries, CountrySummary{
			CountryCode:    cCode,
			CountryName:    cName,
			DuplicateCount: len(cPairs),
			TownsCount:     townsCount[cCode],
			ActiveUsages:   activeCount[cCode],
			TopExamples:    examples,
		})
	}

	// Sort by duplicate count descending
	sort.Slice(summaries, func(i, j int) bool {
		if summaries[i].DuplicateCount != summaries[j].DuplicateCount {
			return summaries[i].DuplicateCount > summaries[j].DuplicateCount
		}
		return summaries[i].CountryName < summaries[j].CountryName
	})

	return summaries
}

func computeSimilarity(a, b DestinationEntry) (float64, int, string) {
	nameA := a.CleanName
	nameB := b.CleanName

	if nameA == nameB {
		if strings.EqualFold(a.Name, b.Name) {
			return 1.0, 0, "Mateix nom en diferents orígens"
		}
		return 0.99, 0, "Diferència d'accents o majúscules"
	}

	dist := levenshtein(nameA, nameB)
	maxLen := math.Max(float64(len(nameA)), float64(len(nameB)))
	levSim := 1.0 - (float64(dist) / maxLen)

	jwSim := jaroWinkler(nameA, nameB)

	// Phonetic check (e.g. Marrakech vs Marrakesh)
	phoneticMatch := a.Phonetic == b.Phonetic
	phoneticSim := 0.0
	if phoneticMatch {
		phoneticSim = 0.95
	} else {
		pDist := levenshtein(a.Phonetic, b.Phonetic)
		pMax := math.Max(float64(len(a.Phonetic)), float64(len(b.Phonetic)))
		if pMax > 0 {
			phoneticSim = 1.0 - (float64(pDist) / pMax)
		}
	}

	maxScore := math.Max(levSim, math.Max(jwSim, phoneticSim))

	var explanation string
	if phoneticMatch {
		explanation = fmt.Sprintf("Transliteració fonètica (ex: 'ch' ↔ 'sh', 'k' ↔ 'c') | dist=%d", dist)
	} else if dist == 1 {
		explanation = fmt.Sprintf("Diferència d'un sol caràcter | dist=1, jaro=%.2f", jwSim)
	} else if strings.HasPrefix(nameA, nameB) || strings.HasPrefix(nameB, nameA) {
		explanation = fmt.Sprintf("Variació de prefix/sufix | dist=%d, jaro=%.2f", dist, jwSim)
	} else {
		explanation = fmt.Sprintf("Similitud ortogràfica | Lev: %.2f, Jaro: %.2f", levSim, jwSim)
	}

	return maxScore, dist, explanation
}

func generateMergeSQL(a, b DestinationEntry) string {
	if a.Type == "town" && a.ID != "" && (b.Type == "trip_stage" || b.Type == "recommendation") {
		return fmt.Sprintf("UPDATE public.trip_stages SET town_id = '%s' WHERE LOWER(destination_name) = LOWER('%s');", a.ID, b.Name)
	}
	if b.Type == "town" && b.ID != "" && (a.Type == "trip_stage" || a.Type == "recommendation") {
		return fmt.Sprintf("UPDATE public.trip_stages SET town_id = '%s' WHERE LOWER(destination_name) = LOWER('%s');", b.ID, a.Name)
	}
	if a.Type == "town" && b.Type == "town" {
		return fmt.Sprintf("-- Duplicat a taula towns: unificar ID '%s' (%s) amb ID '%s' (%s)", a.ID, a.Name, b.ID, b.Name)
	}
	return fmt.Sprintf("-- Unificar '%s' i '%s'", a.Name, b.Name)
}

// Clean diacritics, symbols and administrative generic prefixes/suffixes
func cleanString(s string) string {
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	res, _, _ := transform.String(t, s)
	res = strings.ToLower(strings.TrimSpace(res))

	res = stripAdmin(res)

	var b strings.Builder
	for _, r := range res {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func stripAdmin(s string) string {
	// Prefixes
	prefixes := []string{
		"comuna ", "municipi de ", "municipio de ", "municipio ",
		"districte de ", "distrito de ", "distrito ", "district of ", "district ",
		"ward of ", "cercle de ", "prefecture de ", "province of ", "provincia de ",
		"provincia ", "commune de ", "commune d'", "ville de ",
	}
	for _, p := range prefixes {
		if strings.HasPrefix(s, p) {
			s = strings.TrimPrefix(s, p)
			break
		}
	}

	// Suffixes
	suffixes := []string{
		" district", " province", " municipality", " county", " region", " districte", " provincia",
	}
	for _, sf := range suffixes {
		if strings.HasSuffix(s, sf) {
			s = strings.TrimSuffix(s, sf)
			break
		}
	}

	return strings.TrimSpace(s)
}

// Multilingual phonetic normalizer
func phoneticNormalize(s string) string {
	c := cleanString(s)

	// Normalizations
	c = strings.ReplaceAll(c, "sh", "ch")
	c = strings.ReplaceAll(c, "tch", "ch")
	c = strings.ReplaceAll(c, "x", "ch")
	c = strings.ReplaceAll(c, "kh", "k")
	c = strings.ReplaceAll(c, "q", "k")
	c = strings.ReplaceAll(c, "ck", "k")
	c = strings.ReplaceAll(c, "ou", "u")
	c = strings.ReplaceAll(c, "ph", "f")
	c = strings.ReplaceAll(c, "y", "i")
	c = strings.ReplaceAll(c, "v", "b")
	c = strings.ReplaceAll(c, "ll", "y")
	c = strings.ReplaceAll(c, "th", "t")
	c = strings.ReplaceAll(c, "tz", "z")

	// Collapse double letters
	var sb strings.Builder
	var last rune
	for _, r := range c {
		if r != last {
			sb.WriteRune(r)
			last = r
		}
	}

	return sb.String()
}


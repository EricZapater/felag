package publicseo

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"
)

type Service interface {
	ListPublicDestinations(ctx context.Context, q, countryCode, sort string, page, limit int, lang string) (*PublicDestinationsResponse, error)
	GetPublicDestinationGuide(ctx context.Context, slugOrID string, lang string) (*PublicDestinationGuide, error)
	GetPublicSitemap(ctx context.Context) (*PublicSitemapResponse, error)
}

type cacheEntry[T any] struct {
	data      T
	expiresAt time.Time
}

type service struct {
	repo         Repository
	mu           sync.RWMutex
	listCache    map[string]cacheEntry[*PublicDestinationsResponse]
	guideCache   map[string]cacheEntry[*PublicDestinationGuide]
	sitemapCache *cacheEntry[*PublicSitemapResponse]
}

func NewService(repo Repository) Service {
	return &service{
		repo:       repo,
		listCache:  make(map[string]cacheEntry[*PublicDestinationsResponse]),
		guideCache: make(map[string]cacheEntry[*PublicDestinationGuide]),
	}
}

func (s *service) ListPublicDestinations(ctx context.Context, q, countryCode, sort string, page, limit int, lang string) (*PublicDestinationsResponse, error) {
	lang = normalizeLang(lang)
	cacheKey := fmt.Sprintf("list:%s:%s:%s:%d:%d:%s", strings.TrimSpace(q), strings.TrimSpace(countryCode), sort, page, limit, lang)

	s.mu.RLock()
	if entry, ok := s.listCache[cacheKey]; ok && time.Now().Before(entry.expiresAt) {
		s.mu.RUnlock()
		return entry.data, nil
	}
	s.mu.RUnlock()

	res, err := s.repo.ListPublicDestinations(ctx, q, countryCode, sort, page, limit, 1) // Only destinations with >= 1 tip for public index
	if err != nil {
		return nil, err
	}

	for i := range res.Data {
		count := res.Data[i].TotalFelagisCount
		res.Data[i].EndorsementSummary = formatEndorsementLabel(count, lang)
	}

	s.mu.Lock()
	s.listCache[cacheKey] = cacheEntry[*PublicDestinationsResponse]{
		data:      res,
		expiresAt: time.Now().Add(30 * time.Second),
	}
	s.mu.Unlock()

	return res, nil
}

func (s *service) GetPublicDestinationGuide(ctx context.Context, slugOrID string, lang string) (*PublicDestinationGuide, error) {
	lang = normalizeLang(lang)
	cacheKey := fmt.Sprintf("guide:%s:%s", strings.TrimSpace(slugOrID), lang)

	s.mu.RLock()
	if entry, ok := s.guideCache[cacheKey]; ok && time.Now().Before(entry.expiresAt) {
		s.mu.RUnlock()
		return entry.data, nil
	}
	s.mu.RUnlock()

	item, isTown, townID, countryCode, err := s.repo.GetPublicDestinationBySlugOrID(ctx, slugOrID)
	if err != nil {
		return nil, err
	}

	tips, err := s.repo.GetPublicRecommendationsForDestination(ctx, isTown, townID, countryCode)
	if err != nil {
		return nil, err
	}

	// Localize endorsements for tips
	var food, hiddenGems, transport, practicalTips, anecdotes []PublicAnonymousTip
	for i := range tips {
		tips[i].EndorsementLabel = formatEndorsementLabel(tips[i].EndorsementsCount, lang)

		switch tips[i].Category {
		case "food":
			food = append(food, tips[i])
		case "hidden_gem":
			hiddenGems = append(hiddenGems, tips[i])
		case "transport":
			transport = append(transport, tips[i])
		case "practical_tip":
			practicalTips = append(practicalTips, tips[i])
		case "anecdote":
			anecdotes = append(anecdotes, tips[i])
		default:
			practicalTips = append(practicalTips, tips[i])
		}
	}

	stats := DestinationStats{
		TotalFelagis:       item.TotalFelagisCount,
		TotalTips:          len(tips),
		HiddenGemsCount:    len(hiddenGems),
		FoodSpotsCount:     len(food),
		PracticalTipsCount: len(practicalTips) + len(transport),
	}

	// Generate FAQs from top practical and transport tips
	var faqs []PublicFaqItem
	faqCandidates := append([]PublicAnonymousTip{}, practicalTips...)
	faqCandidates = append(faqCandidates, transport...)
	for _, cand := range faqCandidates {
		if len(faqs) >= 5 {
			break
		}
		qText := formatFaqQuestion(cand.Title, item.Name, lang)
		faqs = append(faqs, PublicFaqItem{
			Question:         qText,
			Answer:           cand.Description,
			EndorsementLabel: cand.EndorsementLabel,
		})
	}

	// Related destinations
	related, _ := s.repo.GetRelatedDestinations(ctx, item.CountryCode, item.ID, 4)

	// SEO Pack
	seo := generateSeoPack(item, stats, faqs, lang)

	item.EndorsementSummary = formatEndorsementLabel(item.TotalFelagisCount, lang)

	guide := &PublicDestinationGuide{
		Destination: *item,
		Stats:       stats,
		Categories: CategorizedTips{
			Food:         nonNilTips(food),
			HiddenGem:    nonNilTips(hiddenGems),
			Transport:    nonNilTips(transport),
			PracticalTip: nonNilTips(practicalTips),
			Anecdote:     nonNilTips(anecdotes),
		},
		Faqs:                faqs,
		RelatedDestinations: nonNilItems(related),
		Seo:                 seo,
	}

	s.mu.Lock()
	s.guideCache[cacheKey] = cacheEntry[*PublicDestinationGuide]{
		data:      guide,
		expiresAt: time.Now().Add(60 * time.Second),
	}
	s.mu.Unlock()

	return guide, nil
}

func (s *service) GetPublicSitemap(ctx context.Context) (*PublicSitemapResponse, error) {
	s.mu.RLock()
	if s.sitemapCache != nil && time.Now().Before(s.sitemapCache.expiresAt) {
		data := s.sitemapCache.data
		s.mu.RUnlock()
		return data, nil
	}
	s.mu.RUnlock()

	entries, err := s.repo.GetPublicSitemapEntries(ctx)
	if err != nil {
		return nil, err
	}
	res := &PublicSitemapResponse{
		Total:   len(entries),
		Entries: entries,
	}

	s.mu.Lock()
	s.sitemapCache = &cacheEntry[*PublicSitemapResponse]{
		data:      res,
		expiresAt: time.Now().Add(10 * time.Minute),
	}
	s.mu.Unlock()

	return res, nil
}

func normalizeLang(lang string) string {
	switch strings.ToLower(strings.TrimSpace(lang)) {
	case "es":
		return "es"
	case "en":
		return "en"
	default:
		return "ca"
	}
}

func formatEndorsementLabel(count int, lang string) string {
	switch lang {
	case "es":
		if count <= 1 {
			return "1 felagi lo avala"
		}
		return fmt.Sprintf("%d felagis lo avalan", count)
	case "en":
		if count <= 1 {
			return "Endorsed by 1 felagi"
		}
		return fmt.Sprintf("Endorsed by %d felagis", count)
	default: // ca
		if count <= 1 {
			return "1 felagi ho avala"
		}
		return fmt.Sprintf("%d felagis ho avalen", count)
	}
}

func formatFaqQuestion(title, destinationName, lang string) string {
	if strings.HasSuffix(title, "?") || strings.HasSuffix(title, "？") {
		return title
	}
	switch lang {
	case "es":
		return fmt.Sprintf("¿Cómo es %s en %s?", title, destinationName)
	case "en":
		return fmt.Sprintf("How is %s in %s?", title, destinationName)
	default:
		return fmt.Sprintf("Com funciona %s a %s?", title, destinationName)
	}
}

func generateSeoPack(item *PublicDestinationItem, stats DestinationStats, faqs []PublicFaqItem, lang string) SeoMetadata {
	destName := item.Name
	countryName := item.CountryName
	slug := item.Slug

	var metaTitle, metaDesc, ogTitle, ogDesc string
	var keywords []string

	canonicalURL := fmt.Sprintf("https://felag.app/destinacions/%s", slug)
	ogImageURL := fmt.Sprintf("https://felag.app/api/v1/public/og-image/%s", slug)

	robots := "index, follow"
	if stats.TotalTips < 1 {
		robots = "noindex, follow"
	}

	switch lang {
	case "es":
		metaTitle = fmt.Sprintf("Guía de viaje a %s: consejos y rincones de felagis | FELAG", destName)
		metaDesc = fmt.Sprintf("Descubre %d consejos prácticos y rincones secretos en %s avalados por %d felagis. Gastronomía, transporte y rutas locales.", stats.TotalTips, destName, stats.TotalFelagis)
		ogTitle = fmt.Sprintf("Guía de viaje a %s — Consejos de la comunidad FELAG", destName)
		ogDesc = fmt.Sprintf("%d recomendaciones y rincones en %s (%s) avalados por %d viajeros.", stats.TotalTips, destName, countryName, stats.TotalFelagis)
		keywords = []string{
			fmt.Sprintf("viajar a %s", destName),
			fmt.Sprintf("consejos %s", destName),
			fmt.Sprintf("rincones secretos %s", destName),
			fmt.Sprintf("qué ver en %s", destName),
			fmt.Sprintf("gastronomía %s", destName),
			fmt.Sprintf("felagis %s", countryName),
		}
	case "en":
		metaTitle = fmt.Sprintf("%s Travel Guide: local tips & hidden gems by felagis | FELAG", destName)
		metaDesc = fmt.Sprintf("Explore %d authentic travel tips and hidden gems in %s endorsed by %d felagis. Food spots, transport advice and local insights.", stats.TotalTips, destName, stats.TotalFelagis)
		ogTitle = fmt.Sprintf("%s Travel Guide — Community tips by FELAG", destName)
		ogDesc = fmt.Sprintf("%d local recommendations in %s (%s) endorsed by %d travelers.", stats.TotalTips, destName, countryName, stats.TotalFelagis)
		keywords = []string{
			fmt.Sprintf("travel to %s", destName),
			fmt.Sprintf("%s travel tips", destName),
			fmt.Sprintf("%s hidden gems", destName),
			fmt.Sprintf("things to do in %s", destName),
			fmt.Sprintf("%s guide", destName),
			fmt.Sprintf("felagis %s", countryName),
		}
	default: // ca
		metaTitle = fmt.Sprintf("Guia de viatge a %s: consells i racons de felagis | FELAG", destName)
		metaDesc = fmt.Sprintf("Descobreix %d consells pràctics i racons secrets a %s avalats per %d felagis. Gastronomia, transport i rutes locals.", stats.TotalTips, destName, stats.TotalFelagis)
		ogTitle = fmt.Sprintf("Guia de viatge a %s — Consells de la comunitat FELAG", destName)
		ogDesc = fmt.Sprintf("%d recomanacions i racons a %s (%s) avalats per %d viatgers.", stats.TotalTips, destName, countryName, stats.TotalFelagis)
		keywords = []string{
			fmt.Sprintf("viatjar a %s", destName),
			fmt.Sprintf("consells %s", destName),
			fmt.Sprintf("racons secrets %s", destName),
			fmt.Sprintf("què veure a %s", destName),
			fmt.Sprintf("gastronomia %s", destName),
			fmt.Sprintf("felagis %s", countryName),
		}
	}

	// Schema.org JSON-LD (TouristDestination + ItemList + FAQPage)
	var faqSchema []map[string]interface{}
	for _, f := range faqs {
		faqSchema = append(faqSchema, map[string]interface{}{
			"@type": "Question",
			"name":  f.Question,
			"acceptedAnswer": map[string]interface{}{
				"@type": "Answer",
				"text":  f.Answer,
			},
		})
	}

	jsonLd := map[string]interface{}{
		"@context":    "https://schema.org",
		"@type":       "TouristDestination",
		"name":        destName,
		"description": metaDesc,
		"url":         canonicalURL,
		"touristType": "Independent travelers and community explorers",
		"containedInPlace": map[string]interface{}{
			"@type": "Country",
			"name":  countryName,
		},
	}

	if len(faqSchema) > 0 {
		jsonLd["mainEntity"] = map[string]interface{}{
			"@type":      "FAQPage",
			"mainEntity": faqSchema,
		}
	}

	breadcrumbs := []BreadcrumbItem{
		{Name: "FELAG", URL: "https://felag.app"},
		{Name: countryName, URL: fmt.Sprintf("https://felag.app/destinacions?country=%s", item.CountryCode)},
		{Name: destName, URL: canonicalURL},
	}

	return SeoMetadata{
		MetaTitle:       metaTitle,
		MetaDescription: metaDesc,
		Keywords:        keywords,
		CanonicalURL:    canonicalURL,
		OgTitle:         ogTitle,
		OgDescription:   ogDesc,
		OgImageURL:      ogImageURL,
		Robots:          robots,
		Breadcrumbs:     breadcrumbs,
		JsonLd:          jsonLd,
	}
}

func nonNilTips(tips []PublicAnonymousTip) []PublicAnonymousTip {
	if tips == nil {
		return []PublicAnonymousTip{}
	}
	return tips
}

func nonNilItems(items []PublicDestinationItem) []PublicDestinationItem {
	if items == nil {
		return []PublicDestinationItem{}
	}
	return items
}

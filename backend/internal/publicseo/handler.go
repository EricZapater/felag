package publicseo

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	pub := r.Group("/public")
	{
		pub.GET("/destinations", h.ListDestinations)
		pub.GET("/destinations/:slug_or_id", h.GetDestinationGuide)
		pub.GET("/sitemap", h.GetSitemap)
		pub.GET("/og-image/:slug_or_id", h.GetDynamicOgImage)
	}
}

func (h *Handler) ListDestinations(c *gin.Context) {
	q := c.Query("q")
	countryCode := c.Query("country_code")
	sort := c.DefaultQuery("sort", "popular")
	lang := c.DefaultQuery("lang", "ca")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	res, err := h.service.ListPublicDestinations(c.Request.Context(), q, countryCode, sort, page, limit, lang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error", "message": err.Error()})
		return
	}

	c.Header("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200")
	c.JSON(http.StatusOK, res)
}

func (h *Handler) GetDestinationGuide(c *gin.Context) {
	slugOrID := c.Param("slug_or_id")
	if strings.TrimSpace(slugOrID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "Destination slug or ID is required"})
		return
	}

	lang := c.DefaultQuery("lang", "ca")

	guide, err := h.service.GetPublicDestinationGuide(c.Request.Context(), slugOrID, lang)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "Destination not found or has no public content"})
		return
	}

	c.Header("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200")
	c.JSON(http.StatusOK, guide)
}

func (h *Handler) GetSitemap(c *gin.Context) {
	sitemap, err := h.service.GetPublicSitemap(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error", "message": err.Error()})
		return
	}

	c.Header("Cache-Control", "public, max-age=86400, s-maxage=604800")
	c.JSON(http.StatusOK, sitemap)
}

// GetDynamicOgImage generates an SVG card suitable for OpenGraph / social sharing
func (h *Handler) GetDynamicOgImage(c *gin.Context) {
	slugOrID := c.Param("slug_or_id")
	lang := c.DefaultQuery("lang", "ca")

	guide, err := h.service.GetPublicDestinationGuide(c.Request.Context(), slugOrID, lang)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}

	destName := escapeXML(guide.Destination.Name)
	countryName := escapeXML(guide.Destination.CountryName)
	flag := escapeXML(*guide.Destination.FlagEmoji)
	statsText := escapeXML(fmt.Sprintf("%d consells i racons secrets · %d felagis", guide.Stats.TotalTips, guide.Stats.TotalFelagis))
	if lang == "es" {
		statsText = escapeXML(fmt.Sprintf("%d consejos y rincones secretos · %d felagis", guide.Stats.TotalTips, guide.Stats.TotalFelagis))
	} else if lang == "en" {
		statsText = escapeXML(fmt.Sprintf("%d local tips & hidden gems · %d felagis", guide.Stats.TotalTips, guide.Stats.TotalFelagis))
	}

	svg := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%%" stop-color="#2C221E"/>
      <stop offset="100%%" stop-color="#4A3B32"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%%" stop-color="#C85A32"/>
      <stop offset="100%%" stop-color="#E65100"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle grid & decoration -->
  <circle cx="1050" cy="150" r="300" fill="#C85A32" opacity="0.12"/>
  <circle cx="150" cy="500" r="250" fill="#FFE082" opacity="0.06"/>

  <!-- FELAG Brand badge -->
  <rect x="80" y="70" width="130" height="42" rx="10" fill="#C85A32"/>
  <text x="145" y="98" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" letter-spacing="3" text-anchor="middle">FELAG</text>
  <text x="230" y="98" fill="rgba(255,255,255,0.7)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="600">Guies Comunitàries de Viatge</text>

  <!-- Destination title -->
  <text x="80" y="240" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="800">%s %s</text>
  <text x="80" y="300" fill="#FFE082" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="600">📍 %s</text>

  <!-- Stats Pill -->
  <rect x="80" y="370" width="620" height="68" rx="20" fill="rgba(255, 255, 255, 0.12)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2"/>
  <text x="110" y="413" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700">✨ %s</text>

  <!-- Community trust note -->
  <text x="80" y="520" fill="rgba(255, 255, 255, 0.8)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="500">Troba gent de la teva terra allà on viatgis · felag.app</text>
</svg>`, destName, flag, countryName, statsText)

	c.Header("Content-Type", "image/svg+xml; charset=utf-8")
	c.Header("Cache-Control", "public, max-age=86400, s-maxage=604800")
	c.String(http.StatusOK, svg)
}

func escapeXML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "'", "&apos;")
	return s
}

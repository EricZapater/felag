package places

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// GooglePlacesClient is the HTTP client for Google Places API (New)
type GooglePlacesClient struct {
	apiKey     string
	httpClient *http.Client
	baseURL    string
}

func NewGooglePlacesClient() *GooglePlacesClient {
	apiKey := os.Getenv("GOOGLE_PLACES_API_KEY")
	return &GooglePlacesClient{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		baseURL: "https://places.googleapis.com/v1",
	}
}

// GoogleAutocompleteRawResponse models the response from places:autocomplete
type GoogleAutocompleteRawResponse struct {
	Suggestions []struct {
		PlacePrediction struct {
			Place            string `json:"place"`
			PlaceID          string `json:"placeId"`
			Text             struct {
				Text string `json:"text"`
			} `json:"text"`
			StructuredFormat struct {
				MainText struct {
					Text string `json:"text"`
				} `json:"mainText"`
				SecondaryText struct {
					Text string `json:"text"`
				} `json:"secondaryText"`
			} `json:"structuredFormat"`
			Types []string `json:"types"`
		} `json:"placePrediction"`
	} `json:"suggestions"`
}

// GooglePlaceDetailsRawResponse models the response from places/{placeId}
type GooglePlaceDetailsRawResponse struct {
	ID          string `json:"id"`
	DisplayName struct {
		Text         string `json:"text"`
		LanguageCode string `json:"languageCode"`
	} `json:"displayName"`
	FormattedAddress  string `json:"formattedAddress"`
	AddressComponents []struct {
		LongText  string   `json:"longText"`
		ShortText string   `json:"shortText"`
		Types     []string `json:"types"`
	} `json:"addressComponents"`
	Location struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	} `json:"location"`
	Viewport struct {
		Low struct {
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"low"`
		High struct {
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"high"`
	} `json:"viewport"`
	Types         []string `json:"types"`
	PrimaryType   string   `json:"primaryType"`
	GoogleMapsURI string   `json:"googleMapsUri"`
	Photos        []struct {
		Name             string `json:"name"`
		WidthPx          int    `json:"widthPx"`
		HeightPx         int    `json:"heightPx"`
		AuthorAttribution []struct {
			DisplayName string `json:"displayName"`
			URI         string `json:"uri"`
		} `json:"authorAttributions"`
	} `json:"photos"`
	UTCOffsetMinutes int `json:"utcOffsetMinutes"`
}

// Autocomplete calls Google Places (New) places:autocomplete
func (c *GooglePlacesClient) Autocomplete(ctx context.Context, input, language, countryCode string, types []string) ([]AutocompletePrediction, int, int, error) {
	if c.apiKey == "" {
		return nil, http.StatusUnauthorized, 0, fmt.Errorf("GOOGLE_PLACES_API_KEY is not set")
	}

	start := time.Now()
	urlStr := fmt.Sprintf("%s/places:autocomplete", c.baseURL)

	reqBody := map[string]interface{}{
		"input": input,
	}
	if language != "" {
		reqBody["languageCode"] = language
	} else {
		reqBody["languageCode"] = "ca"
	}
	if countryCode != "" {
		reqBody["includedRegionCodes"] = []string{strings.ToUpper(countryCode)}
	}
	if len(types) > 0 {
		reqBody["includedPrimaryTypes"] = types
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, 0, int(time.Since(start).Milliseconds()), err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, urlStr, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, 0, int(time.Since(start).Milliseconds()), err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", c.apiKey)

	resp, err := c.httpClient.Do(req)
	duration := int(time.Since(start).Milliseconds())
	if err != nil {
		return nil, 0, duration, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, duration, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, resp.StatusCode, duration, fmt.Errorf("google places autocomplete error (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	var raw GoogleAutocompleteRawResponse
	if err := json.Unmarshal(bodyBytes, &raw); err != nil {
		return nil, resp.StatusCode, duration, err
	}

	var predictions []AutocompletePrediction
	for _, s := range raw.Suggestions {
		pred := s.PlacePrediction
		placeID := pred.PlaceID
		if placeID == "" && strings.HasPrefix(pred.Place, "places/") {
			placeID = strings.TrimPrefix(pred.Place, "places/")
		}

		mainText := pred.StructuredFormat.MainText.Text
		if mainText == "" {
			mainText = pred.Text.Text
		}

		predictions = append(predictions, AutocompletePrediction{
			GooglePlaceID: placeID,
			MainText:      mainText,
			SecondaryText: pred.StructuredFormat.SecondaryText.Text,
			FullText:      pred.Text.Text,
			Types:         pred.Types,
		})
	}

	return predictions, resp.StatusCode, duration, nil
}

// FetchPlaceDetails calls Google Places (New) places/{placeId}
func (c *GooglePlacesClient) FetchPlaceDetails(ctx context.Context, placeID, language string) (*GooglePlaceDetailsRawResponse, []byte, int, int, error) {
	if c.apiKey == "" {
		return nil, nil, http.StatusUnauthorized, 0, fmt.Errorf("GOOGLE_PLACES_API_KEY is not set")
	}

	// Remove places/ prefix if present
	cleanPlaceID := strings.TrimPrefix(placeID, "places/")

	start := time.Now()
	urlStr := fmt.Sprintf("%s/places/%s", c.baseURL, url.PathEscape(cleanPlaceID))
	if language != "" {
		urlStr = fmt.Sprintf("%s?languageCode=%s", urlStr, url.QueryEscape(language))
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, urlStr, nil)
	if err != nil {
		return nil, nil, 0, int(time.Since(start).Milliseconds()), err
	}

	req.Header.Set("X-Goog-Api-Key", c.apiKey)
	req.Header.Set("X-Goog-FieldMask", "id,displayName,formattedAddress,addressComponents,location,viewport,types,primaryType,googleMapsUri,photos,utcOffsetMinutes")

	resp, err := c.httpClient.Do(req)
	duration := int(time.Since(start).Milliseconds())
	if err != nil {
		return nil, nil, 0, duration, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, resp.StatusCode, duration, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, nil, resp.StatusCode, duration, fmt.Errorf("google places details error (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	var raw GooglePlaceDetailsRawResponse
	if err := json.Unmarshal(bodyBytes, &raw); err != nil {
		return nil, nil, resp.StatusCode, duration, err
	}

	return &raw, bodyBytes, resp.StatusCode, duration, nil
}

-- Migration: Create places table, external_api_logs, and link to trips, recommendations, moments

-- 1. Create canonical places table (Google Places cache & reference)
CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_place_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    formatted_address TEXT,
    country_code VARCHAR(10),
    country_name VARCHAR(100),
    administrative_area VARCHAR(150),
    locality VARCHAR(150),
    postal_code VARCHAR(50),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    viewport_ne_lat DECIMAL(10, 8),
    viewport_ne_lng DECIMAL(11, 8),
    viewport_sw_lat DECIMAL(10, 8),
    viewport_sw_lng DECIMAL(11, 8),
    place_types TEXT[],
    primary_type VARCHAR(100),
    google_maps_uri TEXT,
    photo_reference TEXT,
    utc_offset_minutes INT,
    raw_data JSONB,
    slug VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_places_google_place_id ON places(google_place_id);
CREATE INDEX IF NOT EXISTS idx_places_country_code ON places(country_code);
CREATE INDEX IF NOT EXISTS idx_places_locality ON places(locality);
CREATE INDEX IF NOT EXISTS idx_places_coords ON places(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_places_slug ON places(slug);
CREATE INDEX IF NOT EXISTS idx_places_primary_type ON places(primary_type);

-- 2. Create external_api_logs table to track Google Places API usage and costs
CREATE TABLE IF NOT EXISTS external_api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL DEFAULT 'google_places',
    endpoint VARCHAR(100) NOT NULL,
    status_code INT NOT NULL,
    duration_ms INT NOT NULL,
    cached BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_external_api_logs_provider_created ON external_api_logs(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_api_logs_endpoint ON external_api_logs(endpoint);

-- 3. Update trip_stages with place references
ALTER TABLE trip_stages 
    ADD COLUMN IF NOT EXISTS place_id UUID REFERENCES places(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

CREATE INDEX IF NOT EXISTS idx_trip_stages_place_id ON trip_stages(place_id);
CREATE INDEX IF NOT EXISTS idx_trip_stages_google_place_id ON trip_stages(google_place_id);

-- 4. Update destination_recommendations with place references (and allow nullable town_id when place_id is used)
ALTER TABLE destination_recommendations 
    ALTER COLUMN town_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS place_id UUID REFERENCES places(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
    ADD COLUMN IF NOT EXISTS formatted_address TEXT;

CREATE INDEX IF NOT EXISTS idx_destination_recommendations_place_id ON destination_recommendations(place_id);
CREATE INDEX IF NOT EXISTS idx_destination_recommendations_google_place_id ON destination_recommendations(google_place_id);

-- 5. Update destination_live_moments with place references (and allow nullable town_id when place_id is used)
ALTER TABLE destination_live_moments 
    ALTER COLUMN town_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS place_id UUID REFERENCES places(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_destination_live_moments_place_id ON destination_live_moments(place_id);
CREATE INDEX IF NOT EXISTS idx_destination_live_moments_google_place_id ON destination_live_moments(google_place_id);

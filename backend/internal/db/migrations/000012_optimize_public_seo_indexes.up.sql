-- Migration: Add partial and composite indexes for ultra-fast public SEO queries

CREATE INDEX IF NOT EXISTS idx_dest_recs_public_town 
    ON destination_recommendations(town_id) 
    WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_dest_recs_public_country 
    ON destination_recommendations(country_code) 
    WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_towns_slug_lower 
    ON towns(LOWER(slug));

CREATE INDEX IF NOT EXISTS idx_countries_slug_lower 
    ON countries(LOWER(slug));

CREATE INDEX IF NOT EXISTS idx_trip_stages_country_code 
    ON trip_stages(country_code);

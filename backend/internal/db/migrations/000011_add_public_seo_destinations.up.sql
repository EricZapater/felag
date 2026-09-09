-- Migration: Add is_public column to recommendations and slug columns for SEO destinations

ALTER TABLE destination_recommendations 
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_destination_recommendations_is_public 
    ON destination_recommendations(is_public);

ALTER TABLE towns 
    ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

ALTER TABLE countries 
    ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Generate initial slugs for existing towns and countries
UPDATE towns 
SET slug = trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL;

UPDATE countries 
SET slug = trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL;

CREATE INDEX IF NOT EXISTS idx_towns_slug ON towns(slug);
CREATE INDEX IF NOT EXISTS idx_countries_slug ON countries(slug);

-- Revert public SEO migration

DROP INDEX IF EXISTS idx_countries_slug;
DROP INDEX IF EXISTS idx_towns_slug;
ALTER TABLE countries DROP COLUMN IF EXISTS slug;
ALTER TABLE towns DROP COLUMN IF EXISTS slug;
DROP INDEX IF EXISTS idx_destination_recommendations_is_public;
ALTER TABLE destination_recommendations DROP COLUMN IF EXISTS is_public;

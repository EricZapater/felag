-- Migration Down: Remove public SEO performance indexes

DROP INDEX IF EXISTS idx_dest_recs_public_town;
DROP INDEX IF EXISTS idx_dest_recs_public_country;
DROP INDEX IF EXISTS idx_towns_slug_lower;
DROP INDEX IF EXISTS idx_countries_slug_lower;
DROP INDEX IF EXISTS idx_trip_stages_country_code;

-- Migration down: Drop search indexes
DROP INDEX IF EXISTS idx_towns_name_lower;
DROP INDEX IF EXISTS idx_towns_name_trgm;
DROP INDEX IF EXISTS idx_regions_name_lower;
DROP INDEX IF EXISTS idx_regions_name_trgm;
DROP INDEX IF EXISTS idx_countries_name_lower;
DROP INDEX IF EXISTS idx_countries_code_lower;
DROP INDEX IF EXISTS idx_countries_name_trgm;

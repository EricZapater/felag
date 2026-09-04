-- Migration: Optimize geographic search with indexes and pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_towns_name_lower ON towns (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_towns_name_trgm ON towns USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_regions_name_lower ON regions (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_regions_name_trgm ON regions USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_countries_name_lower ON countries (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_countries_code_lower ON countries (LOWER(code));
CREATE INDEX IF NOT EXISTS idx_countries_name_trgm ON countries USING gin (name gin_trgm_ops);

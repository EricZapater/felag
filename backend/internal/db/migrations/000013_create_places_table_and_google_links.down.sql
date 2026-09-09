-- Migration Down: Remove places links, external_api_logs, and places table

ALTER TABLE destination_live_moments DROP COLUMN IF EXISTS google_place_id, DROP COLUMN IF EXISTS place_id;
ALTER TABLE destination_recommendations DROP COLUMN IF EXISTS formatted_address, DROP COLUMN IF EXISTS longitude, DROP COLUMN IF EXISTS latitude, DROP COLUMN IF EXISTS google_place_id, DROP COLUMN IF EXISTS place_id;
ALTER TABLE trip_stages DROP COLUMN IF EXISTS longitude, DROP COLUMN IF EXISTS latitude, DROP COLUMN IF EXISTS google_place_id, DROP COLUMN IF EXISTS place_id;

DROP TABLE IF EXISTS external_api_logs;
DROP TABLE IF EXISTS places;

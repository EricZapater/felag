-- Migration: Drop community knowledge and real-time moments tables

DROP TABLE IF EXISTS community_reports;
DROP TABLE IF EXISTS destination_live_moments;
DROP TABLE IF EXISTS recommendation_comments;
DROP TABLE IF EXISTS recommendation_votes;
DROP TABLE IF EXISTS destination_recommendations;

ALTER TABLE trips DROP COLUMN IF EXISTS photo_sharing_mode;
ALTER TABLE trip_stages DROP COLUMN IF EXISTS region_id;
ALTER TABLE trip_stages DROP COLUMN IF EXISTS town_id;

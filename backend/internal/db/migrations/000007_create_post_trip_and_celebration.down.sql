-- Migration Down: Drop post-trip photos, celebration cards, trip feedback and wrapup status tables

DROP TABLE IF EXISTS wrapup_tasks_status;
DROP TABLE IF EXISTS trip_feedback;
DROP TABLE IF EXISTS celebration_cards;
DROP TABLE IF EXISTS trip_photos;

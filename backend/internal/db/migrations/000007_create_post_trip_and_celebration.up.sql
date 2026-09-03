-- Migration: Create post-trip photos, celebration cards, trip feedback and wrapup status tables

CREATE TABLE IF NOT EXISTS trip_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption VARCHAR(280),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    location_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id ON trip_photos(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_user_id ON trip_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_featured ON trip_photos(trip_id, is_featured);

CREATE TABLE IF NOT EXISTS celebration_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    headline VARCHAR(255) NOT NULL,
    subheadline TEXT,
    location_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_celebration_cards_trip_id ON celebration_cards(trip_id);
CREATE INDEX IF NOT EXISTS idx_celebration_cards_user_1 ON celebration_cards(user_1_id);
CREATE INDEX IF NOT EXISTS idx_celebration_cards_user_2 ON celebration_cards(user_2_id);
CREATE INDEX IF NOT EXISTS idx_celebration_cards_match_id ON celebration_cards(match_id);

CREATE TABLE IF NOT EXISTS trip_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trip_feedback_trip_id ON trip_feedback(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_feedback_user_id ON trip_feedback(user_id);

CREATE TABLE IF NOT EXISTS wrapup_tasks_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    celebration_completed BOOLEAN NOT NULL DEFAULT FALSE,
    feedback_completed BOOLEAN NOT NULL DEFAULT FALSE,
    stories_shared BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wrapup_tasks_trip_user UNIQUE (trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wrapup_tasks_status_trip_user ON wrapup_tasks_status(trip_id, user_id);

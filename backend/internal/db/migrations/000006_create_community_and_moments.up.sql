-- Migration: Create community knowledge and real-time moments tables

ALTER TABLE trip_stages 
    ADD COLUMN IF NOT EXISTS town_id UUID REFERENCES towns(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

ALTER TABLE trips 
    ADD COLUMN IF NOT EXISTS photo_sharing_mode VARCHAR(50) NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS destination_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    town_id UUID REFERENCES towns(id) ON DELETE CASCADE,
    country_code VARCHAR(10),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    location_name VARCHAR(255),
    useful_votes_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendation_votes (
    recommendation_id UUID NOT NULL REFERENCES destination_recommendations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(recommendation_id, user_id)
);

CREATE TABLE IF NOT EXISTS recommendation_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES destination_recommendations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS destination_live_moments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    town_id UUID NOT NULL REFERENCES towns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption VARCHAR(280),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL,
    details TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trip_stages_town_id ON trip_stages(town_id);
CREATE INDEX IF NOT EXISTS idx_trip_stages_region_id ON trip_stages(region_id);
CREATE INDEX IF NOT EXISTS idx_destination_recommendations_town_id ON destination_recommendations(town_id);
CREATE INDEX IF NOT EXISTS idx_destination_recommendations_country_code ON destination_recommendations(country_code);
CREATE INDEX IF NOT EXISTS idx_destination_recommendations_user_id ON destination_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_destination_recommendations_category ON destination_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_recommendation_votes_user_id ON recommendation_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_comments_rec_id ON recommendation_comments(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_destination_live_moments_town_id ON destination_live_moments(town_id);
CREATE INDEX IF NOT EXISTS idx_destination_live_moments_trip_id ON destination_live_moments(trip_id);
CREATE INDEX IF NOT EXISTS idx_destination_live_moments_user_id ON destination_live_moments(user_id);
CREATE INDEX IF NOT EXISTS idx_destination_live_moments_created_at ON destination_live_moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_reports_target ON community_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_reporter ON community_reports(reporter_id);

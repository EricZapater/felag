-- Migration: Create trip_companions table for shared trips
CREATE TABLE IF NOT EXISTS trip_companions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'companion', -- 'owner' | 'companion'
    status VARCHAR(50) NOT NULL DEFAULT 'accepted', -- 'accepted' | 'pending'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_companions_user ON trip_companions(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_companions_trip ON trip_companions(trip_id);

-- Backfill existing trips with their creators as 'owner'
INSERT INTO trip_companions (trip_id, user_id, role, status, created_at)
SELECT id, user_id, 'owner', 'accepted', created_at
FROM trips
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Migration: Create origins and users tables

CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS towns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(30),
    avatar_url VARCHAR(512),
    bio TEXT,
    town_id UUID REFERENCES towns(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Origin Hierarchy (Espanya, França, Itàlia, Andorra)
DO $$
DECLARE
    es_id UUID := gen_random_uuid();
    fr_id UUID := gen_random_uuid();
    it_id UUID := gen_random_uuid();
    ad_id UUID := gen_random_uuid();

    cat_id UUID := gen_random_uuid();
    val_id UUID := gen_random_uuid();
    bal_id UUID := gen_random_uuid();
BEGIN
    -- Countries
    INSERT INTO countries (id, name, code) VALUES
        (es_id, 'Espanya', 'ES'),
        (fr_id, 'França', 'FR'),
        (it_id, 'Itàlia', 'IT'),
        (ad_id, 'Andorra', 'AD')
    ON CONFLICT (code) DO NOTHING;

    -- Regions for Espanya
    INSERT INTO regions (id, name, country_id) VALUES
        (cat_id, 'Catalunya', es_id),
        (val_id, 'Comunitat Valenciana', es_id),
        (bal_id, 'Illes Balears', es_id);

    -- Towns for Catalunya
    INSERT INTO towns (name, region_id) VALUES
        ('Vic', cat_id),
        ('Barcelona', cat_id),
        ('Girona', cat_id),
        ('Manresa', cat_id),
        ('Tarragona', cat_id),
        ('Lleida', cat_id);

    -- Towns for Comunitat Valenciana
    INSERT INTO towns (name, region_id) VALUES
        ('València', val_id),
        ('Alacant', val_id),
        ('Castelló de la Plana', val_id);

    -- Towns for Illes Balears
    INSERT INTO towns (name, region_id) VALUES
        ('Palma', bal_id),
        ('Eivissa', bal_id),
        ('Maó', bal_id);
END $$;

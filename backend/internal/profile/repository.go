package profile

import (
	"database/sql"
	"fmt"
)

type Repository interface {
	GetProfile(userID string) (*Profile, error)
	UpdateProfile(userID string, name, phoneNumber, bio *string) error
	UpdateAvatar(userID string, avatarURL string) error
	UpdateOrigin(userID, townID string) error
	GetCountries() ([]Country, error)
	GetRegionsByCountry(countryID string) ([]Region, error)
	GetTownsByRegion(regionID string) ([]Town, error)
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetProfile(userID string) (*Profile, error) {
	query := `
		SELECT u.id, u.name, u.email, u.phone_number, u.avatar_url, u.bio,
		       t.id, t.name, r.id, r.name, c.id, c.name, c.code
		FROM users u
		LEFT JOIN towns t ON u.town_id = t.id
		LEFT JOIN regions r ON t.region_id = r.id
		LEFT JOIN countries c ON r.country_id = c.id
		WHERE u.id = $1
	`
	p := &Profile{}
	var townID, townName, regionID, regionName, countryID, countryName, countryCode sql.NullString

	err := r.db.QueryRow(query, userID).Scan(
		&p.ID, &p.Name, &p.Email, &p.PhoneNumber, &p.AvatarURL, &p.Bio,
		&townID, &townName, &regionID, &regionName, &countryID, &countryName, &countryCode,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying profile: %w", err)
	}

	if townID.Valid {
		p.Origin = &OriginHierarchy{
			Country: Country{ID: countryID.String, Name: countryName.String, Code: countryCode.String},
			Region:  Region{ID: regionID.String, Name: regionName.String, CountryID: countryID.String},
			Town:    Town{ID: townID.String, Name: townName.String, RegionID: regionID.String},
		}
	}

	return p, nil
}

func (r *repository) UpdateProfile(userID string, name, phoneNumber, bio *string) error {
	query := `
		UPDATE users
		SET name = COALESCE($2, name),
		    phone_number = COALESCE($3, phone_number),
		    bio = COALESCE($4, bio),
		    updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(query, userID, name, phoneNumber, bio)
	if err != nil {
		return fmt.Errorf("error updating profile: %w", err)
	}
	return nil
}

func (r *repository) UpdateAvatar(userID string, avatarURL string) error {
	query := `
		UPDATE users
		SET avatar_url = $2, updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(query, userID, avatarURL)
	if err != nil {
		return fmt.Errorf("error updating avatar_url: %w", err)
	}
	return nil
}

func (r *repository) UpdateOrigin(userID, townID string) error {
	// Verify townExists
	var exists bool
	err := r.db.QueryRow("SELECT EXISTS(SELECT 1 FROM towns WHERE id = $1)", townID).Scan(&exists)
	if err != nil || !exists {
		return fmt.Errorf("town with id %s does not exist", townID)
	}

	query := `
		UPDATE users
		SET town_id = $2, updated_at = NOW()
		WHERE id = $1
	`
	_, err = r.db.Exec(query, userID, townID)
	if err != nil {
		return fmt.Errorf("error updating origin town_id: %w", err)
	}
	return nil
}

func (r *repository) GetCountries() ([]Country, error) {
	rows, err := r.db.Query("SELECT id, name, code FROM countries ORDER BY name ASC")
	if err != nil {
		return nil, fmt.Errorf("error querying countries: %w", err)
	}
	defer rows.Close()

	var countries []Country
	for rows.Next() {
		var c Country
		if err := rows.Scan(&c.ID, &c.Name, &c.Code); err != nil {
			return nil, err
		}
		countries = append(countries, c)
	}
	return countries, nil
}

func (r *repository) GetRegionsByCountry(countryID string) ([]Region, error) {
	rows, err := r.db.Query("SELECT id, name, country_id FROM regions WHERE country_id = $1 ORDER BY name ASC", countryID)
	if err != nil {
		return nil, fmt.Errorf("error querying regions: %w", err)
	}
	defer rows.Close()

	var regions []Region
	for rows.Next() {
		var reg Region
		if err := rows.Scan(&reg.ID, &reg.Name, &reg.CountryID); err != nil {
			return nil, err
		}
		regions = append(regions, reg)
	}
	return regions, nil
}

func (r *repository) GetTownsByRegion(regionID string) ([]Town, error) {
	rows, err := r.db.Query("SELECT id, name, region_id FROM towns WHERE region_id = $1 ORDER BY name ASC", regionID)
	if err != nil {
		return nil, fmt.Errorf("error querying towns: %w", err)
	}
	defer rows.Close()

	var towns []Town
	for rows.Next() {
		var tw Town
		if err := rows.Scan(&tw.ID, &tw.Name, &tw.RegionID); err != nil {
			return nil, err
		}
		towns = append(towns, tw)
	}
	return towns, nil
}

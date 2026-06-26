package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/Holo-VTL/Holo/control-plane/internal/domain"
	"github.com/Holo-VTL/Holo/control-plane/internal/repo"
)

var _ repo.SettingsRepository = (*SettingsRepo)(nil)

type SettingsRepo struct {
	db *sql.DB
}

func NewSettingsRepo(db *sql.DB) *SettingsRepo {
	return &SettingsRepo{db: db}
}

func (r *SettingsRepo) GetSettings(ctx context.Context) (*domain.SystemSettings, error) {
	query := `SELECT value FROM system_settings WHERE key = 'global'`
	var value string
	err := r.db.QueryRowContext(ctx, query).Scan(&value)
	if err == sql.ErrNoRows {
		settings := domain.DefaultSystemSettings()
		return &settings, nil
	}
	if err != nil {
		return nil, err
	}

	var settings domain.SystemSettings
	if err := json.Unmarshal([]byte(value), &settings); err != nil {
		return nil, err
	}

	return &settings, nil
}

func (r *SettingsRepo) SaveSettings(ctx context.Context, settings *domain.SystemSettings) error {
	value, err := json.Marshal(settings)
	if err != nil {
		return err
	}

	now := formatTime(time.Now().UTC())

	query := `
		INSERT INTO system_settings (key, value, updated_at)
		VALUES ('global', ?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
	`

	_, err = r.db.ExecContext(ctx, query, string(value), now)
	return err
}

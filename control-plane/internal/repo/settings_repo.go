package repo

import (
	"context"

	"github.com/Holo-VTL/Holo/control-plane/internal/domain"
)

type SettingsRepository interface {
	GetSettings(ctx context.Context) (*domain.SystemSettings, error)
	SaveSettings(ctx context.Context, settings *domain.SystemSettings) error
}

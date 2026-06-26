package repo

import (
	"context"

	"github.com/Holo-VTL/Holo/control-plane/internal/domain"
)

type AuditRepository interface {
	Log(ctx context.Context, log domain.AuditLog) error
	Query(ctx context.Context, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error)
	GetByID(ctx context.Context, id string) (*domain.AuditLog, error)
}
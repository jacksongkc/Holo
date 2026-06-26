package repo

import (
	"context"

	"github.com/Holo-VTL/Holo/control-plane/internal/domain"
)

type UserRepository interface {
	CreateUser(ctx context.Context, params domain.CreateUserParams) (*domain.User, error)
	GetUserByID(ctx context.Context, userID string) (*domain.User, error)
	GetUserByUsername(ctx context.Context, username string) (*domain.User, error)
	ListUsers(ctx context.Context) ([]*domain.User, error)
	UpdateUser(ctx context.Context, userID string, params domain.UpdateUserParams) (*domain.User, error)
	DeleteUser(ctx context.Context, userID string) error
	UpdateLastLogin(ctx context.Context, userID string) error
	UpdateTwoFactor(ctx context.Context, userID string, enabled bool, secret string) error
}
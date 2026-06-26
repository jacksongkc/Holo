package sqlite

import (
	"context"
	"database/sql"
	"time"

	"github.com/Holo-VTL/Holo/control-plane/internal/domain"
	"github.com/Holo-VTL/Holo/control-plane/internal/repo"
	"golang.org/x/crypto/bcrypt"
)

var _ repo.UserRepository = (*UserRepo)(nil)

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func hashPassword(password string) string {
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash)
}

func (r *UserRepo) CreateUser(ctx context.Context, params domain.CreateUserParams) (*domain.User, error) {
	now := time.Now().UTC()
	passwordHash := hashPassword(params.Password)

	var email sql.NullString
	if params.Email != nil {
		email = sql.NullString{String: *params.Email, Valid: true}
	}

	userID := generateID()

	query := `
		INSERT INTO users (user_id, username, email, password_hash, role, status, two_factor_enabled, two_factor_secret, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, 'active', 0, '', ?, ?)
	`

	_, err := r.db.ExecContext(ctx, query,
		userID,
		params.Username,
		email,
		passwordHash,
		params.Role,
		formatTime(now),
		formatTime(now),
	)
	if err != nil {
		return nil, err
	}

	return r.GetUserByID(ctx, userID)
}

func (r *UserRepo) GetUserByID(ctx context.Context, userID string) (*domain.User, error) {
	query := `
		SELECT user_id, username, email, password_hash, role, status, two_factor_enabled, two_factor_secret, created_at, updated_at, last_login_at
		FROM users
		WHERE user_id = ?
	`

	row := r.db.QueryRowContext(ctx, query, userID)
	return scanUser(row)
}

func (r *UserRepo) GetUserByUsername(ctx context.Context, username string) (*domain.User, error) {
	query := `
		SELECT user_id, username, email, password_hash, role, status, two_factor_enabled, two_factor_secret, created_at, updated_at, last_login_at
		FROM users
		WHERE username = ?
	`

	row := r.db.QueryRowContext(ctx, query, username)
	return scanUser(row)
}

func (r *UserRepo) ListUsers(ctx context.Context) ([]*domain.User, error) {
	query := `
		SELECT user_id, username, email, password_hash, role, status, two_factor_enabled, two_factor_secret, created_at, updated_at, last_login_at
		FROM users
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		user, err := scanUserRow(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

func (r *UserRepo) UpdateUser(ctx context.Context, userID string, params domain.UpdateUserParams) (*domain.User, error) {
	now := time.Now().UTC()
	query := "UPDATE users SET updated_at = ?"
	args := []interface{}{formatTime(now)}

	if params.Username != nil {
		query += ", username = ?"
		args = append(args, *params.Username)
	}

	if params.Email != nil {
		query += ", email = ?"
		args = append(args, sql.NullString{String: *params.Email, Valid: params.Email != nil})
	}

	if params.Password != nil {
		passwordHash := hashPassword(*params.Password)
		query += ", password_hash = ?"
		args = append(args, passwordHash)
	}

	if params.Role != nil {
		query += ", role = ?"
		args = append(args, *params.Role)
	}

	if params.Status != nil {
		query += ", status = ?"
		args = append(args, *params.Status)
	}

	query += " WHERE user_id = ?"
	args = append(args, userID)

	_, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	return r.GetUserByID(ctx, userID)
}

func (r *UserRepo) DeleteUser(ctx context.Context, userID string) error {
	query := "DELETE FROM users WHERE user_id = ?"
	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

func (r *UserRepo) UpdateLastLogin(ctx context.Context, userID string) error {
	query := "UPDATE users SET last_login_at = ?, updated_at = ? WHERE user_id = ?"
	now := formatTime(time.Now().UTC())
	_, err := r.db.ExecContext(ctx, query, now, now, userID)
	return err
}

func (r *UserRepo) UpdateTwoFactor(ctx context.Context, userID string, enabled bool, secret string) error {
	query := "UPDATE users SET two_factor_enabled = ?, two_factor_secret = ?, updated_at = ? WHERE user_id = ?"
	now := formatTime(time.Now().UTC())
	_, err := r.db.ExecContext(ctx, query, boolToInt(enabled), secret, now, userID)
	return err
}

func scanUser(row *sql.Row) (*domain.User, error) {
	var (
		userID           string
		username         string
		email            sql.NullString
		passwordHash     string
		role             string
		status           string
		twoFactorEnabled int
		twoFactorSecret  string
		createdAt        string
		updatedAt        string
		lastLoginAt      sql.NullString
	)

	err := row.Scan(
		&userID,
		&username,
		&email,
		&passwordHash,
		&role,
		&status,
		&twoFactorEnabled,
		&twoFactorSecret,
		&createdAt,
		&updatedAt,
		&lastLoginAt,
	)
	if err == sql.ErrNoRows {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	var emailPtr *string
	if email.Valid {
		emailPtr = &email.String
	}

	var lastLoginPtr *time.Time
	if lastLoginAt.Valid {
		t := parseTime(lastLoginAt.String)
		lastLoginPtr = &t
	}

	return &domain.User{
		UserID:           userID,
		Username:         username,
		Email:            emailPtr,
		PasswordHash:     passwordHash,
		Role:             domain.UserRole(role),
		Status:           domain.UserStatus(status),
		TwoFactorEnabled: twoFactorEnabled == 1,
		TwoFactorSecret:  twoFactorSecret,
		CreatedAt:        parseTime(createdAt),
		UpdatedAt:        parseTime(updatedAt),
		LastLoginAt:      lastLoginPtr,
	}, nil
}

func scanUserRow(rows *sql.Rows) (*domain.User, error) {
	var (
		userID           string
		username         string
		email            sql.NullString
		passwordHash     string
		role             string
		status           string
		twoFactorEnabled int
		twoFactorSecret  string
		createdAt        string
		updatedAt        string
		lastLoginAt      sql.NullString
	)

	err := rows.Scan(
		&userID,
		&username,
		&email,
		&passwordHash,
		&role,
		&status,
		&twoFactorEnabled,
		&twoFactorSecret,
		&createdAt,
		&updatedAt,
		&lastLoginAt,
	)
	if err != nil {
		return nil, err
	}

	var emailPtr *string
	if email.Valid {
		emailPtr = &email.String
	}

	var lastLoginPtr *time.Time
	if lastLoginAt.Valid {
		t := parseTime(lastLoginAt.String)
		lastLoginPtr = &t
	}

	return &domain.User{
		UserID:           userID,
		Username:         username,
		Email:            emailPtr,
		PasswordHash:     passwordHash,
		Role:             domain.UserRole(role),
		Status:           domain.UserStatus(status),
		TwoFactorEnabled: twoFactorEnabled == 1,
		TwoFactorSecret:  twoFactorSecret,
		CreatedAt:        parseTime(createdAt),
		UpdatedAt:        parseTime(updatedAt),
		LastLoginAt:      lastLoginPtr,
	}, nil
}

func generateID() string {
	return time.Now().UTC().Format("user-20060102-150405-000000")
}

package domain

import (
	"time"
)

type UserRole string

const (
	UserRoleAdmin    UserRole = "admin"
	UserRoleOperator UserRole = "operator"
	UserRoleViewer   UserRole = "viewer"
)

type UserStatus string

const (
	UserStatusActive  UserStatus = "active"
	UserStatusDisabled UserStatus = "disabled"
)

type User struct {
	UserID            string     `json:"userId"`
	Username          string     `json:"username"`
	Email             *string    `json:"email,omitempty"`
	PasswordHash      string     `json:"-"`
	Role              UserRole   `json:"role"`
	Status            UserStatus `json:"status"`
	TwoFactorEnabled  bool       `json:"twoFactorEnabled"`
	TwoFactorSecret   string     `json:"-"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
	LastLoginAt       *time.Time `json:"lastLoginAt,omitempty"`
}

type CreateUserParams struct {
	Username string     `json:"username"`
	Email    *string    `json:"email,omitempty"`
	Password string     `json:"password"`
	Role     UserRole   `json:"role"`
}

type UpdateUserParams struct {
	Username *string     `json:"username,omitempty"`
	Email    *string     `json:"email,omitempty"`
	Password *string     `json:"password,omitempty"`
	Role     *UserRole   `json:"role,omitempty"`
	Status   *UserStatus `json:"status,omitempty"`
}
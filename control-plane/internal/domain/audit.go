package domain

import "time"

type AuditAction string

const (
	AuditActionLogin              AuditAction = "login"
	AuditActionLoginFailed        AuditAction = "login_failed"
	AuditActionLogout             AuditAction = "logout"
	AuditActionPasswordChange     AuditAction = "password_change"
	AuditActionPasswordChangeSelf AuditAction = "password_change_self"
	AuditActionUserCreate         AuditAction = "user_create"
	AuditActionUserUpdate         AuditAction = "user_update"
	AuditActionUserDelete         AuditAction = "user_delete"
	AuditActionPoolCreate         AuditAction = "pool_create"
	AuditActionPoolDelete         AuditAction = "pool_delete"
	AuditActionLibraryCreate      AuditAction = "library_create"
	AuditActionLibraryUpdate      AuditAction = "library_update"
	AuditActionLibraryDelete      AuditAction = "library_delete"
	AuditActionDriveCreate        AuditAction = "drive_create"
	AuditActionDriveDelete        AuditAction = "drive_delete"
	AuditActionCartridgeCreate    AuditAction = "cartridge_create"
	AuditActionCartridgeDelete    AuditAction = "cartridge_delete"
)

type AuditLog struct {
	ID         string      `json:"id"`
	UserID     string      `json:"userId"`
	Username   string      `json:"username"`
	Action     AuditAction `json:"action"`
	TargetType string      `json:"targetType"`
	TargetID   string      `json:"targetId"`
	TargetName string      `json:"targetName"`
	IPAddress  string      `json:"ipAddress"`
	Result     string      `json:"result"`
	Details    string      `json:"details"`
	CreatedAt  time.Time   `json:"createdAt"`
}

type AuditLogFilter struct {
	UserID     string
	Action     AuditAction
	TargetType string
	StartDate  *time.Time
	EndDate    *time.Time
	Limit      int
	Offset     int
}
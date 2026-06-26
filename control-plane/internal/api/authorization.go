package api

import (
	"net/http"
	"strings"

	"github.com/Holo-VTL/Holo/control-plane/internal/domain"
)

type Permission string

const (
	PermStorageRead   Permission = "storage:read"
	PermStorageWrite  Permission = "storage:write"
	PermResourcesRead Permission = "resources:read"
	PermResourcesWrite Permission = "resources:write"
	PermTargetsRead   Permission = "targets:read"
	PermTargetsWrite  Permission = "targets:write"
	PermUsersRead     Permission = "users:read"
	PermUsersWrite    Permission = "users:write"
	PermOpsRead       Permission = "ops:read"
	PermSettingsRead  Permission = "settings:read"
	PermSettingsWrite Permission = "settings:write"
)

var rolePermissions = map[domain.UserRole][]Permission{
	domain.UserRoleAdmin: {
		PermStorageRead, PermStorageWrite,
		PermResourcesRead, PermResourcesWrite,
		PermTargetsRead, PermTargetsWrite,
		PermUsersRead, PermUsersWrite,
		PermOpsRead,
		PermSettingsRead, PermSettingsWrite,
	},
	domain.UserRoleOperator: {
		PermStorageRead, PermStorageWrite,
		PermResourcesRead, PermResourcesWrite,
		PermTargetsRead, PermTargetsWrite,
		PermOpsRead,
	},
	domain.UserRoleViewer: {
		PermStorageRead,
		PermResourcesRead,
		PermTargetsRead,
		PermOpsRead,
	},
}

func (s *Server) requirePermission(perm Permission) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		role := domain.UserRole(r.Header.Get("X-Holo-Role"))
		if role == "" {
			role = domain.UserRoleAdmin
		}

		permissions := rolePermissions[role]
		for _, p := range permissions {
			if p == perm {
				return
			}
		}

		respondError(w, http.StatusForbidden, "insufficient permissions", nil)
	}
}

func mapPathToPermission(path, method string) Permission {
	switch {
	case strings.HasPrefix(path, "/v1/users/change-password") || strings.HasPrefix(path, "/v1/users/two-factor") || path == "/v1/users/me":
		return PermOpsRead
	case strings.HasPrefix(path, "/v1/storage/"):
		if method == http.MethodGet {
			return PermStorageRead
		}
		return PermStorageWrite
	case strings.HasPrefix(path, "/v1/libraries") || strings.HasPrefix(path, "/v1/drives") || strings.HasPrefix(path, "/v1/cartridges"):
		if method == http.MethodGet {
			return PermResourcesRead
		}
		return PermResourcesWrite
	case strings.HasPrefix(path, "/v1/targets/"):
		if method == http.MethodGet {
			return PermTargetsRead
		}
		return PermTargetsWrite
	case strings.HasPrefix(path, "/v1/users"):
		if method == http.MethodGet {
			return PermUsersRead
		}
		return PermUsersWrite
	case strings.HasPrefix(path, "/v1/system/settings"):
		if method == http.MethodGet {
			return PermSettingsRead
		}
		return PermSettingsWrite
	case strings.HasPrefix(path, "/v1/system/") || strings.HasPrefix(path, "/v1/ops/") || strings.HasPrefix(path, "/v1/audit/"):
		return PermOpsRead
	default:
		return PermStorageRead
	}
}
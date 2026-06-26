export type UserRole = "admin" | "operator" | "viewer";

export type Permission =
  | "storage:read"
  | "storage:write"
  | "resources:read"
  | "resources:write"
  | "targets:read"
  | "targets:write"
  | "users:read"
  | "users:write"
  | "ops:read"
  | "settings:read"
  | "settings:write";

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "storage:read",
    "storage:write",
    "resources:read",
    "resources:write",
    "targets:read",
    "targets:write",
    "users:read",
    "users:write",
    "ops:read",
    "settings:read",
    "settings:write",
  ],
  operator: [
    "storage:read",
    "storage:write",
    "resources:read",
    "resources:write",
    "targets:read",
    "targets:write",
    "ops:read",
  ],
  viewer: [
    "storage:read",
    "resources:read",
    "targets:read",
    "ops:read",
  ],
};

export const routePermissions: Record<string, Permission> = {
  "/": "storage:read",
  "/storage": "storage:read",
  "/resources": "resources:read",
  "/resources/:libraryId/manage": "resources:write",
  "/targets": "targets:read",
  "/users": "users:read",
  "/system-settings": "settings:read",
  "/audit": "settings:read",
  "/settings": "ops:read",
  "/about": "ops:read",
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function canAccessRoute(role: UserRole, path: string): boolean {
  const permission = routePermissions[path];
  if (!permission) return true;
  return hasPermission(role, permission);
}
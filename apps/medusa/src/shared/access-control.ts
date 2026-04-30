export const ROLE_KEYS = ["super_admin", "store_owner", "manager", "staff"] as const

export type RoleKey = (typeof ROLE_KEYS)[number]

export const PERMISSIONS = [
  "users.manage",
  "stores.manage",
  "catalog.manage",
  "orders.manage",
  "settings.manage",
  "api_keys.secrets",
  "analytics.read",
] as const

export type PermissionKey = (typeof PERMISSIONS)[number]

export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  super_admin: [...PERMISSIONS],
  store_owner: [
    "catalog.manage",
    "orders.manage",
    "settings.manage",
    "analytics.read",
  ],
  manager: ["catalog.manage", "orders.manage", "analytics.read"],
  staff: ["orders.manage"],
}

const roleSet = new Set<string>(ROLE_KEYS)
const permissionSet = new Set<string>(PERMISSIONS)

export const isRoleKey = (value: unknown): value is RoleKey =>
  typeof value === "string" && roleSet.has(value)

export const isPermissionKey = (value: unknown): value is PermissionKey =>
  typeof value === "string" && permissionSet.has(value)

export const normalizeRole = (value: unknown): RoleKey | null => {
  if (!isRoleKey(value)) {
    return null
  }

  return value
}

export const permissionsForRole = (role: RoleKey): PermissionKey[] =>
  ROLE_PERMISSIONS[role]

export const hasPermission = (role: RoleKey, permission: PermissionKey) =>
  ROLE_PERMISSIONS[role].includes(permission)

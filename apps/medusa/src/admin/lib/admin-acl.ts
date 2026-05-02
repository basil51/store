import {
  type PermissionKey,
  type RoleKey,
  isPermissionKey,
  isRoleKey,
} from "../../shared/access-control"

export type CurrentAdminAclContext = {
  role: RoleKey | null
  role_source: string
  user_id: string | null
  requested_store_id: string | null
  allowed_store_ids: string[]
  store_scope_allowed: boolean
  allowed_permissions: PermissionKey[]
}

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null

export const parseCurrentAdminAclContext = (
  payload: unknown
): CurrentAdminAclContext | null => {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const row = payload as Record<string, unknown>
  const role = isRoleKey(row.role) ? row.role : null

  return {
    role,
    role_source: readString(row.role_source) ?? "none",
    user_id: readString(row.user_id),
    requested_store_id: readString(row.requested_store_id),
    allowed_store_ids: Array.isArray(row.allowed_store_ids)
      ? row.allowed_store_ids.filter(
          (storeId): storeId is string => typeof storeId === "string"
        )
      : [],
    store_scope_allowed:
      typeof row.store_scope_allowed === "boolean" ? row.store_scope_allowed : false,
    allowed_permissions: Array.isArray(row.allowed_permissions)
      ? row.allowed_permissions.filter(isPermissionKey)
      : [],
  }
}

export const hasAllPermissions = (
  context: CurrentAdminAclContext | null,
  requiredPermissions: readonly PermissionKey[]
) => {
  if (!requiredPermissions.length) {
    return true
  }

  if (!context) {
    return false
  }

  const allowedPermissions = new Set(context.allowed_permissions)
  return requiredPermissions.every((permission) => allowedPermissions.has(permission))
}

export const missingPermissions = (
  context: CurrentAdminAclContext | null,
  requiredPermissions: readonly PermissionKey[]
) => requiredPermissions.filter((permission) => !hasAllPermissions(context, [permission]))

export const loadCurrentAdminAclContext = async () => {
  const response = await fetch("/admin/acl/context", {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Failed to load ACL context (${response.status})`)
  }

  return parseCurrentAdminAclContext(await response.json())
}
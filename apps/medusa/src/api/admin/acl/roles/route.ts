import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  PERMISSIONS,
  ROLE_KEYS,
  hasPermission,
  isPermissionKey,
  permissionsForRole,
} from "../../../../shared/access-control"
import {
  isStoreScopeAllowed,
  resolveAccessControlContext,
} from "../../../../shared/access-control-context"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { role, source, userId, allowedStoreIds, requestedStoreId } =
    await resolveAccessControlContext(req)

  return res.status(200).json({
    phase: "8",
    role: role ?? null,
    role_source: source,
    user_id: userId,
    requested_store_id: requestedStoreId,
    allowed_store_ids: allowedStoreIds,
    store_scope_allowed: role
      ? isStoreScopeAllowed(role, allowedStoreIds, requestedStoreId)
      : false,
    roles: ROLE_KEYS.map((key) => ({
      key,
      permissions: permissionsForRole(key),
    })),
    permissions: PERMISSIONS,
  })
}

type CheckBody = {
  role?: unknown
  permissions?: unknown
  store_id?: unknown
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as CheckBody
  const context = await resolveAccessControlContext(req)
  const roleOverride =
    typeof body.role === "string"
      ? ROLE_KEYS.find((entry) => entry === body.role) ?? null
      : null
  const role = roleOverride ?? context.role
  const requestedStoreId =
    typeof body.store_id === "string" ? body.store_id : context.requestedStoreId

  if (!role) {
    return res.status(400).json({
      message:
        "Role is required. Pass body.role or provide x-store-role/user metadata.acl_role.",
    })
  }

  const requestedPermissions = Array.isArray(body.permissions)
    ? body.permissions.filter(isPermissionKey)
    : []
  const storeScopeAllowed = isStoreScopeAllowed(
    role,
    context.allowedStoreIds,
    requestedStoreId
  )

  return res.status(200).json({
    role,
    role_source: roleOverride ? "body" : context.source,
    user_id: context.userId,
    requested_store_id: requestedStoreId,
    allowed_store_ids: context.allowedStoreIds,
    store_scope_allowed: storeScopeAllowed,
    allowed: requestedPermissions.filter((permission) =>
      hasPermission(role, permission)
    ),
    denied: requestedPermissions.filter((permission) => !hasPermission(role, permission)),
  })
}

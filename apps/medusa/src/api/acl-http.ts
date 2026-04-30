import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { PermissionKey, hasPermission } from "../shared/access-control"
import {
  isStoreScopeAllowed,
  resolveAccessControlContext,
} from "../shared/access-control-context"

type AccessControlPayload = {
  role: string
  source: string
  user_id: string | null
  store_ids: string[]
  requested_store_id: string | null
}

export const attachAccessControl = (
  req: MedusaRequest,
  payload: AccessControlPayload
) => {
  ;(req as MedusaRequest & { access_control?: AccessControlPayload }).access_control =
    payload
}

export const runAclCheck = async (
  req: MedusaRequest,
  res: MedusaResponse,
  permission: PermissionKey
): Promise<boolean> => {
  const { role, source, userId, allowedStoreIds, requestedStoreId } =
    await resolveAccessControlContext(req)

  if (!role) {
    res.status(401).json({
      message:
        "Missing role context. Set x-store-role or provide user metadata.acl_role.",
    })
    return false
  }

  if (!hasPermission(role, permission)) {
    res.status(403).json({
      message: `Role "${role}" is missing "${permission}" permission.`,
    })
    return false
  }

  if (!isStoreScopeAllowed(role, allowedStoreIds, requestedStoreId)) {
    res.status(403).json({
      message: `Role "${role}" is not assigned to store "${requestedStoreId}".`,
    })
    return false
  }

  attachAccessControl(req, {
    role,
    source,
    user_id: userId,
    store_ids: allowedStoreIds,
    requested_store_id: requestedStoreId,
  })

  return true
}

export const requirePermission =
  (permission: PermissionKey) =>
  async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    if (await runAclCheck(req, res, permission)) {
      next()
    }
  }

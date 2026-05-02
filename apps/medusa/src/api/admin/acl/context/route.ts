import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { permissionsForRole } from "../../../../shared/access-control"
import {
  isStoreScopeAllowed,
  resolveAccessControlContext,
} from "../../../../shared/access-control-context"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { role, source, userId, allowedStoreIds, requestedStoreId } =
    await resolveAccessControlContext(req)

  return res.status(200).json({
    role: role ?? null,
    role_source: source,
    user_id: userId,
    requested_store_id: requestedStoreId,
    allowed_store_ids: allowedStoreIds,
    store_scope_allowed: role
      ? isStoreScopeAllowed(role, allowedStoreIds, requestedStoreId)
      : false,
    allowed_permissions: role ? permissionsForRole(role) : [],
  })
}
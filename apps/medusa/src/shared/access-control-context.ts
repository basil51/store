import { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { RoleKey, normalizeRole } from "./access-control"

type QueryGraphLike = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data?: Array<Record<string, unknown>> }>
}

type AccessControlContext = {
  role: RoleKey | null
  source: "request" | "user_metadata" | "none"
  userId: string | null
  allowedStoreIds: string[]
  requestedStoreId: string | null
}

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

const readStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const unique = new Set<string>()

  for (const entry of value) {
    const parsed = readString(entry)

    if (parsed) {
      unique.add(parsed)
    }
  }

  return [...unique]
}

const readRequestedRole = (req: MedusaRequest) =>
  normalizeRole(req.headers["x-store-role"] ?? req.query?.role)

const readRequestedStoreId = (req: MedusaRequest) =>
  readString(req.headers["x-store-id"] ?? req.query?.store_id)

const readActorUserId = (req: MedusaRequest): string | null => {
  const authContext = (req as MedusaRequest & { auth_context?: Record<string, unknown> })
    .auth_context

  return (
    readString(authContext?.user_id) ??
    readString(authContext?.actor_id) ??
    readString(authContext?.auth_identity_id) ??
    null
  )
}

const readRoleFromMetadata = (metadata: Record<string, unknown>) =>
  normalizeRole(metadata.acl_role ?? metadata.role)

const readStoreScopeFromMetadata = (metadata: Record<string, unknown>) => {
  const listFromArray = readStringArray(metadata.acl_store_ids ?? metadata.store_ids)
  const singleStoreId = readString(metadata.acl_store_id ?? metadata.store_id)

  return singleStoreId && !listFromArray.includes(singleStoreId)
    ? [...listFromArray, singleStoreId]
    : listFromArray
}

export const resolveAccessControlContext = async (
  req: MedusaRequest
): Promise<AccessControlContext> => {
  const requestedStoreId = readRequestedStoreId(req)
  const requestRole = readRequestedRole(req)

  if (requestRole) {
    return {
      role: requestRole,
      source: "request",
      userId: readActorUserId(req),
      allowedStoreIds: [],
      requestedStoreId,
    }
  }

  const userId = readActorUserId(req)

  if (!userId) {
    return {
      role: null,
      source: "none",
      userId: null,
      allowedStoreIds: [],
      requestedStoreId,
    }
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike
  const { data } = await query.graph({
    entity: "user",
    fields: ["id", "metadata"],
    filters: { id: userId },
  })

  const user = data?.[0]
  const metadata = ((user?.metadata as Record<string, unknown> | undefined) ?? {})
  const metadataRole = readRoleFromMetadata(metadata)
  const allowedStoreIds = readStoreScopeFromMetadata(metadata)

  return {
    role: metadataRole,
    source: metadataRole ? "user_metadata" : "none",
    userId,
    allowedStoreIds,
    requestedStoreId,
  }
}

export const isStoreScopeAllowed = (
  role: RoleKey,
  allowedStoreIds: string[],
  requestedStoreId: string | null
) => {
  if (!requestedStoreId || role === "super_admin") {
    return true
  }

  if (!allowedStoreIds.length) {
    return false
  }

  return allowedStoreIds.includes(requestedStoreId)
}

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  ROLE_KEYS,
  RoleKey,
  isRoleKey,
  permissionsForRole,
} from "../../../../shared/access-control"

type QueryGraphLike = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data?: Array<Record<string, unknown>> }>
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

const readRoleFromMetadata = (metadata: Record<string, unknown>): RoleKey | null =>
  isRoleKey(metadata.acl_role) ? metadata.acl_role : null

const readStoreIdsFromMetadata = (metadata: Record<string, unknown>) => {
  const listFromArray = readStringArray(metadata.acl_store_ids)
  const singleStoreId = readString(metadata.acl_store_id)

  return singleStoreId && !listFromArray.includes(singleStoreId)
    ? [...listFromArray, singleStoreId]
    : listFromArray
}

const asMetadata = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike

  const [usersResponse, storesResponse] = await Promise.all([
    query.graph({
      entity: "user",
      fields: ["id", "email", "first_name", "last_name", "metadata"],
    }),
    query.graph({
      entity: "store",
      fields: ["id", "name"],
    }),
  ])

  const users = (usersResponse.data ?? [])
    .map((entry) => {
      const metadata = asMetadata(entry.metadata)
      const role = readRoleFromMetadata(metadata)
      const storeIds = readStoreIdsFromMetadata(metadata)
      const displayName =
        [readString(entry.first_name), readString(entry.last_name)]
          .filter(Boolean)
          .join(" ")
          .trim() || null

      return {
        id: readString(entry.id),
        email: readString(entry.email),
        display_name: displayName,
        acl_role: role,
        acl_store_ids: storeIds,
      }
    })
    .filter(
      (entry): entry is {
        id: string
        email: string
        display_name: string | null
        acl_role: RoleKey | null
        acl_store_ids: string[]
      } => Boolean(entry.id && entry.email)
    )
    .sort((a, b) => a.email.localeCompare(b.email))

  const stores = (storesResponse.data ?? [])
    .map((entry) => ({
      id: readString(entry.id),
      name: readString(entry.name) ?? "Unnamed store",
    }))
    .filter((entry): entry is { id: string; name: string } => Boolean(entry.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  return res.status(200).json({
    roles: ROLE_KEYS.map((key) => ({
      key,
      permissions: permissionsForRole(key),
    })),
    users,
    stores,
  })
}

type UpdateBody = {
  user_id?: unknown
  acl_role?: unknown
  acl_store_ids?: unknown
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as UpdateBody
  const userId = readString(body.user_id)

  if (!userId) {
    return res.status(400).json({ message: "body.user_id is required." })
  }

  const roleInput = body.acl_role
  const role =
    roleInput == null || roleInput === ""
      ? null
      : isRoleKey(roleInput)
        ? roleInput
        : null

  if (roleInput != null && roleInput !== "" && !role) {
    return res.status(400).json({
      message: `Invalid acl_role. Expected one of: ${ROLE_KEYS.join(", ")}.`,
    })
  }

  const storeIds = readStringArray(body.acl_store_ids)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as {
    raw: (sql: string, bindings: unknown[]) => Promise<unknown>
  }

  const { data } = await query.graph({
    entity: "user",
    fields: ["id", "email", "first_name", "last_name", "metadata"],
    filters: { id: userId },
  })

  const existing = data?.[0]

  if (!existing) {
    return res.status(404).json({ message: `User "${userId}" was not found.` })
  }

  const existingMetadata = asMetadata(existing.metadata)
  const nextMetadata: Record<string, unknown> = { ...existingMetadata }

  if (role) {
    nextMetadata.acl_role = role
  } else {
    delete nextMetadata.acl_role
  }

  if (storeIds.length) {
    nextMetadata.acl_store_ids = storeIds
  } else {
    delete nextMetadata.acl_store_ids
  }

  await db.raw(
    `update "user" set metadata = ?::jsonb, updated_at = now() where id = ?`,
    [JSON.stringify(nextMetadata), userId]
  )

  const displayName =
    [readString(existing.first_name), readString(existing.last_name)]
      .filter(Boolean)
      .join(" ")
      .trim() || null

  return res.status(200).json({
    user: {
      id: readString(existing.id),
      email: readString(existing.email),
      display_name: displayName,
      acl_role: role,
      acl_store_ids: storeIds,
    },
  })
}

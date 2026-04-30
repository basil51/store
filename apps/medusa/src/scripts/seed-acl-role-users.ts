import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ROLE_KEYS, RoleKey } from "../shared/access-control"

type QueryGraphLike = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data?: Array<Record<string, unknown>> }>
}

type AdminUser = {
  id: string
  email: string | null
  metadata: Record<string, unknown>
}

type ArgsMap = Partial<Record<RoleKey, string>>

const normalizeArgs = (args: string[]) => {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)
  const candidateArgs = args.length ? args : argvArgs
  return candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs
}

const parseArgs = (args: string[]): ArgsMap => {
  const parsed: ArgsMap = {}

  for (const item of args) {
    const [rawRole, rawEmail] = item.split("=")
    const role = rawRole?.replace(/^-+/, "").trim() as RoleKey
    const email = rawEmail?.trim()

    if (!ROLE_KEYS.includes(role) || !email) {
      continue
    }

    parsed[role] = email.toLowerCase()
  }

  return parsed
}

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

const toAdminUser = (record: Record<string, unknown>): AdminUser => ({
  id: String(record.id),
  email: readString(record.email)?.toLowerCase() ?? null,
  metadata: ((record.metadata as Record<string, unknown> | null) ?? {}) as Record<
    string,
    unknown
  >,
})

const roleLabel = (role: RoleKey) => role.replace("_", " ")

export default async function seedAclRoleUsers({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    info: (message: string) => void
    warn: (message: string) => void
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike
  const db = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as {
    raw: (sql: string, params?: unknown[]) => Promise<unknown>
  }

  const parsedArgs = parseArgs(normalizeArgs(args))
  const { data } = await query.graph({
    entity: "user",
    fields: ["id", "email", "metadata"],
  })

  const users = ((data ?? []) as Array<Record<string, unknown>>).map(toAdminUser)

  if (!users.length) {
    logger.warn("No admin users found. Create admin users first, then rerun this script.")
    return
  }

  const emailToUser = new Map(
    users.filter((user) => user.email).map((user) => [user.email as string, user])
  )
  const availableUsers = [...users]
  const assignments = new Map<RoleKey, AdminUser>()

  for (const role of ROLE_KEYS) {
    const requestedEmail = parsedArgs[role]

    if (requestedEmail) {
      const selected = emailToUser.get(requestedEmail)

      if (!selected) {
        logger.warn(
          `Requested ${role} user '${requestedEmail}' not found. Falling back to automatic assignment.`
        )
      } else {
        assignments.set(role, selected)
      }
    }
  }

  for (const role of ROLE_KEYS) {
    if (assignments.has(role)) {
      continue
    }

    const fallback = availableUsers.find(
      (candidate) => ![...assignments.values()].some((picked) => picked.id === candidate.id)
    )

    if (!fallback) {
      logger.warn(`Could not assign role '${role}': not enough admin users.`)
      continue
    }

    assignments.set(role, fallback)
  }

  const userIds = [...new Set([...assignments.values()].map((user) => user.id))]
  const storeScopeByUserId = new Map<string, string[]>()

  if (userIds.length) {
    const { data: storesData } = await query.graph({
      entity: "store",
      fields: ["id", "metadata"],
    })

    const availableStoreIds = ((storesData ?? []) as Array<Record<string, unknown>>)
      .map((store) => readString(store.id))
      .filter((id): id is string => Boolean(id))

    for (const userId of userIds) {
      storeScopeByUserId.set(userId, availableStoreIds)
    }
  }

  for (const [role, user] of assignments.entries()) {
    const aclStoreIds = storeScopeByUserId.get(user.id) ?? []
    const nextMetadata: Record<string, unknown> = {
      ...user.metadata,
      acl_role: role,
      acl_store_ids: aclStoreIds,
    }

    await db.raw(`UPDATE "user" SET metadata = ?::jsonb WHERE id = ?`, [
      JSON.stringify(nextMetadata),
      user.id,
    ])

    logger.info(
      `Assigned ${roleLabel(role)} to ${user.email ?? user.id} with ${aclStoreIds.length} store scope entries.`
    )
  }

  console.log("")
  console.log("ACL role seed summary")
  for (const role of ROLE_KEYS) {
    const user = assignments.get(role)
    console.log(`- ${role}: ${user?.email ?? user?.id ?? "<unassigned>"}`)
  }
  console.log("")
  console.log(
    "Usage with explicit users: pnpm --filter medusa seed:acl-roles -- --super_admin=admin@example.com --store_owner=owner@example.com --manager=manager@example.com --staff=staff@example.com"
  )
}

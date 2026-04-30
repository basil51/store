import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ApiKeyType, ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  PermissionKey,
  RoleKey,
  hasPermission,
  isRoleKey,
} from "../../shared/access-control"
import { runAclCheck } from "../acl-http"

type QueryGraphLike = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data?: Array<Record<string, unknown>> }>
}

const pathnameOnly = (req: MedusaRequest) => {
  const raw = req.url ?? ""
  const path = raw.split("?")[0] ?? ""
  return path.startsWith("/") ? path : `/${path}`
}

type ParsedApiKeyRoute =
  | { kind: "collection" }
  | { kind: "sales_channels"; id: string }
  | { kind: "by_id"; id: string; sub: "revoke" | "resource" }

const parseApiKeyRoute = (pathname: string): ParsedApiKeyRoute | null => {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean)

  if (segments[0] !== "admin" || segments[1] !== "api-keys") {
    return null
  }

  if (segments.length === 2) {
    return { kind: "collection" }
  }

  const id = segments[2]
  if (!id) {
    return null
  }

  if (segments.length === 3) {
    return { kind: "by_id", id, sub: "resource" }
  }

  if (segments.length === 4 && segments[3] === "revoke") {
    return { kind: "by_id", id, sub: "revoke" }
  }

  if (segments.length === 4 && segments[3] === "sales-channels") {
    return { kind: "sales_channels", id }
  }

  return { kind: "by_id", id, sub: "resource" }
}

const readBodyType = (req: MedusaRequest): string | null => {
  const body = (req as MedusaRequest & { body?: unknown }).body

  if (!body || typeof body !== "object" || body === null) {
    return null
  }

  const type = (body as Record<string, unknown>).type
  return typeof type === "string" ? type : null
}

const queryIndicatesSecretOnly = (req: MedusaRequest): boolean => {
  const q = req.query as Record<string, unknown>
  const raw = q.type ?? q["type[]"]

  if (raw === "secret" || raw === ApiKeyType.SECRET) {
    return true
  }

  if (Array.isArray(raw)) {
    const types = raw.filter((v): v is string => typeof v === "string")
    return types.includes("secret") && !types.includes("publishable")
  }

  return false
}

const fetchApiKeyType = async (
  req: MedusaRequest,
  id: string
): Promise<string | null> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as QueryGraphLike
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id", "type"],
    filters: { id },
  })

  const row = data?.[0]
  const type = row?.type
  return typeof type === "string" ? type : null
}

const resolveRequiredPermission = async (
  req: MedusaRequest
): Promise<PermissionKey> => {
  const path = pathnameOnly(req)
  const parsed = parseApiKeyRoute(path)
  const method = (req.method ?? "GET").toUpperCase()

  if (!parsed) {
    return "settings.manage"
  }

  if (parsed.kind === "sales_channels") {
    return "settings.manage"
  }

  if (parsed.kind === "collection") {
    if (method === "GET" && queryIndicatesSecretOnly(req)) {
      return "api_keys.secrets"
    }

    if (method === "POST" && readBodyType(req) === ApiKeyType.SECRET) {
      return "api_keys.secrets"
    }

    return "settings.manage"
  }

  const keyType = await fetchApiKeyType(req, parsed.id)
  if (keyType === ApiKeyType.SECRET || keyType === "secret") {
    return "api_keys.secrets"
  }

  return "settings.manage"
}

const isSecretApiKeyEntry = (entry: unknown) => {
  if (!entry || typeof entry !== "object") {
    return false
  }

  const t = (entry as Record<string, unknown>).type
  return t === ApiKeyType.SECRET || t === "secret"
}

const stripSecretApiKeysFromListPayload = (body: unknown): unknown => {
  if (!body || typeof body !== "object" || !("api_keys" in body)) {
    return body
  }

  const record = body as { api_keys: unknown[]; count?: number }
  if (!Array.isArray(record.api_keys)) {
    return body
  }

  const filtered = record.api_keys.filter((entry) => !isSecretApiKeyEntry(entry))
  record.api_keys = filtered

  if (typeof record.count === "number") {
    record.count = filtered.length
  }

  return body
}

const enforcePublishableOnlyListQuery = (req: MedusaRequest) => {
  const q = req.query as Record<string, unknown>
  delete q["type[]"]
  q.type = ApiKeyType.PUBLISHABLE
}

const installSecretFreeListResponseGuard = (res: MedusaResponse) => {
  const resLike = res as MedusaResponse & { json: (body: unknown) => MedusaResponse }
  const originalJson = resLike.json.bind(resLike) as (body: unknown) => MedusaResponse

  resLike.json = (body: unknown) => {
    return originalJson(stripSecretApiKeysFromListPayload(body))
  }
}

export const requireApiKeyAcl = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const path = pathnameOnly(req)
  const parsed = parseApiKeyRoute(path)
  const method = (req.method ?? "GET").toUpperCase()
  const permission = await resolveRequiredPermission(req)

  if (!(await runAclCheck(req, res, permission))) {
    return
  }

  const accessControl = (
    req as MedusaRequest & {
      access_control?: { role: string }
    }
  ).access_control

  const roleValue = accessControl?.role
  const role: RoleKey | null = isRoleKey(roleValue) ? roleValue : null

  if (
    method === "GET" &&
    parsed?.kind === "collection" &&
    role &&
    !hasPermission(role, "api_keys.secrets")
  ) {
    enforcePublishableOnlyListQuery(req)
    installSecretFreeListResponseGuard(res)
  }

  next()
}
